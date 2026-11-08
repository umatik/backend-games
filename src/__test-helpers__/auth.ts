import request from "supertest";
import app from "@/app.js";

const login = async (email: string): Promise<string> => {
  const response = await request(app).post("/login").send({
    email,
    password: "alamakota",
  });

  // Bez tego nieudane logowanie dawało token `undefined` i mylące 401 dopiero w kolejnym żądaniu.
  if (response.status !== 200 || typeof response.body.token !== "string") {
    throw new Error(
      `Login as ${email} failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body.token;
};

export const loginAsUser = () => login("alice@example.com");

export const loginAsAdmin = () => login("bob@example.com");
