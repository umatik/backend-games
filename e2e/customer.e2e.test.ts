import { afterAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "@/app.js";
import { redisClient } from "@/dependency-injection.js";
import { loginAsUser } from "@/__test-helpers__/auth.js";
import { uniqueEmail } from "./helpers/mailpit.js";

/**
 * E2E: nowy klient zakłada konto, kupuje płytę, widzi zamówienie u siebie i je anuluje.
 * Jeden test na ścieżkę, bo baza jest czyszczona po każdym teście.
 */

afterAll(async () => {
  await redisClient.close();
});

const PASSWORD = "selassie-i-2026";

const contact = {
  firstName: "Ras",
  lastName: "Tester",
  phone: "+48 600 000 000",
  address: "Dubowa 7",
  city: "Kraków",
  postalCode: "30-001",
  country: "Poland",
};

type Variant = { id: number; quantity: number; priceEur: number };

const variantOf = async (productId: number, variantId: number): Promise<Variant> => {
  const response = await request(app).get(`/products/${productId}`);
  expect(response.status).toBe(200);
  return response.body.product.variants.find((variant: Variant) => variant.id === variantId);
};

describe("E2E: customer buys and cancels", () => {
  it("should register, order, see the order and cancel it", async () => {
    const email = uniqueEmail("e2e-customer");

    // 1. Rejestracja; drugi raz ten sam adres (inną wielkością liter) daje 409.
    const registered = await request(app)
      .post("/users/register")
      .send({ email, password: PASSWORD, ...contact });
    expect(registered.status).toBe(201);

    const again = await request(app)
      .post("/users/register")
      .send({ email: email.toUpperCase(), password: PASSWORD, ...contact });
    expect(again.status).toBe(409);

    // 2. Logowanie: złe hasło odrzucone, dobre daje token.
    const wrong = await request(app).post("/login").send({ email, password: "wrong-password" });
    expect(wrong.status).toBe(401);

    const login = await request(app).post("/login").send({ email, password: PASSWORD });
    expect(login.status).toBe(200);
    const token: string = login.body.token;
    const auth = { Authorization: `Bearer ${token}` };

    // 3. Przeglądanie sklepu: pierwsza dostępna płyta winylowa.
    const list = await request(app).get("/products").query({ type: "vinyl", available: "true" });
    expect(list.status).toBe(200);
    expect(list.body.products.length).toBeGreaterThan(0);

    const productId: number = list.body.products[0].id;
    const product = await request(app).get(`/products/${productId}`);
    const variant: Variant = product.body.product.variants.find(
      (candidate: Variant) => candidate.quantity > 0,
    );
    expect(variant).toBeDefined();
    const stock = variant.quantity;

    // 4. Zamówienie ponad stan i puste zamówienie są odrzucane, nic nie schodzi ze stanu.
    const tooMany = await request(app)
      .post("/orders")
      .set(auth)
      .send({ items: [{ productVariantId: variant.id, quantity: stock + 1 }] });
    expect(tooMany.status).toBe(409);

    const empty = await request(app).post("/orders").set(auth).send({ items: [] });
    expect(empty.status).toBe(400);

    expect((await variantOf(productId, variant.id)).quantity).toBe(stock);

    // 5. Poprawne zamówienie zdejmuje sztukę ze stanu.
    const order = await request(app)
      .post("/orders")
      .set(auth)
      .send({ items: [{ productVariantId: variant.id, quantity: 1 }] });
    expect(order.status).toBe(201);
    const orderId: number = order.body.order.id;

    expect((await variantOf(productId, variant.id)).quantity).toBe(stock - 1);

    // 6. Klient widzi zamówienie z ceną z chwili zakupu; inny klient go nie widzi.
    const mine = await request(app).get("/orders/my").set(auth);
    expect(mine.status).toBe(200);
    expect(mine.body).toEqual([
      expect.objectContaining({
        id: orderId,
        items: [
          expect.objectContaining({
            productVariantId: variant.id,
            quantity: 1,
            priceEur: variant.priceEur,
          }),
        ],
      }),
    ]);

    expect((await request(app).get(`/orders/${orderId}`).set(auth)).status).toBe(200);

    const otherCustomer = await loginAsUser();
    const foreign = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${otherCustomer}`);
    expect(foreign.status).toBe(404);

    // 7. Anulowanie zwraca sztukę na stan i usuwa zamówienie z listy klienta.
    const cancelled = await request(app).delete(`/orders/${orderId}`).set(auth);
    expect(cancelled.status).toBe(204);

    expect((await variantOf(productId, variant.id)).quantity).toBe(stock);
    expect((await request(app).get("/orders/my").set(auth)).body).toEqual([]);
  });
});
