export interface Storage {
  save(file: Buffer, filename: string, contentType: string): Promise<string>;

  delete(path: string): Promise<void>;

  exists(path: string): Promise<boolean>;
}
