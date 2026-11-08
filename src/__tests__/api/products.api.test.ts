import { afterAll, describe, it, expect } from "@jest/globals";
import request from "supertest";
import app from "../../app.js";
import { redisClient } from "../../dependency-injection.js";
import { loginAsAdmin, loginAsUser } from "../../__test-helpers__/auth.js";
import { pool } from "@/database/db.js";

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

  it("should update a variant through the variant endpoint", async () => {
    const token = await loginAsAdmin();

    const productResponse = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        title: "API Variant Update Product",
        variants: [{ priceEur: 10000, attributes: vinylVariant(), quantity: 10 }],
      });

    const productId = productResponse.body.product.id;
    const variantId = productResponse.body.product.variants[0].id;

    const response = await request(app)
      .patch(`/products/${productId}/variants/${variantId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ priceEur: 15000, attributes: vinylVariant("VG+"), quantity: 20 });

    expect(response.status).toBe(200);
    expect(response.body.variant).toEqual(
      expect.objectContaining({
        id: variantId,
        priceEur: 15000,
        pricePln: 64500,
        quantity: 20,
        attributes: vinylVariant("VG+"),
      }),
    );
  });

  it("should add a variant through the variant endpoint", async () => {
    const token = await loginAsAdmin();

    const productResponse = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        attributes: { artists: ["Test Artist"] },
        title: "API Add Variant Product",
        variants: [{ priceEur: 10000, attributes: vinylVariant(), quantity: 10 }],
      });

    const productId = productResponse.body.product.id;

    const response = await request(app)
      .post(`/products/${productId}/variants`)
      .set("Authorization", `Bearer ${token}`)
      .send({ priceEur: 20000, attributes: vinylVariant("VG") });

    expect(response.status).toBe(201);
    expect(response.body.variant.quantity).toBe(1);

    const product = await request(app)
      .get(`/products/manage/${productId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(product.body.product.variants).toHaveLength(2);
  });

  it("should return 404 when updating a variant that belongs to another product", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .patch("/products/50/variants/8")
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity: 10 });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Product variant not found");
  });

  it("should reject variants in a product update", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .patch("/products/50")
      .set("Authorization", `Bearer ${token}`)
      .send({ variants: [{ id: 99, quantity: 1 }] });

    expect(response.status).toBe(400);
  });

  it("should soft delete a published product", async () => {
    const token = await loginAsAdmin();

    const deleteResponse = await request(app)
      .delete("/products/5")
      .set("Authorization", `Bearer ${token}`);

    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app).get("/products/5");

    expect(getResponse.status).toBe(404);
    expect(getResponse.body.message).toBe("Product not found");

    const row = await pool.query("SELECT is_deleted FROM products WHERE id = 5");

    expect(row.rows[0].is_deleted).toBe(true);
  });

  it("should permanently delete a draft that was never ordered", async () => {
    const token = await loginAsAdmin();

    const deleteResponse = await request(app)
      .delete("/products/6")
      .set("Authorization", `Bearer ${token}`);

    expect(deleteResponse.status).toBe(204);

    const products = await pool.query("SELECT id FROM products WHERE id = 6");
    const variants = await pool.query(
      "SELECT id FROM product_variants WHERE product_id = 6",
    );

    expect(products.rows).toHaveLength(0);
    expect(variants.rows).toHaveLength(0);
  });

  it("should soft delete a variant of a published product", async () => {
    const token = await loginAsAdmin();

    const deleteResponse = await request(app)
      .delete("/products/1/variants/2")
      .set("Authorization", `Bearer ${token}`);

    expect(deleteResponse.status).toBe(200);

    const getResponse = await request(app).get("/products/1");

    expect(
      getResponse.body.product.variants.some(
        (variant: { id: number }) => variant.id === 2,
      ),
    ).toBe(false);

    const row = await pool.query(
      "SELECT is_deleted FROM product_variants WHERE id = 2",
    );

    expect(row.rows[0].is_deleted).toBe(true);
  });

  it("should permanently delete a variant of a draft", async () => {
    const token = await loginAsAdmin();

    const deleteResponse = await request(app)
      .delete("/products/6/variants/12")
      .set("Authorization", `Bearer ${token}`);

    expect(deleteResponse.status).toBe(200);

    const row = await pool.query("SELECT id FROM product_variants WHERE id = 12");

    expect(row.rows).toHaveLength(0);
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

  it("should validate variant attributes against the existing product type", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .patch("/products/4/variants/7")
      .set("Authorization", `Bearer ${token}`)
      .send({ attributes: { color: "Red" } });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      expect.objectContaining({ path: "attributes.size" }),
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

const ids = (response: { body: { products: { id: number }[] } }) =>
  response.body.products.map((product) => product.id);

describe("Products API – drafts and publishing", () => {
  it("should hide drafts from the shop", async () => {
    const product = await request(app).get("/products/6");
    const list = await request(app).get("/products?limit=100");

    expect(product.status).toBe(404);
    expect(ids(list)).not.toContain(6);
    expect(list.body.pagination.total).toBe(49);
  });

  it("should show drafts with warnings in the admin view", async () => {
    const token = await loginAsAdmin();

    const product = await request(app)
      .get("/products/manage/6")
      .set("Authorization", `Bearer ${token}`);

    expect(product.status).toBe(200);
    expect(product.body.product.isPublished).toBe(false);
    expect(product.body.warnings).toEqual(["missing_preview"]);

    const drafts = await request(app)
      .get("/products/manage?status=draft")
      .set("Authorization", `Bearer ${token}`);

    expect(drafts.status).toBe(200);
    expect(ids(drafts)).toEqual([6]);
  });

  it("should not let a regular user see the admin view", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .get("/products/manage")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it("should create a draft, publish it with warnings and unpublish it", async () => {
    const token = await loginAsAdmin();

    const created = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "vinyl",
        title: "Publish Me",
        attributes: { artists: ["Test Artist"] },
        variants: [{ priceEur: 1500, attributes: vinylVariant() }],
      });

    const productId = created.body.product.id;

    expect(created.body.product.isPublished).toBe(false);
    expect(created.body.warnings).toEqual(["missing_preview"]);
    expect((await request(app).get(`/products/${productId}`)).status).toBe(404);

    const published = await request(app)
      .post(`/products/${productId}/publish`)
      .set("Authorization", `Bearer ${token}`);

    expect(published.status).toBe(200);
    expect(published.body.product.isPublished).toBe(true);
    expect(published.body.warnings).toEqual(["missing_preview"]);
    expect((await request(app).get(`/products/${productId}`)).status).toBe(200);

    const unpublished = await request(app)
      .post(`/products/${productId}/unpublish`)
      .set("Authorization", `Bearer ${token}`);

    expect(unpublished.status).toBe(200);
    expect((await request(app).get(`/products/${productId}`)).status).toBe(404);
  });

  it("should publish without warnings when the vinyl has preview links", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products/2/publish")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.warnings).toEqual([]);
  });

  it("should not publish a product without variants", async () => {
    const token = await loginAsAdmin();

    const created = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "other", title: "Empty" });

    const response = await request(app)
      .post(`/products/${created.body.product.id}/publish`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      { path: "variants", message: "At least one variant is required" },
    ]);
  });

  it("should not let a regular user publish", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .post("/products/6/publish")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it("should return 404 when publishing a product that does not exist", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .post("/products/999999/publish")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});

describe("Products API – filters, search and sorting", () => {
  it("should filter by artist case-insensitively", async () => {
    const response = await request(app).get("/products?artist=zulu%20vibes");

    expect(response.status).toBe(200);
    expect(ids(response)).toEqual([1]);
  });

  it("should filter by product type", async () => {
    const response = await request(app).get("/products?type=tshirt");

    expect(ids(response)).toEqual([4]);
  });

  it("should match variant filters on the same variant", async () => {
    const response = await request(app).get(
      `/products?format=${encodeURIComponent('7"')}&mediaCondition=M`,
    );

    expect(ids(response)).toEqual([1]);

    // Produkt 2 ma wariant NM, ale wyprzedany; drugi wariant (VG+) jest na stanie.
    const available = await request(app).get(
      "/products?mediaCondition=NM&available=true&limit=100",
    );

    expect(ids(available)).not.toContain(2);

    const anyStock = await request(app).get("/products?mediaCondition=NM&limit=100");

    expect(ids(anyStock)).toContain(2);
  });

  it("should filter by price range in euro cents", async () => {
    const response = await request(app).get("/products?priceMaxEur=1500");

    expect(ids(response).sort((a, b) => a - b)).toEqual([1, 5]);
  });

  it("should filter by label", async () => {
    const response = await request(app).get("/products?label=lion%20yard");

    expect(ids(response)).toEqual([2]);
  });

  it("should search title, artists, label and catalog number", async () => {
    const byCatalogNumber = await request(app).get("/products?q=zv-7");
    const byTitle = await request(app).get("/products?q=dub%20from");
    const byArtist = await request(app).get("/products?q=roots%20found");
    const wildcard = await request(app).get("/products?q=%25");

    expect(ids(byCatalogNumber)).toEqual([1]);
    expect(ids(byTitle)).toEqual([2]);
    expect(ids(byArtist)).toEqual([2]);
    expect(wildcard.status).toBe(200);
    expect(ids(wildcard)).toEqual([]);
  });

  it("should sort by the lowest variant price", async () => {
    const ascending = await request(app).get("/products?sort=price_asc&limit=3");
    const descending = await request(app).get("/products?sort=price_desc&limit=1");

    expect(ids(ascending)).toEqual([1, 5, 3]);
    expect(ids(descending)).toEqual([50]);
  });

  it("should sort by the first artist", async () => {
    const response = await request(app).get("/products?sort=artist&type=vinyl&limit=2");

    expect(ids(response)).toEqual([1, 2]);
  });

  it("should count only filtered products", async () => {
    const response = await request(app).get("/products?type=vinyl&limit=1");

    expect(response.body.pagination.total).toBe(47);
  });

  it("should return 400 for invalid filters", async () => {
    const sort = await request(app).get("/products?sort=random");
    const price = await request(app).get("/products?priceMaxEur=-1");
    const available = await request(app).get("/products?available=yes");

    for (const response of [sort, price, available]) {
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid query parameters");
    }
  });
});

describe("Products API – prices and product types", () => {
  it("should return prices in EUR and PLN rounded up to full złoty", async () => {
    const response = await request(app).get("/products/1");

    const prices = response.body.product.variants.map(
      (variant: { priceEur: number; pricePln: number }) => [
        variant.priceEur,
        variant.pricePln,
      ],
    );

    // Kurs w testach: 4.3 → 15,00 € = 64,50 zł → 65 zł; 10,00 € = 43,00 zł.
    expect(prices).toEqual([
      [1500, 6500],
      [1000, 4300],
    ]);
  });

  it("should describe product types with JSON Schemas", async () => {
    const response = await request(app).get("/products/types");

    expect(response.status).toBe(200);

    const vinyl = response.body.productTypes.find(
      (type: { key: string }) => type.key === "vinyl",
    );

    expect(vinyl.productAttributes.required).toEqual(["artists"]);
    expect(vinyl.variantAttributes.required).toEqual(
      expect.arrayContaining(["format", "mediaCondition", "sleeveCondition"]),
    );
    expect(response.body.productTypes.map((type: { key: string }) => type.key)).toEqual([
      "vinyl",
      "tshirt",
      "other",
    ]);
  });
});
