import type { AudioFile, AudioProcessor } from "./audio-processor.interface.js";

/** Atrapa: zapisuje nagranie bez zmian. Do podmiany na implementację z ffmpeg (etap audio). */
export class PassThroughAudioProcessor implements AudioProcessor {
  async process(file: AudioFile): Promise<AudioFile> {
    return file;
  }
}
