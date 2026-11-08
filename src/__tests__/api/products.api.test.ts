import { afterAll, describe, it, expect } from "@jest/globals";
import request from "supertest";
import app from "../../app.js";
import { redisClient } from "../../dependency-injection.js";
import { loginAsAdmin, loginAsUser } from "../../__test-helpers__/auth.js";

const vinylVariant = (mediaCondition = "NM") => ({
  format: "LP",
  mediaCondition,
  sleeveCondition: "NM",
});

afterAll(async () => {
  await redisClient.close();
});

describe("Products API", () => {
  it("should get a product by id", async () => {
    const response = await request(app).get("/products/50");

    expect(response.status).toBe(200);
    expect(response.body.product.id).toBe(50);
    expect(response.body.product.title).toBeDefined();
    expect(response.body.product.variants).toBeDefined();
  });

  it("should get all products", async () => {
    const response = await request(app).get("/products");

    expect(response.status).toBe(200);
    expect(response.body.products).toBeDefined();
    expect(Array.isArray(response.body.products)).toBe(true);
    expect(response.body.products.length).toBeGreaterThan(0);
  });

  it("should get products with pagination", async () => {
    const response = await request(app).get("/products?page=1&limit=2");

    expect(response.status).toBe(200);

    expect(response.body.products).toBeDefined();
    expect(Array.isArray(response.body.products)).toBe(true);
    expect(response.body.products.length).toBeLessThanOrEqual(2);

    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 2,
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });

    expect(response.body.pagination.total).toBeGreaterThan(0);
    expect(response.body.pagination.totalPages).toBeGreaterThan(0);
  });

  it("should get the second page of products", async () => {
    const response = await request(app).get("/products?page=2&limit=2");

    expect(response.status).toBe(200);

    expect(response.body.pagination.page).toBe(2);
    expect(response.body.pagination.limit).toBe(2);
    expect(response.body.products).toBeDefined();
    expect(Array.isArray(response.body.products)).toBe(true);
    expect(response.body.products.length).toBeLessThanOrEqual(2);
  });

  it("should return 400 when page is invalid", async () => {
    const response = await request(app).get("/products?page=0&limit=2");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid pagination parameters");
  });

  it("should return 400 when limit is invalid", async () => {
    const response = await request(app).get("/products?page=1&limit=0");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid pagination parameters");
  });

  it("should return 400 when page is not an integer", async () => {
    const response = await request(app).get("/products?page=abc&limit=2");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid pagination parameters");
  });

  it("should return 400 when limit is not an integer", async () => {
    const response = await request(app).get("/products?page=1&limit=abc");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid pagination parameters");
  });

  it("should return 404 when product does not exist", async () => {
    const response = await request(app).get("/products/999999");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Product not found");
  });

  it("should create a product", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        title: "API Test Product",
        variants: [
          {
            priceEur: 10000,
            attributes: vinylVariant(),
            quantity: 10,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.product.title).toBe("API Test Product");
  });

  it("should return 401 when creating a product without authentication", async () => {
    const response = await request(app)
      .post("/products")
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        title: "Unauthorized Product",
        variants: [
          {
            priceEur: 10000,
            attributes: vinylVariant(),
            quantity: 10,
          },
        ],
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authorization header is required");
  });

  it("should return 401 when creating a product with an invalid token", async () => {
    const response = await request(app)
      .post("/products")
      .set("Authorization", "Bearer invalid-token")
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        title: "Invalid Token Product",
        variants: [
          {
            priceEur: 10000,
            attributes: vinylVariant(),
            quantity: 10,
          },
        ],
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  it("should return 403 when a regular user tries to create a product", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        title: "Forbidden Product",
        variants: [
          {
            priceEur: 10000,
            attributes: vinylVariant(),
            quantity: 10,
          },
        ],
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
  });

  it("should update a product", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .patch("/products/50")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Updated Product 50",
      });

    expect(response.status).toBe(200);
    expect(response.body.product.title).toBe("Updated Product 50");
  });

  it("should return 401 when updating a product without authentication", async () => {
    const response = await request(app).patch("/products/50").send({
      title: "Unauthorized Update",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authorization header is required");
  });

  it("should return 403 when a regular user tries to update a product", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .patch("/products/50")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Forbidden Update",
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
  });

  it("should return 404 when updating a product that does not exist", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .patch("/products/999999")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Non Existing Product",
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Product not found");
  });

  it("should return 401 when deleting a product without authentication", async () => {
    const response = await request(app).delete("/products/50");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authorization header is required");
  });

  it("should return 401 when deleting a product with an invalid token", async () => {
    const response = await request(app)
      .delete("/products/50")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  it("should return 404 when deleting a product that does not exist", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .delete("/products/999999")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Product not found");
  });

  it("should return 401 when deleting a product variant without authentication", async () => {
    const response = await request(app).delete("/products/50/variants/1");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authorization header is required");
  });

  it("should return 401 when deleting a product variant with an invalid token", async () => {
    const response = await request(app)
      .delete("/products/50/variants/1")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  it("should return 404 when deleting a product variant that does not exist", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .delete("/products/50/variants/999999")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Product variant not found");
  });

  it("should return 403 when a regular user tries to delete a product variant", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .delete("/products/50/variants/8")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
  });

  it("should return 404 when deleting a variant from a different product", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .delete("/products/50/variants/8")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Product variant not found");
  });

  it("should return 400 when creating a product with an empty name", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        title: "",
        variants: [
          {
            priceEur: 10000,
            attributes: vinylVariant(),
            quantity: 10,
          },
        ],
      });

    expect(response.status).toBe(400);
  });

  it("should create a product without variants", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        title: "Product Without Variants",
        variants: [],
      });

    expect(response.status).toBe(201);
    expect(response.body.product.title).toBe("Product Without Variants");
  });

  it("should return 400 when creating a product with invalid price", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        title: "Invalid Price Product",
        variants: [
          {
            priceEur: -10000,
            attributes: vinylVariant(),
            quantity: 10,
          },
        ],
      });

    expect(response.status).toBe(400);
  });

  it("should return 400 when creating a product with invalid quantity", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        title: "Invalid Quantity Product",
        variants: [
          {
            priceEur: 10000,
            attributes: vinylVariant(),
            quantity: -1,
          },
        ],
      });

    expect(response.status).toBe(400);
  });

  it("should update product variants", async () => {
    const token = await loginAsAdmin();

    const productResponse = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        title: "API Variant Update Product",
        variants: [
          {
            priceEur: 10000,
            attributes: vinylVariant(),
            quantity: 10,
          },
        ],
      });

    const productId = productResponse.body.product.id;

    const product = await request(app).get(`/products/${productId}`);

    const variantId = product.body.product.variants[0].id;

    const response = await request(app)
      .patch(`/products/${productId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        variants: [
          {
            id: variantId,
            priceEur: 15000,
            attributes: vinylVariant("VG+"),
            quantity: 20,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.product.variants[0].attributes.mediaCondition).toBe(
      "VG+",
    );
    expect(response.body.product.variants[0].priceEur).toBe(15000);
    expect(response.body.product.variants[0].quantity).toBe(20);
  });

  it("should add a new variant when updating a product", async () => {
    const token = await loginAsAdmin();

    const productResponse = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        title: "API Add Variant Product",
        variants: [
          {
            priceEur: 10000,
            attributes: vinylVariant(),
            quantity: 10,
          },
        ],
      });

    const productId = productResponse.body.product.id;

    const response = await request(app)
      .patch(`/products/${productId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        variants: [
          {
            priceEur: 20000,
            attributes: vinylVariant(),
            quantity: 15,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.product.variants.length).toBe(2);
  });

  it("should return 404 when updating a variant that belongs to another product", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .patch("/products/50")
      .set("Authorization", `Bearer ${token}`)
      .send({
        variants: [
          {
            id: 8,
            priceEur: 30000,
            attributes: vinylVariant(),
            quantity: 10,
          },
        ],
      });

    expect(response.status).toBe(404);
  });

  it("should soft delete a product", async () => {
    const token = await loginAsAdmin();

    const productResponse = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        title: "API Delete Product",
        variants: [
          {
            priceEur: 10000,
            attributes: vinylVariant(),
            quantity: 10,
          },
        ],
      });

    const productId = productResponse.body.product.id;

    const deleteResponse = await request(app)
      .delete(`/products/${productId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app).get(`/products/${productId}`);

    expect(getResponse.status).toBe(404);
    expect(getResponse.body.message).toBe("Product not found");
  });

  it("should soft delete a product variant", async () => {
    const token = await loginAsAdmin();

    const productResponse = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        title: "API Delete Variant Product",
        variants: [
          {
            priceEur: 10000,
            attributes: vinylVariant(),
            quantity: 10,
          },
          {
            priceEur: 15000,
            attributes: vinylVariant(),
            quantity: 20,
          },
        ],
      });

    const productId = productResponse.body.product.id;

    const product = await request(app).get(`/products/${productId}`);

    const variantId = product.body.product.variants[0].id;

    const deleteResponse = await request(app)
      .delete(`/products/${productId}/variants/${variantId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteResponse.status).toBe(200);

    const getResponse = await request(app).get(`/products/${productId}`);

    expect(getResponse.status).toBe(200);

    const variants = getResponse.body.product.variants;

    expect(
      variants.some((variant: { id: number }) => variant.id === variantId),
    ).toBe(false);
  });

  it("should return 403 when a regular user tries to delete a product", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .delete("/products/1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
  });

  it("should return 404 when product does not exist", async () => {
    const response = await request(app).get("/products/999999");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Product not found");
  });

  it("should return 400 when product name is missing", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        variants: [],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid product data");
  });

  it("should return 400 when limit exceeds maximum", async () => {
    const response = await request(app).get("/products?page=1&limit=101");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid pagination parameters");
  });

  it("should return variants with media", async () => {
    const response = await request(app).get("/products/50");

    expect(response.status).toBe(200);

    const variants = response.body.product.variants;

    expect(Array.isArray(variants)).toBe(true);
    expect(variants.length).toBeGreaterThan(0);

    for (const variant of variants) {
      expect(Array.isArray(variant.media)).toBe(true);
      expect(variant.media.length).toBeGreaterThanOrEqual(4);

      for (const media of variant.media) {
        expect(media).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            productVariantId: expect.any(Number),
            type: expect.any(String),
            url: expect.any(String),
            sortOrder: expect.any(Number),
            isPrimary: expect.any(Boolean),
          }),
        );
      }
    }
  });

  it("should return all media for a variant", async () => {
    const response = await request(app).get("/products/50");

    expect(response.status).toBe(200);

    const variant = response.body.product.variants[0];

    expect(variant.media.length).toBeGreaterThan(1);

    const sortOrders = variant.media.map(
      (media: { sortOrder: number }) => media.sortOrder,
    );

    expect(sortOrders).toEqual([...sortOrders].sort((a, b) => a - b));
    expect(new Set(sortOrders).size).toBe(sortOrders.length);
  });

  it("should return product variants with all media", async () => {
    const response = await request(app).get("/products/50");

    expect(response.status).toBe(200);

    const product = response.body.product;

    expect(product.id).toBe(50);
    expect(Array.isArray(product.variants)).toBe(true);
    expect(product.variants.length).toBeGreaterThan(0);

    for (const variant of product.variants) {
      expect(Array.isArray(variant.media)).toBe(true);

      for (const media of variant.media) {
        expect(media).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            productVariantId: variant.id,
            type: expect.stringMatching(/^(photo|video|audio|document)$/),
            url: expect.any(String),
            alt: expect.anything(),
            sortOrder: expect.any(Number),
            isPrimary: expect.any(Boolean),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        );
      }
    }
  });
});

describe("Products API – product types", () => {
  it("should return the seeded split 7\" with artists, tracklist and condition note", async () => {
    const response = await request(app).get("/products/1");

    expect(response.status).toBe(200);
    expect(response.body.product).toEqual(
      expect.objectContaining({
        type: "vinyl",
        title: "Jah Prophecy",
        slug: "bunnington-judah-zulu-vibes-jah-prophecy-1",
        isPublished: true,
      }),
    );
    expect(response.body.product.attributes.artists).toEqual([
      "Bunnington Judah",
      "Zulu Vibes",
    ]);

    const [mint, used] = response.body.product.variants;

    expect(mint.attributes).toEqual(
      expect.objectContaining({
        format: '7"',
        catalogNumber: "ZV-7-006",
        mediaCondition: "M",
        sleeveCondition: "generic",
      }),
    );
    expect(used.attributes.conditionNote.pl).toBe("Lekki trzask na stronie B");
  });

  it("should return the created product with its variants and a generated slug", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        title: "Łódź Dub Session",
        attributes: { artists: ["Zulu Vibes", "Bunnington Judah"] },
        variants: [
          {
            priceEur: 1500,
            attributes: {
              format: '7"',
              speed: 45,
              catalogNumber: "ZV-7-006",
              mediaCondition: "NM",
              sleeveCondition: "generic",
              conditionNote: { pl: "Bez zarzutu" },
            },
          },
        ],
      });

    expect(response.status).toBe(201);

    const product = response.body.product;

    expect(product.slug).toBe(
      `zulu-vibes-bunnington-judah-lodz-dub-session-${product.id}`,
    );
    expect(product.isPublished).toBe(false);
    expect(product.attributes).toEqual({
      artists: ["Zulu Vibes", "Bunnington Judah"],
      tracklist: [],
      previewLinks: [],
    });
    expect(product.variants).toHaveLength(1);
    expect(product.variants[0]).toEqual(
      expect.objectContaining({
        priceEur: 1500,
        quantity: 1,
        attributes: expect.objectContaining({ catalogNumber: "ZV-7-006" }),
      }),
    );
  });

  it("should create a t-shirt with color and size", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "tshirt",
        title: "Rasta Lion T-Shirt",
        variants: [
          { priceEur: 2500, quantity: 5, attributes: { color: "Black", size: "XL" } },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.product.type).toBe("tshirt");
    expect(response.body.product.variants[0].attributes).toEqual({
      color: "Black",
      size: "XL",
    });
  });

  it("should return 400 for an unknown product type", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "cassette", title: "Tape" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      { path: "type", message: "Unknown product type" },
    ]);
  });

  it("should return 400 with field paths when vinyl attributes are invalid", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        title: "Broken Record",
        attributes: { artists: [] },
        variants: [
          {
            priceEur: 1000,
            attributes: { format: "CD", mediaCondition: "Excellent" },
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid product data");

    const paths = response.body.errors.map(
      (error: { path: string }) => error.path,
    );

    expect(paths).toContain("attributes.artists");
  });

  it("should return 400 when variant attributes do not match the product type", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        title: "Wrong Variant",
        attributes: { artists: ["Test Artist"] },
        variants: [{ priceEur: 1000, attributes: { color: "Black", size: "M" } }],
      });

    expect(response.status).toBe(400);

    const paths = response.body.errors.map(
      (error: { path: string }) => error.path,
    );

    expect(paths).toEqual(
      expect.arrayContaining([
        "variants.0.attributes.format",
        "variants.0.attributes.mediaCondition",
        "variants.0.attributes.sleeveCondition",
      ]),
    );
  });

  it("should return 400 when the request uses the old product fields", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "other", title: "Pendant", name: "Pendant" });

    expect(response.status).toBe(400);
  });

  it("should return 400 when a price is not given in whole euro cents", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "other", title: "Pendant", variants: [{ priceEur: 12.5 }] });

    expect(response.status).toBe(400);
  });

  it("should validate attributes against the existing product type on update", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .patch("/products/4")
      .set("Authorization", `Bearer ${token}`)
      .send({ variants: [{ id: 7, attributes: { color: "Red" } }] });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      expect.objectContaining({ path: "variants.0.attributes.size" }),
    ]);
  });

  it("should update the description and clear it with null", async () => {
    const token = await loginAsAdmin();

    const updated = await request(app)
      .patch("/products/5")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Hand made" });

    expect(updated.status).toBe(200);
    expect(updated.body.product.description).toBe("Hand made");

    const cleared = await request(app)
      .patch("/products/5")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: null });

    expect(cleared.status).toBe(200);
    expect(cleared.body.product.description).toBeNull();
  });
});
