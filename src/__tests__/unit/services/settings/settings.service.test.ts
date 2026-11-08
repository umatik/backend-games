import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { PoolClient } from "pg";
import { SecretCipher } from "@/settings/secret-cipher.js";
import { maskSecret, SettingsService } from "@/services/settings.service.js";
import type {
  SettingRow,
  SettingsRepository,
  SettingWrite,
} from "@/repositories/settings/settings.interface.js";
import type { Database } from "@/database/database.interface.js";
import { ValidationError } from "@/errors/validation.error.js";
import { AppError } from "@/errors/app.error.js";
import { SettingsIntegrationProvider } from "@/integrations/integration-provider.js";

const KEY = Buffer.alloc(32, 7).toString("base64");
const API_KEY = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz-1234";

describe("SecretCipher", () => {
  it("should encrypt with a random IV and decrypt back", () => {
    const cipher = new SecretCipher(KEY);

    const first = cipher.encrypt(API_KEY);
    const second = cipher.encrypt(API_KEY);

    expect(first).not.toContain(API_KEY);
    expect(first).not.toBe(second);
    expect(cipher.decrypt(first)).toBe(API_KEY);
  });

  it("should accept a 64-character hex key", () => {
    const hexKey = Buffer.alloc(32, 1).toString("hex");

    expect(new SecretCipher(hexKey).decrypt(new SecretCipher(hexKey).encrypt("x"))).toBe("x");
  });

  it("should detect tampering and a wrong key", () => {
    const encrypted = new SecretCipher(KEY).encrypt(API_KEY);
    const parts = encrypted.split(":");
    const tampered = [...parts.slice(0, 3), Buffer.from("other").toString("base64")].join(":");

    expect(() => new SecretCipher(KEY).decrypt(tampered)).toThrow();
    expect(() =>
      new SecretCipher(Buffer.alloc(32, 9).toString("base64")).decrypt(encrypted),
    ).toThrow();
  });

  it("should reject a key of the wrong length", () => {
    expect(() => new SecretCipher("too-short")).toThrow(/32 bytes/);
  });
});

describe("maskSecret", () => {
  it("should show only the beginning and the end of a long secret", () => {
    expect(maskSecret(API_KEY)).toBe("sk-ant…1234");
    expect(maskSecret("short")).toBe("••••");
  });
});

describe("SettingsService", () => {
  let rows: Map<string, SettingRow>;
  let repository: SettingsRepository;
  let pool: Database;
  let client: { query: jest.Mock; release: jest.Mock };
  let cipher: SecretCipher;

  const service = (env: NodeJS.ProcessEnv = {}, withCipher = true) =>
    new SettingsService(repository, pool, withCipher ? cipher : null, env);

  beforeEach(() => {
    rows = new Map();
    cipher = new SecretCipher(KEY);
    client = { query: jest.fn(), release: jest.fn() };
    pool = {
      connect: jest
        .fn<() => Promise<PoolClient>>()
        .mockResolvedValue(client as unknown as PoolClient),
    };
    repository = {
      findAll: async () => [...rows.values()],
      upsert: async (_client, data: SettingWrite, userId) => {
        rows.set(data.key, {
          key: data.key,
          value: data.encryptedValue === undefined ? data.value : null,
          encryptedValue: data.encryptedValue ?? null,
          updatedBy: userId,
          updatedByEmail: "bob@example.com",
          updatedAt: new Date("2026-11-08T12:00:00Z"),
        });
      },
      delete: async (_client, key) => {
        rows.delete(key);
      },
    };
  });

  it("should resolve values from the database, then the environment, then the default", async () => {
    const settings = service({ DISCOGS_USER_AGENT: "FromEnv/1.0" });

    expect(await settings.get("discogsUserAgent")).toBe("FromEnv/1.0");
    expect(await settings.get("claudeModel")).toBe("claude-haiku-5-5");
    expect(await settings.get("anthropicApiKey")).toBeUndefined();

    await settings.update({ "discogs.userAgent": "FromPanel/2.0" }, 2);

    expect(await settings.get("discogsUserAgent")).toBe("FromPanel/2.0");
  });

  it("should store secrets encrypted and never list them in plain text", async () => {
    const settings = service();

    const list = await settings.update({ "anthropic.apiKey": API_KEY }, 2);

    const stored = rows.get("anthropic.apiKey")!;
    expect(stored.value).toBeNull();
    expect(stored.encryptedValue).not.toContain(API_KEY);
    expect(cipher.decrypt(stored.encryptedValue!)).toBe(API_KEY);

    expect(JSON.stringify(list)).not.toContain(API_KEY);
    expect(list.find((setting) => setting.key === "anthropic.apiKey")).toEqual(
      expect.objectContaining({
        isSet: true,
        source: "database",
        maskedValue: "sk-ant…1234",
        updatedBy: "bob@example.com",
      }),
    );
    expect(await settings.get("anthropicApiKey")).toBe(API_KEY);
  });

  it("should fall back to the environment after a value is removed", async () => {
    const settings = service({ ANTHROPIC_API_KEY: "sk-ant-from-environment-0000" });

    await settings.update({ "anthropic.apiKey": API_KEY }, 2);
    await settings.update({ "anthropic.apiKey": null }, 2);

    expect(await settings.get("anthropicApiKey")).toBe("sk-ant-from-environment-0000");
    expect((await settings.list()).find((s) => s.key === "anthropic.apiKey")?.source).toBe(
      "environment",
    );
  });

  it("should reject unknown keys and invalid values without saving anything", async () => {
    const settings = service();

    const error = await settings
      .update(
        {
          "shop.name": "Ras Bass Records",
          "anthropic.model": "gpt-5",
          "shop.unknown": "x",
        },
        2,
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).errors.map((issue) => issue.path)).toEqual([
      "anthropic.model",
      "shop.unknown",
    ]);
    expect(rows.size).toBe(0);
  });

  it("should refuse to save secrets without an encryption key", async () => {
    const settings = service({}, false);

    await expect(settings.update({ "discogs.token": "discogs-token-123" }, 2)).rejects.toThrow(
      AppError,
    );
    await expect(settings.update({ "shop.name": "Ras Bass" }, 2)).resolves.toBeDefined();
  });

  it("should ignore a secret that cannot be decrypted", async () => {
    rows.set("discogs.token", {
      key: "discogs.token",
      value: null,
      encryptedValue: new SecretCipher(Buffer.alloc(32, 3).toString("base64")).encrypt("x".repeat(20)),
      updatedBy: null,
      updatedByEmail: null,
      updatedAt: new Date(),
    });
    jest.spyOn(console, "error").mockImplementation(() => {});

    expect(await service({ DISCOGS_TOKEN: "env-token-1234567" }).get("discogsToken")).toBe(
      "env-token-1234567",
    );
  });

  it("should notify listeners after a change", async () => {
    const settings = service();
    const listener = jest.fn();
    settings.onChange(listener);

    await settings.update({ "shop.name": "Ras Bass" }, 2);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should coerce the fallback rate from the environment", async () => {
    expect(await service({ EUR_PLN_FALLBACK_RATE: "4.31" }).get("eurPlnFallbackRate")).toBe(4.31);
  });

  describe("SettingsIntegrationProvider", () => {
    it("should be unavailable without keys or when disabled", async () => {
      const settings = service();

      expect(await new SettingsIntegrationProvider(settings).getDiscogs()).toBeNull();
      expect(await new SettingsIntegrationProvider(settings).getLabelReader()).toBeNull();

      await settings.update({ "discogs.token": "discogs-token-123" }, 2);

      expect(await new SettingsIntegrationProvider(settings).getDiscogs()).not.toBeNull();
      expect(
        await new SettingsIntegrationProvider(settings, { enabled: false }).getDiscogs(),
      ).toBeNull();
    });

    it("should build a new client after the key changes", async () => {
      const settings = service();
      const provider = new SettingsIntegrationProvider(settings);

      await settings.update({ "discogs.token": "discogs-token-123" }, 2);
      const first = await provider.getDiscogs();
      const same = await provider.getDiscogs();

      await settings.update({ "discogs.token": "discogs-token-456" }, 2);
      const second = await provider.getDiscogs();

      expect(same).toBe(first);
      expect(second).not.toBe(first);
    });

    it("should report a missing key in the connection test", async () => {
      const provider = new SettingsIntegrationProvider(service());

      expect(await provider.testClaude()).toEqual({
        ok: false,
        message: "Claude API key is not set",
      });
      expect(await provider.testDiscogs()).toEqual({
        ok: false,
        message: "Discogs token is not set",
      });
    });
  });
});
