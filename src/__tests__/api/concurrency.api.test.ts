import { afterAll, afterEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import app from "@/app.js";
import { redisClient } from "@/dependency-injection.js";
import { pool } from "@/database/db.js";
import { loginAsAdmin, loginAsUser } from "@/__test-helpers__/auth.js";
import { PostgresProductRepository } from "@/repositories/products/product/product-postgres.repository.js";
import { PostgresProductVariantRepository } from "@/repositories/products/product-variant/product-variant-postgres.repository.js";

/**
 * Wyścigi między usuwaniem szkicu, publikacją i zamówieniem (audyt 2026-11-08, P1).
 * Usuwanie zatrzymujemy barierą w połowie transakcji, a w tym czasie inne żądania próbują opublikować produkt
 * i go kupić. Niezależnie od kolejności żadne zatwierdzone zamówienie nie może stracić pozycji.
 */

afterAll(async () => {
  await redisClient.close();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const vinylVariant = { format: "LP", mediaCondition: "NM", sleeveCondition: "NM" };

/** Zatrzymuje metodę repozytorium, aż test ją zwolni. */
const pauseMethod = <T extends object>(prototype: T, method: keyof T & string) => {
  let reached!: () => void;
  let release!: () => void;
  const reachedPromise = new Promise<void>((resolve) => (reached = resolve));
  const gate = new Promise<void>((resolve) => (release = resolve));
  const original = prototype[method] as (...args: unknown[]) => Promise<unknown>;

  jest
    .spyOn(prototype, method as never)
    .mockImplementation((async function (this: unknown, ...args: unknown[]) {
      reached();
      await gate;
      return original.apply(this, args);
    }) as never);

  return { reached: reachedPromise, release };
};

/** Czeka na odpowiedź, ale najwyżej `ms` (zablokowane żądanie zostaje dokończone później). */
const settleWithin = (promise: Promise<unknown>, ms = 300) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);

const ordersWithoutItems = async () =>
  Number(
    (
      await pool.query(
        `SELECT COUNT(*) FROM orders o
         WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)`,
      )
    ).rows[0].count,
  );

const createDraft = async (admin: string, variants: number) => {
  const response = await request(app)
    .post("/products")
    .set("Authorization", `Bearer ${admin}`)
    .send({
      type: "vinyl",
      title: "Race Condition Dub",
      attributes: { artists: ["Race Sound"] },
      variants: Array.from({ length: variants }, () => ({
        priceEur: 1000,
        quantity: 5,
        attributes: vinylVariant,
      })),
    });

  expect(response.status).toBe(201);

  return {
    productId: response.body.product.id as number,
    variantIds: response.body.product.variants.map((variant: { id: number }) => variant.id),
  };
};

describe("Concurrency – deleting a draft while it is published and ordered", () => {
  it("should never delete items of a committed order when deleting a product", async () => {
    const admin = await loginAsAdmin();
    const customer = await loginAsUser();
    const { productId, variantIds } = await createDraft(admin, 1);
    const pause = pauseMethod(PostgresProductRepository.prototype, "findMediaUrls");

    const deleting = request(app)
      .delete(`/products/${productId}`)
      .set("Authorization", `Bearer ${admin}`)
      .then((response) => response);
    await pause.reached;

    const publishing = request(app)
      .post(`/products/${productId}/publish`)
      .set("Authorization", `Bearer ${admin}`)
      .then((response) => response);
    await settleWithin(publishing);

    const ordering = request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customer}`)
      .send({ items: [{ productVariantId: variantIds[0], quantity: 1 }] })
      .then((response) => response);
    await settleWithin(ordering);

    pause.release();
    const [deleted, published, ordered] = await Promise.all([deleting, publishing, ordering]);

    expect(deleted.status).toBe(204);
    expect(await ordersWithoutItems()).toBe(0);

    // Usunięcie wygrało wyścig: produktu nie ma, więc nie da się go ani opublikować, ani kupić.
    expect(published.status).toBe(404);
    expect(ordered.status).toBe(404);
  });

  it("should never delete items of a committed order when deleting a variant", async () => {
    const admin = await loginAsAdmin();
    const customer = await loginAsUser();
    const { productId, variantIds } = await createDraft(admin, 2);
    const pause = pauseMethod(PostgresProductVariantRepository.prototype, "findMediaUrls");

    const deleting = request(app)
      .delete(`/products/${productId}/variants/${variantIds[0]}`)
      .set("Authorization", `Bearer ${admin}`)
      .then((response) => response);
    await pause.reached;

    const publishing = request(app)
      .post(`/products/${productId}/publish`)
      .set("Authorization", `Bearer ${admin}`)
      .then((response) => response);
    await settleWithin(publishing);

    const ordering = request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customer}`)
      .send({ items: [{ productVariantId: variantIds[0], quantity: 1 }] })
      .then((response) => response);
    await settleWithin(ordering);

    pause.release();
    const [deleted, published, ordered] = await Promise.all([deleting, publishing, ordering]);

    expect(deleted.status).toBe(200);
    expect(await ordersWithoutItems()).toBe(0);

    // Drugi wariant zostaje, więc publikacja przechodzi po usunięciu, ale usuniętego wariantu nie da się kupić.
    expect(published.status).toBe(200);
    expect(ordered.status).toBe(404);
  });

  it("should refuse to permanently delete a variant that is referenced by an order", async () => {
    const admin = await loginAsAdmin();
    const { productId, variantIds } = await createDraft(admin, 1);

    // Zamówienie wpisane z pominięciem API, jak po wyścigu: baza sama nie pozwala go osierocić.
    const order = await pool.query(
      "INSERT INTO orders (user_id, status) VALUES (1, 'pending') RETURNING id",
    );
    await pool.query(
      "INSERT INTO order_items (order_id, product_variant_id, quantity, price_eur) VALUES ($1, $2, 1, 1000)",
      [order.rows[0].id, variantIds[0]],
    );

    await expect(pool.query("DELETE FROM products WHERE id = $1", [productId])).rejects.toThrow(
      /foreign key/,
    );
  });
});

describe("Concurrency – the last variants of a published product", () => {
  it("should keep one variant when the last two are deleted at the same time", async () => {
    const admin = await loginAsAdmin();
    const { productId, variantIds } = await createDraft(admin, 2);
    await request(app)
      .post(`/products/${productId}/publish`)
      .set("Authorization", `Bearer ${admin}`);

    // Pierwsze usunięcie zatrzymane pod blokadą produktu; drugie musi poczekać i zobaczyć jego wynik.
    const pause = pauseMethod(PostgresProductVariantRepository.prototype, "delete");
    const first = request(app)
      .delete(`/products/${productId}/variants/${variantIds[0]}`)
      .set("Authorization", `Bearer ${admin}`)
      .then((response) => response);
    await pause.reached;
    jest.restoreAllMocks();

    const second = request(app)
      .delete(`/products/${productId}/variants/${variantIds[1]}`)
      .set("Authorization", `Bearer ${admin}`)
      .then((response) => response);
    await settleWithin(second);

    pause.release();
    const statuses = (await Promise.all([first, second])).map((response) => response.status);

    expect(statuses).toEqual([200, 409]);

    const page = await request(app).get(`/products/${productId}`);
    expect(page.body.product.variants.map((variant: { id: number }) => variant.id)).toEqual([
      variantIds[1],
    ]);
  });
});

describe("Concurrency – shop listing cache", () => {
  it("should not bring back a listing read before the product was unpublished", async () => {
    const admin = await loginAsAdmin();
    const { productId } = await createDraft(admin, 1);
    await request(app)
      .post(`/products/${productId}/publish`)
      .set("Authorization", `Bearer ${admin}`);
    const shopIds = async () =>
      (await request(app).get("/products").query({ artist: "Race Sound" })).body.products.map(
        (product: { id: number }) => product.id,
      );

    // Odczyt listy zatrzymany po pobraniu produktów, a przed zapisem do cache.
    const pause = pauseMethod(PostgresProductRepository.prototype, "countAll");
    const lateRead = request(app)
      .get("/products")
      .query({ artist: "Race Sound" })
      .then((response) => response);
    await pause.reached;
    jest.restoreAllMocks();

    const unpublished = await request(app)
      .post(`/products/${productId}/unpublish`)
      .set("Authorization", `Bearer ${admin}`);
    expect(unpublished.status).toBe(200);

    pause.release();
    expect((await lateRead).body.products.map((product: { id: number }) => product.id)).toEqual([
      productId,
    ]);

    // Spóźniony zapis nie może wrócić do sklepu.
    expect(await shopIds()).toEqual([]);
  });
});
