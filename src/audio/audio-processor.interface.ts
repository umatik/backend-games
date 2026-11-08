export type AudioFile = {
  buffer: Buffer;
  /** Rozszerzenie pliku bez kropki, np. `mp3`. */
  extension: string;
  contentType: string;
};

/**
 * Obróbka wgrywanych nagrań (docelowo: ffmpeg → MP3 128 kbps, fragment 30–60 s, wyciszenia, wyrównanie głośności).
 * Implementację wybiera `dependency-injection.ts`.
 */
export interface AudioProcessor {
  process(file: AudioFile): Promise<AudioFile>;
}
