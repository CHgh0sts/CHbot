const MAX_URL_LEN = 2048;

/** URLs autorisées pour les cartes (évite file:// et localhost) — format legacy. */
export function isAllowedRoleImageUrl(raw: string): boolean {
  if (!raw || raw.length > MAX_URL_LEN) return false;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h.endsWith('.local')
  ) {
    return false;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const parts = h.split('.').map((x) => Number.parseInt(x, 10));
    if (parts[0] === 10) return false;
    if (parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31) return false;
    if (parts[0] === 192 && parts[1] === 168) return false;
    if (parts[0] === 127) return false;
  }
  return true;
}
