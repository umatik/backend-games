export interface Cache<T> {
  get(key: string): Promise<T | null>;

  set(key: string, value: T, ttlSeconds: number): Promise<void>;

  delete(key: string): Promise<void>;

  /** Unieważnia wszystkie wpisy: zmienia generację, a stare wpisy usuwa. */
  clear(): Promise<void>;

  /**
   * Aktualna generacja wpisów, zmieniana przy każdym `clear()`. Kto buduje klucz z generacji odczytanej przed
   * pobraniem danych, ten przy spóźnionym zapisie (dane sprzed unieważnienia) trafia do starej generacji,
   * której nowe odczyty już nie używają.
   */
  generation(): Promise<string>;
}
