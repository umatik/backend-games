import { afterAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "@/app.js";
import { redisClient } from "@/dependency-injection.js";
import { uniqueEmail, waitForEmail } from "./helpers/mailpit.js";

/**
 * E2E: reset hasła z prawdziwym e-mailem. Wiadomość idzie przez SMTP do Mailpita (docker compose),
 * a test wyciąga z niej token, więc niczego nie podmieniamy w kodzie.
 */

afterAll(async () => {
  await redisClient.close();
});

const OLD_PASSWORD = "old-password-123";
const NEW_PASSWORD = "new-password-456";

describe("E2E: password reset by email", () => {
  it("should reset the password with the token from the email", async () => {
    const email = uniqueEmail("e2e-reset");

    const registered = await request(app).post("/users/register").send({
      email,
      password: OLD_PASSWORD,
      firstName: "Ras",
      lastName: "Reset",
      phone: "+48 600 000 001",
      address: "Dubowa 8",
      city: "Kraków",
      postalCode: "30-001",
      country: "Poland",
    });
    expect(registered.status).toBe(201);

    // 1. Prośba o reset; odpowiedź nie zdradza, czy konto istnieje.
    const requested = await request(app).post("/users/forgot-password").send({ email });
    expect(requested.status).toBe(200);

    // 2. E-mail dociera do skrzynki z tokenem.
    const message = await waitForEmail(email);
    expect(message.Subject).toBe("Password reset");

    const token = message.Text.match(/token: ([a-f0-9]{64})/)?.[1];
    expect(token).toBeDefined();

    // 3. Ustawienie nowego hasła.
    const reset = await request(app)
      .post("/users/reset-password")
      .send({ token, password: NEW_PASSWORD });
    expect(reset.status).toBe(200);

    // 4. Stare hasło przestaje działać, nowe działa.
    const oldLogin = await request(app).post("/login").send({ email, password: OLD_PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post("/login").send({ email, password: NEW_PASSWORD });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.token).toEqual(expect.any(String));

    // 5. Token jest jednorazowy.
    const reused = await request(app)
      .post("/users/reset-password")
      .send({ token, password: "third-password-789" });
    expect(reused.status).toBe(400);
  });
});
