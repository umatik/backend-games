import { beforeEach, afterEach, describe, expect, it } from "@jest/globals";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { LocalStorage } from "../../storage/local-storage.js";

describe("LocalStorage", () => {
  let storage: LocalStorage;
  let basePath: string;

  beforeEach(async () => {
    basePath = await fs.mkdtemp(path.join(os.tmpdir(), "ecommerce-storage-"));

    storage = new LocalStorage(basePath);
  });

  afterEach(async () => {
    await fs.rm(basePath, {
      recursive: true,
      force: true,
    });
  });

  it("should save a file", async () => {
    const content = Buffer.from("hello world");

    const result = await storage.save(
      content,
      "products/1/test.txt",
      "text/plain",
    );

    expect(result).toBe("products/1/test.txt");

    const savedFile = await fs.readFile(
      path.join(basePath, "products/1/test.txt"),
    );

    expect(savedFile.toString()).toBe("hello world");
  });

  it("should create nested directories when saving a file", async () => {
    const content = Buffer.from("test");

    await storage.save(
      content,
      "products/1/variants/2/image.jpg",
      "image/jpeg",
    );

    expect(await storage.exists("products/1/variants/2/image.jpg")).toBe(true);
  });

  it("should check if a file exists", async () => {
    const content = Buffer.from("test");

    await storage.save(content, "test.txt", "text/plain");

    expect(await storage.exists("test.txt")).toBe(true);
    expect(await storage.exists("missing.txt")).toBe(false);
  });

  it("should delete a file", async () => {
    const content = Buffer.from("test");

    await storage.save(content, "test.txt", "text/plain");

    expect(await storage.exists("test.txt")).toBe(true);

    await storage.delete("test.txt");

    expect(await storage.exists("test.txt")).toBe(false);
  });

  it("should not throw when deleting a missing file", async () => {
    await expect(storage.delete("missing.txt")).resolves.toBeUndefined();
  });
});
