import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const VERSION = "v1";

/**
 * Szyfrowanie sekretów zapisywanych w bazie (AES-256-GCM: poufność i wykrywanie modyfikacji).
 * Format: `v1:<iv>:<tag>:<szyfrogram>`, części w base64.
 */
export class SecretCipher {
  private readonly key: Buffer;

  /** @param key 32 bajty, np. z `openssl rand -base64 32` (base64) albo 64 znaki hex. */
  constructor(key: string) {
    this.key = SecretCipher.parseKey(key);
  }

  static parseKey(key: string): Buffer {
    const trimmed = key.trim();
    const buffer = /^[0-9a-f]{64}$/i.test(trimmed)
      ? Buffer.from(trimmed, "hex")
      : Buffer.from(trimmed, "base64");

    if (buffer.length !== 32) {
      throw new Error("SETTINGS_ENCRYPTION_KEY must be 32 bytes (base64 or 64 hex characters)");
    }

    return buffer;
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);

    return [VERSION, iv, cipher.getAuthTag(), encrypted]
      .map((part) => (typeof part === "string" ? part : part.toString("base64")))
      .join(":");
  }

  /** Rzuca błąd, gdy dane zmodyfikowano albo zaszyfrowano innym kluczem. */
  decrypt(payload: string): string {
    const [version, iv, tag, encrypted] = payload.split(":");

    if (version !== VERSION || !iv || !tag || encrypted === undefined) {
      throw new Error("Unsupported encrypted value format");
    }

    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}
