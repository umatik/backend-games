import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import app from "../../server.js";

const login = async (email = "alice@example.com", password = "alamakota") => {
  const response = await request(app).post("/login").send({
    email,
    password,
  });

  return response.body.token;
};

describe("Users API", () => {
  it("should register a new user", async () => {
    const email = `api-test-${Date.now()}@example.com`;

    const response = await request(app).post("/users/register").send({
      email,
      password: "alamakota",
      firstName: "API",
      lastName: "Test",
      phone: "123456789",
      address: "Test Street 1",
      city: "Warsaw",
      postalCode: "00-001",
      country: "Poland",
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(email);
  });

  it("should return 400 when registering without email", async () => {
    const response = await request(app).post("/users/register").send({
      password: "alamakota",
      firstName: "API",
      lastName: "Test",
      phone: "123456789",
      address: "Test Street 1",
      city: "Warsaw",
      postalCode: "00-001",
      country: "Poland",
    });

    expect(response.status).toBe(400);
  });

  it("should return 400 when registering without password", async () => {
    const email = `api-test-${Date.now()}@example.com`;

    const response = await request(app).post("/users/register").send({
      email,
      firstName: "API",
      lastName: "Test",
      phone: "123456789",
      address: "Test Street 1",
      city: "Warsaw",
      postalCode: "00-001",
      country: "Poland",
    });

    expect(response.status).toBe(400);
  });

  it("should return 400 when registering with an invalid email", async () => {
    const response = await request(app).post("/users/register").send({
      email: "invalid-email",
      password: "alamakota",
      firstName: "API",
      lastName: "Test",
      phone: "123456789",
      address: "Test Street 1",
      city: "Warsaw",
      postalCode: "00-001",
      country: "Poland",
    });

    expect(response.status).toBe(400);
  });

  it("should return 400 when registering with an empty password", async () => {
    const email = `api-test-${Date.now()}@example.com`;

    const response = await request(app).post("/users/register").send({
      email,
      password: "",
      firstName: "API",
      lastName: "Test",
      phone: "123456789",
      address: "Test Street 1",
      city: "Warsaw",
      postalCode: "00-001",
      country: "Poland",
    });

    expect(response.status).toBe(400);
  });

  it("should return 409 when registering an existing email", async () => {
    const response = await request(app).post("/users/register").send({
      email: "alice@example.com",
      password: "alamakota",
      firstName: "API",
      lastName: "Test",
      phone: "123456789",
      address: "Test Street 1",
      city: "Warsaw",
      postalCode: "00-001",
      country: "Poland",
    });

    expect(response.status).toBe(409);
  });

  it("should login with valid credentials", async () => {
    const response = await request(app).post("/login").send({
      email: "alice@example.com",
      password: "alamakota",
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  it("should return 401 when login password is incorrect", async () => {
    const response = await request(app).post("/login").send({
      email: "alice@example.com",
      password: "wrong-password",
    });

    expect(response.status).toBe(401);
  });

  it("should return 401 when login email does not exist", async () => {
    const response = await request(app).post("/login").send({
      email: "does-not-exist@example.com",
      password: "alamakota",
    });

    expect(response.status).toBe(401);
  });

  it("should return 400 when login email is missing", async () => {
    const response = await request(app).post("/login").send({
      password: "alamakota",
    });

    expect(response.status).toBe(400);
  });

  it("should return 400 when login password is missing", async () => {
    const response = await request(app).post("/login").send({
      email: "alice@example.com",
    });

    expect(response.status).toBe(400);
  });

  it("should get the authenticated user", async () => {
    const token = await login();

    const response = await request(app)
      .get("/users/1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.id).toBe("1");
    expect(response.body.user.email).toBe("alice@example.com");
  });

  it("should return 401 when getting a user without authentication", async () => {
    const response = await request(app).get("/users/1");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authorization header is required");
  });

  it("should return 401 when getting a user with an invalid token", async () => {
    const response = await request(app)
      .get("/users/1")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  it("should return 403 when getting another user's data", async () => {
    const token = await login();

    const response = await request(app)
      .get("/users/2")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
  });

  it("should return 403 when getting another user's data even if user does not exist", async () => {
    const token = await login();

    const response = await request(app)
      .get("/users/999999")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it("should update the authenticated user", async () => {
    const email = `api-update-${Date.now()}@example.com`;

    const registerResponse = await request(app).post("/users/register").send({
      email,
      password: "alamakota",
      firstName: "Before",
      lastName: "Update",
      phone: "123456789",
      address: "Test Street 1",
      city: "Warsaw",
      postalCode: "00-001",
      country: "Poland",
    });

    expect(registerResponse.status).toBe(201);

    const userId = registerResponse.body.user.id;

    const token = await login(email);

    const response = await request(app)
      .patch(`/users/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "After",
        lastName: "Updated",
      });

    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
  });

  it("should return 401 when updating a user without authentication", async () => {
    const response = await request(app).patch("/users/1").send({
      firstName: "Unauthorized",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authorization header is required");
  });

  it("should return 401 when updating a user with an invalid token", async () => {
    const response = await request(app)
      .patch("/users/1")
      .set("Authorization", "Bearer invalid-token")
      .send({
        firstName: "Unauthorized",
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  it("should return 403 when updating another user's data", async () => {
    const token = await login();

    const response = await request(app)
      .patch("/users/2")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Forbidden",
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
  });

  it("should return 400 when registering with invalid contact data", async () => {
    const email = `api-contact-${Date.now()}@example.com`;

    const response = await request(app).post("/users/register").send({
      email,
      password: "alamakota",
      firstName: "",
      lastName: "",
      phone: "123456789",
      address: "Test Street 1",
      city: "Warsaw",
      postalCode: "00-001",
      country: "Poland",
    });

    expect(response.status).toBe(400);
  });
});
