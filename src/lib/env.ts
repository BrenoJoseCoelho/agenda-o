// Centralizes environment access. Required vars are validated once with clear
// errors; optional integrations expose a boolean so callers can degrade
// gracefully (log/demo mode) instead of crashing when a key is missing.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variavel de ambiente obrigatoria ausente: ${name}. ` +
        `Defina no .env (veja .env.example) antes de subir a aplicacao.`
    );
  }
  return value;
}

// Public URL, no trailing slash. Falls back to localhost in dev.
export function appUrl(): string {
  const value = process.env.APP_URL || "http://localhost:3000";
  return value.replace(/\/$/, "");
}

// Integrations that work in demo mode when unset.
export const integrations = {
  anthropic: () => Boolean(process.env.ANTHROPIC_API_KEY),
  transcription: () => Boolean(process.env.OPENAI_API_KEY),
  google: () =>
    Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  d360: () =>
    Boolean(process.env.D360_PARTNER_ID && process.env.D360_PARTNER_API_TOKEN),
  whatsappSignature: () => Boolean(process.env.WHATSAPP_APP_SECRET),
};

// Fails fast at startup if a hard dependency is missing. Call from a server
// entrypoint (e.g. instrumentation) to surface misconfig before serving traffic.
export function assertRequiredEnv(): void {
  required("DATABASE_URL");
  required("AUTH_SECRET");
}
