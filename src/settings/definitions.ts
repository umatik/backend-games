import { z } from "zod";

export const SETTING_GROUPS = ["shop", "integrations"] as const;

export type SettingGroup = (typeof SETTING_GROUPS)[number];

/**
 * Definicja jednego ustawienia. Nowe ustawienie = nowy wpis w `settingDefinitions`.
 *
 * Kolejność ustalania wartości: baza (panel admina) → zmienna środowiskowa `env` → `defaultValue`.
 */
export type SettingDefinition<T = unknown> = {
  key: string;
  group: SettingGroup;
  /** `secret`: zapisywany zaszyfrowany i nigdy nie zwracany przez API (tylko zamaskowany). */
  kind: "secret" | "text" | "number" | "select";
  description: string;
  schema: z.ZodType<T>;
  options?: readonly string[];
  env?: string;
  defaultValue?: T;
};

const define = <T>(definition: SettingDefinition<T>) => definition;

/**
 * Klucz lub token wysyłany w nagłówku HTTP: tylko widoczne znaki ASCII, bez spacji i znaków sterujących.
 * Znak nowej linii w tokenie sprawiał, że `fetch` odrzucał nagłówek z komunikatem zawierającym cały token
 * (audyt 2026-11-08, R1). Dotyczy też wartości z env, bo te przechodzą przez ten sam schemat.
 */
const credential = (minLength: number, maxLength: number) =>
  z
    .string()
    .trim()
    .min(minLength)
    .max(maxLength)
    .regex(/^[\x21-\x7E]+$/, "Must contain only visible ASCII characters, without spaces");

/** Tekst wysyłany w nagłówku HTTP: drukowalne ASCII, spacje dozwolone. */
const headerText = (minLength: number, maxLength: number) =>
  z
    .string()
    .trim()
    .min(minLength)
    .max(maxLength)
    .regex(/^[\x20-\x7E]+$/, "Must contain only printable ASCII characters");

export const CLAUDE_MODELS = ["claude-haiku-5-5", "claude-opus-5-5"] as const;

export const settingDefinitions = {
  shopName: define({
    key: "shop.name",
    group: "shop",
    kind: "text",
    description: "Shop name used in e-mails and on the shop pages",
    schema: z.string().trim().min(1).max(100),
    defaultValue: "Ras Bass",
  }),
  shopContactEmail: define({
    key: "shop.contactEmail",
    group: "shop",
    kind: "text",
    description: "Contact e-mail shown to customers",
    schema: z.string().trim().max(255).pipe(z.email()),
  }),
  anthropicApiKey: define({
    key: "anthropic.apiKey",
    group: "integrations",
    kind: "secret",
    description: "Claude API key (platform.claude.com), used to read label photos and translate notes",
    schema: credential(20, 500),
    env: "ANTHROPIC_API_KEY",
  }),
  claudeModel: define({
    key: "anthropic.model",
    group: "integrations",
    kind: "select",
    description: "Claude model: Haiku 5.5 is much cheaper, Opus 5.5 reads worn or hard labels better",
    schema: z.enum(CLAUDE_MODELS),
    options: CLAUDE_MODELS,
    defaultValue: "claude-haiku-5-5" as (typeof CLAUDE_MODELS)[number],
  }),
  discogsToken: define({
    key: "discogs.token",
    group: "integrations",
    kind: "secret",
    description: "Discogs personal access token (Discogs → Settings → Developers)",
    schema: credential(10, 200),
    env: "DISCOGS_TOKEN",
  }),
  discogsUserAgent: define({
    key: "discogs.userAgent",
    group: "integrations",
    kind: "text",
    description: "User-Agent sent to Discogs, e.g. RasBassShop/1.0 +https://your-shop.example",
    schema: headerText(3, 200),
    env: "DISCOGS_USER_AGENT",
    defaultValue: "RasBassShop/1.0",
  }),
  eurPlnFallbackRate: define({
    key: "exchangeRate.eurPlnFallback",
    group: "integrations",
    kind: "number",
    description: "EUR → PLN rate used when the NBP rate is not available",
    schema: z.coerce.number().positive().max(100),
    env: "EUR_PLN_FALLBACK_RATE",
  }),
} as const;

export type SettingName = keyof typeof settingDefinitions;

export type SettingValue<Name extends SettingName> = z.infer<
  (typeof settingDefinitions)[Name]["schema"]
>;

export const allSettingDefinitions: SettingDefinition[] = Object.values(
  settingDefinitions,
) as SettingDefinition[];

export const findSettingDefinition = (key: string): SettingDefinition | undefined =>
  allSettingDefinitions.find((definition) => definition.key === key);
