import path from "node:path";
import { afterAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "@/app.js";
import { redisClient } from "@/dependency-injection.js";
import { loginAsAdmin, loginAsUser } from "@/__test-helpers__/auth.js";

/**
 * E2E: właściciel sklepu dodaje płytę ręcznie (bez Claude i Discogs), publikuje ją i sprzedaje ostatnią sztukę.
 * Całość idzie przez HTTP do prawdziwej bazy i Redisa, w jednym teście, bo baza jest czyszczona po każdym teście.
 */

afterAll(async () => {
  await redisClient.close();
});

const photo = path.resolve("src/__tests__/unit/services/fixtures/uploads/test-photo.jpg");

const ARTIST = "E2E Dub Collective";
const TITLE = "Lion Steppers E2E";

const variantAttributes = {
  format: '7"',
  speed: 45,
  year: 1982,
  label: "E2E Sound",
  catalogNumber: "E2E-045",
  mediaCondition: "VG+",
  sleeveCondition: "generic",
};

const ids = (response: request.Response): number[] =>
  response.body.products.map((product: { id: number }) => product.id);

describe("E2E: shop owner adds and sells a record", () => {
  it("should take a record from draft to sold out", async () => {
    const admin = await loginAsAdmin();
    const customer = await loginAsUser();
    const asAdmin = (req: request.Test) => req.set("Authorization", `Bearer ${admin}`);

    // 1. Panel pobiera typy produktów do formularza.
    const types = await request(app).get("/products/types");
    expect(types.status).toBe(200);
    expect(types.body.productTypes.map((type: { key: string }) => type.key)).toContain("vinyl");

    // 2. Sprawdzenie duplikatów: takiej płyty jeszcze nie ma.
    const before = await asAdmin(
      request(app).get("/products/lookup/existing").query({ catalogNumber: "E2E-045" }),
    );
    expect(before.status).toBe(200);
    expect(before.body.existingProducts).toEqual([]);

    // 3. Szkic produktu, niewidoczny publicznie i niemożliwy do opublikowania bez wariantu.
    const created = await asAdmin(request(app).post("/products")).send({
      type: "vinyl",
      title: TITLE,
      attributes: { artists: [ARTIST] },
    });
    expect(created.status).toBe(201);
    const productId: number = created.body.product.id;
    expect(created.body.product.isPublished).toBe(false);

    expect((await request(app).get(`/products/${productId}`)).status).toBe(404);

    const tooEarly = await asAdmin(request(app).post(`/products/${productId}/publish`));
    expect(tooEarly.status).toBe(400);

    // 4. Wariant: jedna sztuka za 15 €, cena w PLN liczona po kursie testowym 4,3 i zaokrąglana w górę.
    const variant = await asAdmin(request(app).post(`/products/${productId}/variants`)).send({
      priceEur: 1500,
      quantity: 1,
      attributes: variantAttributes,
    });
    expect(variant.status).toBe(201);
    const variantId: number = variant.body.variant.id;
    expect(variant.body.variant).toEqual(
      expect.objectContaining({ priceEur: 1500, pricePln: 6500, quantity: 1 }),
    );

    // 5. Zdjęcie labelu jako główne zdjęcie wariantu.
    const media = await asAdmin(request(app).post(`/products/variants/${variantId}/media`))
      .attach("file", photo)
      .field("alt", "Label A")
      .field("sortOrder", "0")
      .field("isPrimary", "true");
    expect(media.status).toBe(201);
    expect(media.body).toEqual(expect.objectContaining({ type: "photo", isPrimary: true }));

    // 6. Panel ostrzega o braku odsłuchu; dodanie linku usuwa ostrzeżenie.
    const draft = await asAdmin(request(app).get(`/products/manage/${productId}`));
    expect(draft.status).toBe(200);
    expect(draft.body.warnings).toEqual(["missing_preview"]);

    const withPreview = await asAdmin(request(app).patch(`/products/${productId}`)).send({
      attributes: {
        artists: [ARTIST],
        previewLinks: ["https://www.youtube.com/watch?v=e2e-preview"],
      },
    });
    expect(withPreview.status).toBe(200);

    // 7. Publikacja bez ostrzeżeń.
    const published = await asAdmin(request(app).post(`/products/${productId}/publish`));
    expect(published.status).toBe(200);
    expect(published.body.warnings).toEqual([]);

    // 8. Klient widzi płytę na liście, w wyszukiwarce i na stronie produktu (lista wcześniej mogła być w cache).
    const byArtist = await request(app).get("/products").query({ artist: ARTIST });
    expect(ids(byArtist)).toEqual([productId]);

    const bySearch = await request(app).get("/products").query({ q: "lion steppers" });
    expect(ids(bySearch)).toContain(productId);

    const page = await request(app).get(`/products/${productId}`);
    expect(page.status).toBe(200);
    expect(page.body.product.variants).toEqual([
      expect.objectContaining({
        id: variantId,
        pricePln: 6500,
        attributes: expect.objectContaining({ catalogNumber: "E2E-045" }),
        media: [expect.objectContaining({ id: media.body.id, isPrimary: true })],
      }),
    ]);

    // 9. Kolejny egzemplarz z tym samym numerem (inaczej zapisanym) zostaje rozpoznany jako duplikat.
    const duplicate = await asAdmin(
      request(app).get("/products/lookup/existing").query({ catalogNumber: "e2e 045" }),
    );
    expect(duplicate.body.existingProducts).toEqual([
      expect.objectContaining({
        productId,
        matchedBy: ["catalog_number"],
        matchingVariantIds: [variantId],
      }),
    ]);

    // 10. Klient kupuje jedyną sztukę: płyta znika z dostępnych, drugie zamówienie dostaje 409.
    const order = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customer}`)
      .send({ items: [{ productVariantId: variantId, quantity: 1 }] });
    expect(order.status).toBe(201);

    const soldOut = await request(app).get(`/products/${productId}`);
    expect(soldOut.body.product.variants[0].quantity).toBe(0);

    const available = await request(app)
      .get("/products")
      .query({ artist: ARTIST, available: "true" });
    expect(ids(available)).toEqual([]);

    const secondOrder = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customer}`)
      .send({ items: [{ productVariantId: variantId, quantity: 1 }] });
    expect(secondOrder.status).toBe(409);

    // 11. Wycofanie z publikacji: znika ze sklepu, zostaje w panelu.
    const unpublished = await asAdmin(request(app).post(`/products/${productId}/unpublish`));
    expect(unpublished.status).toBe(200);

    expect((await request(app).get(`/products/${productId}`)).status).toBe(404);
    expect(ids(await request(app).get("/products").query({ artist: ARTIST }))).toEqual([]);

    const managed = await asAdmin(request(app).get("/products/manage").query({ status: "draft" }));
    expect(ids(managed)).toContain(productId);
  });
});
