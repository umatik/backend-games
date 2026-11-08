import { AppError } from "./app.error.js";

/** Integracja (Claude, Discogs) nie jest skonfigurowana, np. brak tokenu. */
export class IntegrationNotConfiguredError extends AppError {
  constructor(service: string) {
    super(`${service} integration is not configured`, 503);
    this.name = "IntegrationNotConfiguredError";
  }
}

/**
 * Rozpoznawanie ze zdjęcia się nie udało, ale zdjęcia zostały zapisane: kreator przechodzi do formularza
 * ręcznego i nadal może podpiąć je do wariantu przez `photoUploadIds`.
 */
export class PhotoLookupError extends AppError {
  constructor(
    public readonly originalError: unknown,
    public readonly photoUploadIds: string[],
  ) {
    super(
      originalError instanceof AppError ? originalError.message : "Label lookup failed",
      originalError instanceof AppError ? originalError.statusCode : 502,
    );
    this.name = "PhotoLookupError";
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
