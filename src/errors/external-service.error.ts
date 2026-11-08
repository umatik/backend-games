import { AppError } from "./app.error.js";

/** Integracja (Claude, Discogs) nie jest skonfigurowana, np. brak tokenu. */
export class IntegrationNotConfiguredError extends AppError {
  constructor(service: string) {
    super(`${service} integration is not configured`, 503);
    this.name = "IntegrationNotConfiguredError";
  }
}

/** Zewnętrzna usługa nie odpowiedziała poprawnie. */
export class ExternalServiceError extends AppError {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message, 502);
    this.name = "ExternalServiceError";
  }
}
