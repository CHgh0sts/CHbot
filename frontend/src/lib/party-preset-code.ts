import { randomInt } from 'node:crypto';

/** 32 caractères sans 0/O/1/I pour lisibilité */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function randomPartyPresetCode(): string {
  let s = '';
  for (let i = 0; i < 5; i++) {
    s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]!;
  }
  return s;
}

export function normalizePresetCodeInput(raw: string): string | null {
  const u = raw.trim().toUpperCase().replace(/[^A-Z2-9]/g, '');
  if (u.length !== 5) return null;
  return u;
}
