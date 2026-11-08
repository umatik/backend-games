import { describe, expect, it } from "@jest/globals";
import { parseCorsOrigins } from "@/config/http.js";

describe("parseCorsOrigins", () => {
  it("should split a comma-separated list and trim it", () => {
    expect(parseCorsOrigins(" http://localhost:5173 , https://panel.rasbass.com/ ")).toEqual([
      "http://localhost:5173",
      "https://panel.rasbass.com",
    ]);
  });

  it("should keep a single origin", () => {
    expect(parseCorsOrigins("http://localhost:3000")).toEqual(["http://localhost:3000"]);
  });

  it("should allow every origin when nothing is set", () => {
    expect(parseCorsOrigins(undefined)).toBeUndefined();
    expect(parseCorsOrigins(" , ")).toBeUndefined();
  });
});
