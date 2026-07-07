import { assertRequiredEnv } from "@/lib/env";

// Runs once when the server boots. Fails fast with a clear message if a
// required env var is missing, instead of erroring on the first request.
export function register() {
  assertRequiredEnv();
}
