export interface Cache<T> {
  get(key: string): T | null;

  set(key: string, value: T, ttlSeconds: number): void;

  delete(key: string): void;

  clear(): void;
}