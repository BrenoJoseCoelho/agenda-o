// Pluggable speech-to-text. Claude's Messages API does not accept audio, so
// WhatsApp voice notes must be transcribed to text first, then fed to the AI.
//
// Default provider: OpenAI Whisper (set OPENAI_API_KEY). Swap providers by
// implementing transcribeAudio for another service (Deepgram, Google STT, ...).
// Without a key, transcription is unavailable and the caller falls back to
// asking the customer to send text.

export function transcriptionConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const WHISPER_MODEL = process.env.TRANSCRIPTION_MODEL || "whisper-1";

/**
 * Transcribes an audio buffer to Portuguese text. Returns null if transcription
 * is not configured or fails, so callers can degrade gracefully.
 */
export async function transcribeAudio(
  audio: ArrayBuffer,
  mimeType: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const ext = mimeType.includes("ogg")
      ? "ogg"
      : mimeType.includes("mpeg") || mimeType.includes("mp3")
        ? "mp3"
        : mimeType.includes("wav")
          ? "wav"
          : mimeType.includes("m4a") || mimeType.includes("mp4")
            ? "m4a"
            : "ogg";

    const form = new FormData();
    form.append("file", new Blob([audio], { type: mimeType }), `audio.${ext}`);
    form.append("model", WHISPER_MODEL);
    form.append("language", "pt");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      console.error(`[transcription] failed (${res.status}): ${await res.text()}`);
      return null;
    }

    const data = (await res.json()) as { text?: string };
    const text = data.text?.trim();
    return text && text.length > 0 ? text : null;
  } catch (error) {
    console.error("[transcription] error:", error);
    return null;
  }
}
