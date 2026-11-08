import { rm } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

/**
 * Raz przed całym uruchomieniem testów czyści katalog plików testowych, żeby wgrane w testach zdjęcia
 * nie zbierały się między uruchomieniami. Pliki z ostatniego uruchomienia zostają do podejrzenia.
 *
 * Katalog musi być inny niż katalog deweloperski: inaczej testy zostawiają pliki obok prawdziwych
 * i nic nie jest usuwane.
 */
export default async function globalSetup() {
  const { parsed } = dotenv.config({ path: ".env.test", quiet: true, processEnv: {} });
  const storagePath = parsed?.STORAGE_PATH;

  if (!storagePath) {
    return;
  }

  const testDir = path.resolve(storagePath);

  if (testDir === path.resolve("uploads") || testDir === process.cwd()) {
    console.warn(
      `STORAGE_PATH in .env.test points to ${storagePath}; set a separate folder (e.g. ./uploads-test) so tests can clean up their files.`,
    );
    return;
  }

  await rm(testDir, { recursive: true, force: true });
}
