import { afterAll, describe, it, expect, jest } from "@jest/globals";
import request from "supertest";
import app from "../../app.js";
import { redisClient } from "../../dependency-injection.js";
import { loginAsAdmin, loginAsUser } from "../../__test-helpers__/auth.js";
import { EmailService } from "../../services/email.service.js";

afterAll(async () => {
  await redisClient.close();
});

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
    const token = await loginAsUser();

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
    const token = await loginAsUser();

    const response = await request(app)
      .get("/users/2")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
  });

  it("should return 403 when getting another user's data even if user does not exist", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .get("/users/999999")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it("should update the authenticated user", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .patch("/users/1")
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
    const token = await loginAsUser();

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

  it("should not expose password hash", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .get("/users/1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).not.toHaveProperty("password_hash");
    expect(response.body.user).not.toHaveProperty("passwordHash");
  });

  it("should return 401 when getting users without authentication", async () => {
    const response = await request(app).get("/users");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authorization header is required");
  });

  it("should return 403 when getting users as a regular user", async () => {
    const token = await loginAsUser();

    const response = await request(app)
      .get("/users?page=1&limit=20")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
  });

  it("should paginate users", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .get("/users?page=1&limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body.users).toHaveLength(2);

    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 2,
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });

    expect(response.body.pagination.total).toBeGreaterThan(0);
    expect(response.body.pagination.totalPages).toBeGreaterThan(0);
  });

  it("should get the second page of users", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .get("/users?page=2&limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body.pagination.page).toBe(2);
    expect(response.body.pagination.limit).toBe(2);

    expect(response.body.users).toHaveLength(2);
  });

  it("should return 400 when page is invalid", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .get("/users?page=0&limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid pagination parameters");
  });

  it("should return 400 when limit is invalid", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .get("/users?page=1&limit=0")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid pagination parameters");
  });

  it("should return 400 when page is not an integer", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .get("/users?page=abc&limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid pagination parameters");
  });

  it("should return 400 when limit is not an integer", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .get("/users?page=1&limit=abc")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid pagination parameters");
  });

  it("should return 400 when limit exceeds maximum", async () => {
    const token = await loginAsAdmin();

    const response = await request(app)
      .get("/users?page=1&limit=101")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid pagination parameters");
  });

  it("should accept a password reset request for an existing user", async () => {
    const response = await request(app).post("/users/forgot-password").send({
      email: "alice@example.com",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "If the account exists, a password reset email has been sent",
    );
  });

  it("should return the same response for a non-existing email", async () => {
    const response = await request(app).post("/users/forgot-password").send({
      email: "does-not-exist@example.com",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "If the account exists, a password reset email has been sent",
    );
  });

  it("should return 400 when forgot password email is invalid", async () => {
    const response = await request(app).post("/users/forgot-password").send({
      email: "invalid-email",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid email");
  });

  it("should reset password with a valid token", async () => {
    const sendPasswordResetEmailSpy = jest
      .spyOn(EmailService.prototype, "sendPasswordResetEmail")
      .mockImplementation(async () => {});

    await request(app).post("/users/forgot-password").send({
      email: "alice@example.com",
    });

    const token = sendPasswordResetEmailSpy.mock.calls[0]?.[1];

    expect(token).toBeDefined();

    const response = await request(app).post("/users/reset-password").send({
      token,
      password: "newpassword",
    });

    expect(response.status).toBe(200);

    const loginResponse = await request(app).post("/login").send({
      email: "alice@example.com",
      password: "newpassword",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    sendPasswordResetEmailSpy.mockRestore();
  });

  it("should return 400 when reset token is invalid", async () => {
    const response = await request(app).post("/users/reset-password").send({
      token: "invalid-token",
      password: "newpassword",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid or expired reset token");
  });

  it("should return 400 when reset password is invalid", async () => {
    const response = await request(app).post("/users/reset-password").send({
      token: "invalid-token",
      password: "short",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid reset password data");
  });
});
