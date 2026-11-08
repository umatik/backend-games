import type { Database } from "@/database/database.interface.js";
import type {
  SettingRow,
  SettingsRepository,
} from "@/repositories/settings/settings.interface.js";
import {
  allSettingDefinitions,
  findSettingDefinition,
  settingDefinitions,
  type SettingDefinition,
  type SettingName,
  type SettingValue,
} from "@/settings/definitions.js";
import type { SecretCipher } from "@/settings/secret-cipher.js";
import { ValidationError } from "@/errors/validation.error.js";
import { AppError } from "@/errors/app.error.js";
import { formatZodIssues, type ValidationIssue } from "@/validators/helpers/zod.js";

export type SettingSource = "database" | "environment" | "default";

/** Ustawienie widziane przez panel admina. Sekret nigdy nie wraca w całości, tylko jako `maskedValue`. */
export type SettingView = {
  key: string;
  group: SettingDefinition["group"];
  kind: SettingDefinition["kind"];
  description: string;
  options?: readonly string[];
  isSet: boolean;
  source: SettingSource | null;
  value?: unknown;
  maskedValue?: string;
  updatedAt: Date | null;
  updatedBy: string | null;
};

type Resolved = { value: unknown; source: SettingSource } | null;

/** Po tym czasie ustawienia są czytane z bazy ponownie (zmiany z innej instancji serwera). */
const CACHE_TTL_MS = 60_000;

export const maskSecret = (secret: string): string =>
  secret.length >= 16 ? `${secret.slice(0, 6)}…${secret.slice(-4)}` : "••••";

export class SettingsService {
  private rows: Map<string, SettingRow> | null = null;
  private loadedAt = 0;
  private readonly listeners: (() => void)[] = [];

  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly pool: Database,
    private readonly cipher: SecretCipher | null,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  /** Wywoływane po każdej zmianie ustawień, np. żeby integracje utworzyły klientów z nowym kluczem. */
  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  async get<Name extends SettingName>(
    name: Name,
  ): Promise<SettingValue<Name> | undefined> {
    const resolved = this.resolve(settingDefinitions[name], await this.loadRows());

    return resolved?.value as SettingValue<Name> | undefined;
  }

  async list(): Promise<SettingView[]> {
    const rows = await this.loadRows();

    return allSettingDefinitions.map((definition) => {
      const row = rows.get(definition.key);
      const resolved = this.resolve(definition, rows);
      const fromDatabase = resolved?.source === "database";

      const view: SettingView = {
        key: definition.key,
        group: definition.group,
        kind: definition.kind,
        description: definition.description,
        ...(definition.options && { options: definition.options }),
        isSet: resolved !== null,
        source: resolved?.source ?? null,
        updatedAt: fromDatabase && row ? row.updatedAt : null,
        updatedBy: fromDatabase && row ? row.updatedByEmail : null,
      };

      if (resolved !== null) {
        if (definition.kind === "secret") {
          view.maskedValue = maskSecret(String(resolved.value));
        } else {
          view.value = resolved.value;
        }
      }

      return view;
    });
  }

  /**
   * Zapisuje zmiany atomowo: albo wszystkie, albo żadna. `null` usuwa wartość z bazy, więc ustawienie
   * wraca do zmiennej środowiskowej albo wartości domyślnej.
   */
  async update(values: Record<string, unknown>, userId: number): Promise<SettingView[]> {
    const issues: ValidationIssue[] = [];
    const writes: { definition: SettingDefinition; value: unknown }[] = [];

    for (const [key, raw] of Object.entries(values)) {
      const definition = findSettingDefinition(key);

      if (!definition) {
        issues.push({ path: key, message: "Unknown setting" });
        continue;
      }

      if (raw === null) {
        writes.push({ definition, value: null });
        continue;
      }

      const parsed = definition.schema.safeParse(raw);

      if (!parsed.success) {
        issues.push(
          ...formatZodIssues(parsed.error).map((issue) => ({
            path: issue.path ? `${key}.${issue.path}` : key,
            message: issue.message,
          })),
        );
        continue;
      }

      writes.push({ definition, value: parsed.data });
    }

    if (issues.length > 0) {
      throw new ValidationError("Invalid settings", issues);
    }

    const needsCipher = writes.some(
      ({ definition, value }) => definition.kind === "secret" && value !== null,
    );

    if (needsCipher && !this.cipher) {
      throw new AppError(
        "Secrets cannot be saved: SETTINGS_ENCRYPTION_KEY is not configured",
        503,
      );
    }

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      for (const { definition, value } of writes) {
        if (value === null) {
          await this.settingsRepository.delete(client, definition.key);
        } else if (definition.kind === "secret") {
          await this.settingsRepository.upsert(
            client,
            { key: definition.key, encryptedValue: this.cipher!.encrypt(String(value)) },
            userId,
          );
        } else {
          await this.settingsRepository.upsert(client, { key: definition.key, value }, userId);
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    this.rows = null;

    for (const listener of this.listeners) {
      listener();
    }

    return this.list();
  }

  private async loadRows(): Promise<Map<string, SettingRow>> {
    if (this.rows && Date.now() - this.loadedAt < CACHE_TTL_MS) {
      return this.rows;
    }

    const client = await this.pool.connect();

    try {
      const rows = await this.settingsRepository.findAll(client);

      this.rows = new Map(rows.map((row) => [row.key, row]));
      this.loadedAt = Date.now();

      return this.rows;
    } finally {
      client.release();
    }
  }

  private resolve(
    definition: SettingDefinition,
    rows: Map<string, SettingRow>,
  ): Resolved {
    const row = rows.get(definition.key);
    const fromDatabase = row ? this.readRow(definition, row) : undefined;

    if (fromDatabase !== undefined) {
      return { value: fromDatabase, source: "database" };
    }

    const envValue = definition.env ? this.env[definition.env] : undefined;

    if (envValue !== undefined && envValue !== "") {
      const parsed = definition.schema.safeParse(envValue);

      if (parsed.success) {
        return { value: parsed.data, source: "environment" };
      }
    }

    if (definition.defaultValue !== undefined) {
      return { value: definition.defaultValue, source: "default" };
    }

    return null;
  }

  private readRow(definition: SettingDefinition, row: SettingRow): unknown {
    let raw: unknown = row.value;

    if (row.encryptedValue !== null) {
      if (!this.cipher) {
        return undefined;
      }

      try {
        raw = this.cipher.decrypt(row.encryptedValue);
      } catch (error) {
        console.error(`Cannot decrypt setting "${definition.key}":`, error);
        return undefined;
      }
    }

    const parsed = definition.schema.safeParse(raw);

    return parsed.success ? parsed.data : undefined;
  }
}
