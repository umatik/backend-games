import { AppError } from "./app.error.js";

/**
 * Opublikowany produkt musi mieć co najmniej jeden wariant, tak jak przy publikacji (audyt 2026-11-08, R3).
 * Ostatni wariant usuwa się razem z produktem albo po wycofaniu publikacji.
 */
export class LastPublishedVariantError extends AppError {
  constructor() {
    super(
      "The last variant of a published product cannot be deleted. Unpublish or delete the product instead.",
      409,
    );
    this.name = "LastPublishedVariantError";
  }
}
