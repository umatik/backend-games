import type { PoolClient } from "pg";

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
   * Zwraca tylko te, które istnieją; wywołujący sprawdza, czy są wszystkie.
   */
  claim(client: PoolClient, ids: string[]): Promise<PendingUpload[]>;

  /** Usuwa zdjęcia starsze niż `olderThan` i zwraca je, żeby skasować pliki. */
  deleteExpired(client: PoolClient, olderThan: Date): Promise<PendingUpload[]>;
}
