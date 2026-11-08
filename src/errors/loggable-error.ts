/**
 * Bezpieczny do zapisania w logach opis błędu. Nigdy nie logujemy całego obiektu wyjątku, bo biblioteki dokładają
 * do niego dane wejściowe: parser JSON trzyma surowe body (`body`), a jego komunikat potrafi zacytować fragment
 * żądania, np. klucz API wysłany do `PATCH /settings` (audyt 2026-11-08).
 */
export type LoggableError = {
  name: string;
  message?: string;
  type?: string;
  status?: number;
  code?: string;
  stack?: string;
  cause?: LoggableError;
};

const MAX_CAUSE_DEPTH = 3;

/** Błędy parsera body (body-parser): komunikat i `body` mogą zawierać treść żądania. */
const isRequestBodyError = (error: Record<string, unknown>) =>
  "body" in error || (typeof error.type === "string" && error.type.startsWith("entity."));

const numberOrUndefined = (value: unknown) => (typeof value === "number" ? value : undefined);

const stringOrUndefined = (value: unknown) => (typeof value === "string" ? value : undefined);

/**
 * Przyczyna (`cause`, `originalError`) to zwykle wyjątek biblioteki: klienta HTTP, SDK, `fetch`. Ich komunikaty
 * i stosy potrafią zawierać dane wejściowe, np. wartość odrzuconego nagłówka z tokenem (audyt 2026-11-08, R1),
 * więc z przyczyn logujemy tylko nazwę, kod i status. Własny opis daje błąd nadrzędny (np. `ExternalServiceError`).
 */
const toLoggableCause = (error: unknown, depth: number): LoggableError => {
  if (typeof error !== "object" || error === null) {
    return { name: typeof error };
  }

  const record = error as Record<string, unknown>;
  const status = numberOrUndefined(record.status) ?? numberOrUndefined(record.statusCode);
  const code = stringOrUndefined(record.code);
  const cause = record.originalError ?? record.cause;

  return {
    name: error instanceof Error ? error.name : "UnknownError",
    ...(status !== undefined && { status }),
    ...(code !== undefined && { code }),
    ...(cause !== undefined &&
      depth < MAX_CAUSE_DEPTH && { cause: toLoggableCause(cause, depth + 1) }),
  };
};

export const toLoggableError = (error: unknown): LoggableError => {
  if (typeof error !== "object" || error === null) {
    return { name: typeof error, message: String(error) };
  }

  const record = error as Record<string, unknown>;
  const name = error instanceof Error ? error.name : "UnknownError";
  const status = numberOrUndefined(record.status) ?? numberOrUndefined(record.statusCode);

  if (isRequestBodyError(record)) {
    return {
      name,
      ...(typeof record.type === "string" && { type: record.type }),
      ...(status !== undefined && { status }),
    };
  }

  const cause = record.originalError ?? record.cause;
  const code = stringOrUndefined(record.code);
  const message = stringOrUndefined(record.message);

  return {
    name,
    ...(message !== undefined && { message }),
    ...(status !== undefined && { status }),
    ...(code !== undefined && { code }),
    // Stos tylko dla błędów serwera; przy błędach klienta (4xx) to szum.
    ...((status === undefined || status >= 500) &&
      error instanceof Error &&
      error.stack !== undefined && { stack: error.stack }),
    ...(cause !== undefined && { cause: toLoggableCause(cause, 1) }),
  };
};
