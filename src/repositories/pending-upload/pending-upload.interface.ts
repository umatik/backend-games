import type { PoolClient } from "pg";

/** Jak długo zdjęcie labela czeka na podpięcie do wariantu; potem nie da się go użyć i jest usuwane. */
export const PENDING_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

export type PendingUpload = {
  id: string;
  path: string;
  contentType: string;
  createdBy: number | null;
  createdAt: Date;
};

export interface PendingUploadRepository {
  create(
    client: PoolClient,
    data: { id: string; path: string; contentType: string; createdBy: number | null },
  ): Promise<void>;

  /**
   * Zabiera oczekujące zdjęcia (usuwa je z tabeli) i zwraca je w kolejności podanych `ids`.
   * Zwraca tylko te, które istnieją i nie są starsze niż `maxAgeMs`; wywołujący sprawdza, czy są wszystkie.
   * Starszych nie rusza, usunie je sprzątanie razem z plikami.
   */
  claim(client: PoolClient, ids: string[], maxAgeMs: number): Promise<PendingUpload[]>;

  /** Usuwa zdjęcia starsze niż `olderThan` i zwraca je, żeby skasować pliki. */
  deleteExpired(client: PoolClient, olderThan: Date): Promise<PendingUpload[]>;
}
