import { promises as fs } from "node:fs";
import path from "node:path";

import type { Storage } from "@/storage/storage.interface.js";

export class LocalStorage implements Storage {
  constructor(
    private readonly basePath = process.env.STORAGE_PATH ?? "./uploads",
  ) {}

  async save(
    file: Buffer,
    filename: string,
    contentType: string,
  ): Promise<string> {
    const filePath = path.join(this.basePath, filename);

    await fs.mkdir(path.dirname(filePath), {
      recursive: true,
    });

    await fs.writeFile(filePath, file);

    return filename;
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);

    await fs.rm(fullPath, {
      force: true,
    });
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, filePath);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
