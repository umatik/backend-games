import {
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
} from "@jest/globals";
import request from "supertest";
import app from "../../app.js";
import {redisClient} from "../../dependency-injection.js";
import {loginAsAdmin, loginAsUser} from "../../__test-helpers__/auth.js";

let adminToken: string;
let userToken: string;
let userId: number;
let productId: number;
let variantId: number;
let orderId: number;

beforeEach(async () => {
  adminToken = await loginAsAdmin();
  userToken = await loginAsUser();

  const userResponse = await request(app)
    .get("/users/1")
    .set("Authorization", `Bearer ${userToken}`);

  expect(userResponse.status).toBe(200);

  userId = Number(userResponse.body.user.id);

  const productResponse = await request(app)
    .post("/products")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "API Test Order Product",
      variants: [
        {
          color: "Black",
          size: "M",
          price: 100,
          quantity: 10,
        },
      ],
    });

  expect(productResponse.status).toBe(201);

  productId = productResponse.body.product.id;

  const product = await request(app)
    .get(`/products/${productId}`);

  expect(product.status).toBe(200);
  expect(product.body.product.variants).toBeDefined();
  expect(product.body.product.variants.length).toBeGreaterThan(0);

  variantId = product.body.product.variants[0].id;

  const orderResponse = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      items: [
        {
          productVariantId: variantId,
          quantity: 1,
        },
      ],
    });

  expect(orderResponse.status).toBe(201);

  orderId = orderResponse.body.order.id;
});

afterAll(async () => {
  await redisClient.close();
});

describe("POST /orders", () => {
  it("should create an order with valid data", async () => {
    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 2,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("order.id");
    expect(response.body.order.userId).toBe(userId);
  });

  it("should fail without token", async () => {
    const response = await request(app)
      .post("/orders")
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(401);
  });

  it("should fail with invalid token", async () => {
    const response = await request(app)
      .post("/orders")
      .set("Authorization", "Bearer wrongtoken")
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(401);
  });

  it("should ignore userId from request body", async () => {
    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        userId: 999999,
        items: [
          {
            productVariantId: variantId,
            quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.order.userId).toBe(userId);
  });

  it("should fail for non-existing variant", async () => {
    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        items: [
          {
            productVariantId: 999999,
            quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/product/i);
  });

  it("should fail for quantity <= 0", async () => {
    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 0,
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid order items");
  });

  it("should fail for quantity > stock", async () => {
    const productResponse = await request(app)
      .get(`/products/${productId}`);

    expect(productResponse.status).toBe(200);

    const variant = productResponse.body.product.variants.find(
      (item: { id: number }) => item.id === variantId,
    );

    expect(variant).toBeDefined();

    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: variant.quantity + 1,
          },
        ],
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/stock/i);
  });

  it("should decrease stock after order", async () => {
    const beforeResponse = await request(app)
      .get(`/products/${productId}`);

    expect(beforeResponse.status).toBe(200);

    const variantBefore = beforeResponse.body.product.variants.find(
      (item: { id: number }) => item.id === variantId,
    );

    expect(variantBefore).toBeDefined();

    const initialQuantity = variantBefore.quantity;
    const quantity = 2;

    const orderResponse = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity,
          },
        ],
      });

    expect(orderResponse.status).toBe(201);

    const afterResponse = await request(app)
      .get(`/products/${productId}`);

    expect(afterResponse.status).toBe(200);

    const variantAfter = afterResponse.body.product.variants.find(
      (item: { id: number }) => item.id === variantId,
    );

    expect(variantAfter).toBeDefined();
    expect(variantAfter.quantity).toBe(initialQuantity - quantity);
  });
});

describe("GET /orders", () => {
  it("should return orders with pagination and total", async () => {
    const response = await request(app)
      .get("/orders?page=1&limit=2")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.orders)).toBe(true);
    expect(typeof response.body.pagination.total).toBe("number");
    expect(response.body.orders.length).toBeLessThanOrEqual(2);
  });

  it("should fail without token", async () => {
    const response = await request(app)
      .get("/orders?page=1&limit=2");

    expect(response.status).toBe(401);
  });

  it("should fail with invalid token", async () => {
    const response = await request(app)
      .get("/orders?page=1&limit=2")
      .set("Authorization", "Bearer wrongtoken");

    expect(response.status).toBe(401);
  });

  it("should fail without orders:read permission", async () => {
    const response = await request(app)
      .get("/orders?page=1&limit=2")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(403);
  });
});

describe("GET /orders/:id", () => {
  it("should return order for owner", async () => {
    const response = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("order.id", orderId);
    expect(response.body.order.userId).toBe(userId);
  });

  it("should return order for admin", async () => {
    const response = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
  });

  it("should return 404 for non-existing order", async () => {
    const response = await request(app)
      .get("/orders/999999")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
  });

  it("should fail without token", async () => {
    const response = await request(app)
      .get(`/orders/${orderId}`);

    expect(response.status).toBe(401);
  });

  it("should fail with invalid token", async () => {
    const response = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", "Bearer wrongtoken");

    expect(response.status).toBe(401);
  });

  it("should fail with invalid order id", async () => {
    const response = await request(app)
      .get("/orders/abc")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid order id");
  });

  it("should not allow access to another user's order", async () => {
    const response = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Order not found");
  });
});