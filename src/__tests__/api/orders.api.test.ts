import {describe, it, expect} from "@jest/globals";
import request from "supertest";
import app from "../../app.js";
import {loginAsUser} from "../../__test-helpers__/auth.js";

describe("Orders API", () => {
  const getFirstProduct = async () => {
    const response = await request(app).get("/products");

    expect(response.status).toBe(200);
    expect(response.body.products.length).toBeGreaterThan(0);

    return response.body.products[0];
  };

  const getFirstVariant = async () => {
    const product = await getFirstProduct();

    expect(product.variants.length).toBeGreaterThan(0);

    return product.variants[0];
  };

  const getFirstOrder = async (token: string) => {
    const response = await request(app)
      .get("/orders")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.orders.length).toBeGreaterThan(0);

    return response.body.orders[0];
  };

  const createOrderAsAnotherUser = async () => {
    const email = `orders-test-${Date.now()}@example.com`;
    const password = "alamakota";

    const registerResponse = await request(app)
      .post("/users/register")
      .send({
        email,
        password,
        firstName: "Orders",
        lastName: "Test",
        phone: "123456789",
        address: "Test Street 1",
        city: "Warsaw",
        postalCode: "00-001",
        country: "Poland",
      });

    expect(registerResponse.status).toBe(201);

    const loginResponse = await request(app)
      .post("/login")
      .send({
        email,
        password,
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    const variant = await getFirstVariant();

    const orderResponse = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .send({
        items: [
          {
            productVariantId: variant.id,
            quantity: 1,
          },
        ],
      });

    expect(orderResponse.status).toBe(201);
    expect(orderResponse.body.order).toBeDefined();

    return orderResponse.body.order;
  };

  it("should get all orders", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .get("/orders")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.orders).toBeDefined();
    expect(Array.isArray(response.body.orders)).toBe(true);
    expect(response.body.orders.length).toBeGreaterThan(0);
  });

  it("should return 401 when getting all orders without authentication", async () => {
    const response = await request(app).get("/orders");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authorization header is required");
  });

  it("should return 401 when getting all orders with an invalid token", async () => {
    const response = await request(app)
      .get("/orders")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  it("should get an order by id", async () => {
    const token = await loginAsUser();
    const order = await getFirstOrder(token);

    const response = await request(app)
      .get(`/orders/${order.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.order).toBeDefined();
    expect(response.body.order.id).toBe(order.id);
  });

  it("should return 401 when getting an order without authentication", async () => {
    const token = await loginAsUser();
    const order = await getFirstOrder(token);

    const response = await request(app).get(`/orders/${order.id}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authorization header is required");
  });

  it("should return 401 when getting an order with an invalid token", async () => {
    const token = await loginAsUser();
    const order = await getFirstOrder(token);

    const response = await request(app)
      .get(`/orders/${order.id}`)
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  it("should return 404 when order does not exist", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .get("/orders/999999")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Order not found");
  });

  it("should create an order", async () => {
    const token = await loginAsUser();
    const variant = await getFirstVariant();

    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {
            productVariantId: variant.id,
            quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.order).toBeDefined();
    expect(response.body.order.userId).toBeDefined();
  });

  it("should return 401 when creating an order without authentication", async () => {
    const variant = await getFirstVariant();

    const response = await request(app)
      .post("/orders")
      .send({
        items: [
          {
            productVariantId: variant.id,
            quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authorization header is required");
  });

  it("should return 401 when creating an order with an invalid token", async () => {
    const variant = await getFirstVariant();

    const response = await request(app)
      .post("/orders")
      .set("Authorization", "Bearer invalid-token")
      .send({
        items: [
          {
            productVariantId: variant.id,
            quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  it("should return 400 when creating an order without items", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [],
      });

    expect(response.status).toBe(400);
  });

  it("should return 404 when creating an order with a non-existing product variant", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {
            productVariantId: 999999,
            quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(404);
  });

  it("should return 400 when creating an order with invalid quantity", async () => {
    const token = await loginAsUser();
    const variant = await getFirstVariant();

    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {
            productVariantId: variant.id,
            quantity: 0,
          },
        ],
      });

    expect(response.status).toBe(400);
  });

  it("should return 400 when creating an order with negative quantity", async () => {
    const token = await loginAsUser();
    const variant = await getFirstVariant();

    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {
            productVariantId: variant.id,
            quantity: -1,
          },
        ],
      });

    expect(response.status).toBe(400);
  });

  it("should create an order with multiple items", async () => {
    const token = await loginAsUser();
    const product = await getFirstProduct();

    if (product.variants.length >= 2) {
      const [firstVariant, secondVariant] = product.variants;

      const response = await request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({
          items: [
            {
              productVariantId: firstVariant.id,
              quantity: 1,
            },
            {
              productVariantId: secondVariant.id,
              quantity: 2,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.order).toBeDefined();

      return;
    }

    const productsResponse = await request(app).get("/products");

    expect(productsResponse.status).toBe(200);

    const products = productsResponse.body.products;

    const productsWithVariants = products.filter(
      (item: { variants: unknown[] }) => item.variants.length > 0,
    );

    expect(productsWithVariants.length).toBeGreaterThanOrEqual(2);

    const firstVariant = productsWithVariants[0].variants[0];
    const secondVariant = productsWithVariants[1].variants[0];

    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {
            productVariantId: firstVariant.id,
            quantity: 1,
          },
          {
            productVariantId: secondVariant.id,
            quantity: 2,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.order).toBeDefined();
  });

  it("should decrease variant quantity after creating an order", async () => {
    const token = await loginAsUser();
    const product = await getFirstProduct();
    const variant = product.variants[0];

    const initialQuantity = variant.quantity;
    const quantity = 2;

    const orderResponse = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {
            productVariantId: variant.id,
            quantity,
          },
        ],
      });

    expect(orderResponse.status).toBe(201);

    const updatedProductResponse = await request(app).get(
      `/products/${product.id}`,
    );

    expect(updatedProductResponse.status).toBe(200);

    const updatedVariant = updatedProductResponse.body.product.variants.find(
      (item: { id: number }) => item.id === variant.id,
    );

    expect(updatedVariant.quantity).toBe(initialQuantity - quantity);
  });

  it("should return 409 when requested quantity exceeds stock", async () => {
    const token = await loginAsUser();
    const variant = await getFirstVariant();

    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {
            productVariantId: variant.id,
            quantity: variant.quantity + 1,
          },
        ],
      });

    expect(response.status).toBe(409);
  });

  it("should return 404 when getting an order belonging to another user", async () => {
    const token = await loginAsUser();
    const otherUserOrder = await createOrderAsAnotherUser();

    const response = await request(app)
      .get(`/orders/${otherUserOrder.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});