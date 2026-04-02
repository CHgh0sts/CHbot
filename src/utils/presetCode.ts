/**
 * Codes preset site : A–Z et 2–9 (pas 0/O/1/I), 5 caractères.
 * Harmonise avec `normalizePresetCodeInput` côté frontend.
 */
export function normalizeDiscordPresetCode(
  input: string | null | undefined
): string | null {
  if (input == null || !String(input).trim()) return null;
  const c = String(input)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, '');
  return c.length === 5 ? c : null;
}

/** L’utilisateur a saisi quelque chose dans « preset » mais ce n’est pas un code valide. */
export function presetFieldInvalid(input: string | null | undefined): boolean {
  if (input == null || !String(input).trim()) return false;
  return normalizeDiscordPresetCode(input) === null;
}
