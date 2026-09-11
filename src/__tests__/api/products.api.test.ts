import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import app from "../../server.js";

const login = async () => {
  const response = await request(app).post("/login").send({
    email: "alice@example.com",
    password: "alamakota",
  });

  return response.body.token;
};

const loginAsAdmin = async () => {
  const response = await request(app).post("/login").send({
    email: "bob@example.com",
    password: "alamakota",
  });

  return response.body.token;
};

describe("Products API", () => {
  it("should get a product by id", async () => {
    const response = await request(app).get("/products/50");

    expect(response.status).toBe(200);
    expect(response.body.product.id).toBe(50);
    expect(response.body.product.name).toBeDefined();
    expect(response.body.product.variants).toBeDefined();
  });

  it("should get all products", async () => {
    const response = await request(app).get("/products");

    expect(response.status).toBe(200);
    expect(response.body.products).toBeDefined();
    expect(Array.isArray(response.body.products)).toBe(true);
    expect(response.body.products.length).toBeGreaterThan(0);
  });

  it("should return 404 when product does not exist", async () => {
    const response = await request(app).get("/products/999999");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Product not found");
  });

  it("should create a product", async () => {
    const token = await login();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "API Test Product",
        variants: [
          {
            color: "Black",
            size: "M",
            price: 100,
            quantity: 10,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.product.name).toBe("API Test Product");
  });

  it("should return 401 when creating a product without authentication", async () => {
    const response = await request(app)
      .post("/products")
      .send({
        name: "Unauthorized Product",
        variants: [
          {
            color: "Black",
            size: "M",
            price: 100,
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
        name: "Invalid Token Product",
        variants: [
          {
            color: "Black",
            size: "M",
            price: 100,
            quantity: 10,
          },
        ],
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  it("should update a product", async () => {
    const token = await login();

    const response = await request(app)
      .patch("/products/50")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Updated Product 50",
      });

    expect(response.status).toBe(200);
    expect(response.body.product.name).toBe("Updated Product 50");
  });

  it("should return 401 when updating a product without authentication", async () => {
    const response = await request(app).patch("/products/50").send({
      name: "Unauthorized Update",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authorization header is required");
  });

  it("should return 404 when updating a product that does not exist", async () => {
    const token = await login();

    const response = await request(app)
      .patch("/products/999999")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Non Existing Product",
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

  it("should return 404 when deleting a variant from a different product", async () => {
    const token = await login();

    const response = await request(app)
      .delete("/products/50/variants/8")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Product variant not found");
  });

  it("should return 400 when creating a product with an empty name", async () => {
    const token = await login();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "",
        variants: [
          {
            color: "Black",
            size: "M",
            price: 100,
            quantity: 10,
          },
        ],
      });

    expect(response.status).toBe(400);
  });

  it("should create a product without variants", async () => {
    const token = await login();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Product Without Variants",
        variants: [],
      });

    expect(response.status).toBe(201);
    expect(response.body.product.name).toBe("Product Without Variants");
  });

  it("should return 400 when creating a product with invalid price", async () => {
    const token = await login();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Invalid Price Product",
        variants: [
          {
            color: "Black",
            size: "M",
            price: -100,
            quantity: 10,
          },
        ],
      });

    expect(response.status).toBe(400);
  });

  it("should return 400 when creating a product with invalid quantity", async () => {
    const token = await login();

    const response = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Invalid Quantity Product",
        variants: [
          {
            color: "Black",
            size: "M",
            price: 100,
            quantity: -1,
          },
        ],
      });

    expect(response.status).toBe(400);
  });

  it("should update product variants", async () => {
    const token = await login();

    const productResponse = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "API Variant Update Product",
        variants: [
          {
            color: "Black",
            size: "M",
            price: 100,
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
            color: "Red",
            size: "L",
            price: 150,
            quantity: 20,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.product.variants[0].color).toBe("Red");
    expect(response.body.product.variants[0].size).toBe("L");
    expect(response.body.product.variants[0].price).toBe(150);
    expect(response.body.product.variants[0].quantity).toBe(20);
  });

  it("should add a new variant when updating a product", async () => {
    const token = await login();

    const productResponse = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "API Add Variant Product",
        variants: [
          {
            color: "Black",
            size: "M",
            price: 100,
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
            color: "White",
            size: "L",
            price: 200,
            quantity: 15,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.product.variants.length).toBe(2);
  });

  it("should return 404 when updating a variant that belongs to another product", async () => {
    const token = await login();

    const response = await request(app)
      .patch("/products/50")
      .set("Authorization", `Bearer ${token}`)
      .send({
        variants: [
          {
            id: 8,
            color: "Blue",
            size: "XL",
            price: 300,
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
        name: "API Delete Product",
        variants: [
          {
            color: "Black",
            size: "M",
            price: 100,
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
    const token = await login();

    const productResponse = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "API Delete Variant Product",
        variants: [
          {
            color: "Black",
            size: "M",
            price: 100,
            quantity: 10,
          },
          {
            color: "White",
            size: "L",
            price: 150,
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
    const token = await login();

    const response = await request(app)
      .delete("/products/1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
  });
});
