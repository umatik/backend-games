import "@/config/env.js";

/** Katalog plików `LocalStorage`; ten sam katalog API udostępnia pod `/uploads`. */
export const uploadsPath = process.env.STORAGE_PATH ?? "./uploads";

/**
 * Adresy, z których przeglądarka może wołać API (panel admina, sklep), rozdzielone przecinkami, np.
 * `CORS_ORIGIN=http://localhost:5173,http://localhost:5174`. Bez wartości CORS przepuszcza każdy adres.
 */
export const parseCorsOrigins = (value: string | undefined): string[] | undefined => {
  const origins = (value ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin !== "");

  return origins.length > 0 ? origins : undefined;
};
