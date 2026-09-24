import fs from "node:fs";
import path from "node:path";

import request from "supertest";
import { expect, describe, it } from "@jest/globals";

import app from "@/app.js";

const uploadDir = path.resolve("src/__tests__/fixtures/uploads");

console.log(
  fs.readdirSync(uploadDir).map((filename) => ({
    filename,
    size: fs.statSync(path.join(uploadDir, filename)).size,
  })),
);

describe("Product Variant Media API", () => {
  it.each([
    ["test-photo.jpg", "photo"],
    ["test-photo.jpeg", "photo"],
    ["test-photo.png", "photo"],
    ["test-photo.webp", "photo"],
    ["test-photo.gif", "photo"],
    ["test-video.mp4", "video"],
    ["test-audio.wav", "audio"],
    ["test-document.pdf", "document"],
  ])("should upload %s as %s", async (filename, expectedType) => {
    const response = await request(app)
      .post("/products/variants/1/media")
      .attach("file", path.join(uploadDir, filename))
      .field("alt", `Test ${expectedType}`)
      .field("sortOrder", "1")
      .field("isPrimary", "false");

    expect(response.status).toBe(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        productVariantId: 1,
        type: expectedType,
        url: expect.any(String),
        alt: `Test ${expectedType}`,
        sortOrder: 1,
        isPrimary: false,
      }),
    );
  });

  it("should reject upload without a file", async () => {
    const response = await request(app)
      .post("/products/variants/1/media")
      .field("alt", "Test image")
      .field("sortOrder", "1")
      .field("isPrimary", "false");

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      message: "File is required",
    });
  });

  it("should reject unsupported media type", async () => {
    const response = await request(app)
      .post("/products/variants/1/media")
      .attach("file", Buffer.from("unsupported file"), "test-file.exe")
      .field("alt", "Unsupported")
      .field("sortOrder", "1")
      .field("isPrimary", "false");

    expect(response.status).toBe(500);
  });
});
