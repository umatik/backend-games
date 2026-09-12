import request from "supertest";
import app from "../app.js";

const login = async (email: string) => {
  const response = await request(app).post("/login").send({
    email,
    password: "alamakota",
  });

  return response.body.token;
};

export const loginAsUser = () => login("alice@example.com");

export const loginAsAdmin = () => login("bob@example.com");
