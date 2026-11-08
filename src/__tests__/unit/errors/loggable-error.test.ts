import { describe, expect, it } from "@jest/globals";
import { toLoggableError } from "@/errors/loggable-error.js";
import { ExternalServiceError } from "@/errors/external-service.error.js";
import { AppError } from "@/errors/app.error.js";
import { HttpDiscogsClient } from "@/integrations/discogs/discogs-client.js";

const SECRET = "sk-ant-api03-very-secret";

describe("toLoggableError", () => {
  it("should drop the body and message of request parser errors", () => {
    const parserError = Object.assign(new SyntaxError(`Unexpected token in "${SECRET}"`), {
      type: "entity.parse.failed",
      status: 400,
      body: `{"apiKey":"${SECRET}",}`,
    });

    const loggable = toLoggableError(parserError);

    expect(loggable).toEqual({ name: "SyntaxError", type: "entity.parse.failed", status: 400 });
    expect(JSON.stringify(loggable)).not.toContain(SECRET);
  });

  it("should keep the message and stack of server errors", () => {
    const loggable = toLoggableError(new Error("database is down"));

    expect(loggable).toEqual(
      expect.objectContaining({ name: "Error", message: "database is down", stack: expect.any(String) }),
    );
  });

  it("should skip the stack of client errors", () => {
    expect(toLoggableError(new AppError("Product not found", 404))).toEqual({
      name: "AppError",
      message: "Product not found",
      status: 404,
    });
  });

  it("should describe nested causes only by name, code and status", () => {
    const original = Object.assign(new Error("401 authentication_error"), {
      status: 401,
      headers: { "x-api-key": SECRET },
    });

    const loggable = toLoggableError(new ExternalServiceError("Claude request failed", original));

    expect(loggable.message).toBe("Claude request failed");
    expect(loggable.cause).toEqual({ name: "Error", status: 401 });
    expect(JSON.stringify(loggable)).not.toContain(SECRET);
  });

  it("should not leak a token from a header rejected by fetch", async () => {
    // Prawdziwy fetch odrzuca nagłówek ze znakiem nowej linii, cytując go w komunikacie (audyt R1).
    const token = "AUDIT_FAKE_TOKEN_123456\n7890";
    const client = new HttpDiscogsClient(token, "RasBassShop/1.0");

    const error = await client.search({ catno: "ZV-7-006" }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ExternalServiceError);
    const logged = JSON.stringify(toLoggableError(error));
    expect(logged).not.toContain("AUDIT_FAKE_TOKEN");
    expect(logged).toContain("Discogs is not reachable");
  });

  it("should stop at a limited depth for circular causes", () => {
    const error = new Error("loop") as Error & { cause?: unknown };
    error.cause = error;

    expect(() => toLoggableError(error)).not.toThrow();
  });

  it("should handle values that are not errors", () => {
    expect(toLoggableError("boom")).toEqual({ name: "string", message: "boom" });
    expect(toLoggableError(null)).toEqual({ name: "object", message: "null" });
  });
});
