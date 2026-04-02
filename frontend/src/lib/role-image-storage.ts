import type { BotRoleKey } from '@/lib/role-keys';
import { isBotRoleKey } from '@/lib/role-keys';
import { isAllowedRoleImageUrl } from '@/lib/role-image-url';

/** Image stockée en JSON ou en colonne Prisma : base64 + type MIME. */
export type RoleImageStored = {
  mime: RoleImageMime;
  data: string;
};

export const ROLE_IMAGE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export type RoleImageMime = (typeof ROLE_IMAGE_MIMES)[number];

const MAX_IMAGE_BYTES = 1_500_000;
/** ~ ceil(1.5MB * 4/3) + marge */
export const MAX_BASE64_CHARS = 2_200_000;

export type ResolvedRoleImage =
  | { kind: 'bytes'; mime: string; buffer: Buffer }
  | { kind: 'url'; url: string };

function isRoleImageMime(s: string): s is RoleImageMime {
  return (ROLE_IMAGE_MIMES as readonly string[]).includes(s);
}

function decodeBase64Image(
  mime: string,
  b64: string
): { ok: true; buffer: Buffer } | { ok: false; error: string } {
  const trimmed = b64.replace(/\s/g, '');
  if (trimmed.length > MAX_BASE64_CHARS) {
    return { ok: false, error: 'Image trop volumineuse (base64)' };
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(trimmed, 'base64');
  } catch {
    return { ok: false, error: 'Base64 invalide' };
  }
  if (buf.length === 0) {
    return { ok: false, error: 'Image vide' };
  }
  if (buf.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: `Image trop lourde (max ${MAX_IMAGE_BYTES / 1024 / 1024} Mo)` };
  }
  if (!isRoleImageMime(mime)) {
    return { ok: false, error: 'Type MIME non autorisé' };
  }
  return { ok: true, buffer: buf };
}

/** Parse `data:image/...;base64,...` depuis un FileReader. */
export function parseDataUrlToStored(dataUrl: string): RoleImageStored | { error: string } {
  const m = dataUrl.trim().match(/^data:([^;]+);base64,([\s\S]+)$/i);
  if (!m) return { error: 'Format data URL invalide' };
  const mime = m[1]!.trim().toLowerCase();
  const data = m[2]!.trim();
  const dec = decodeBase64Image(mime, data);
  if (!dec.ok) return { error: dec.error };
  if (!isRoleImageMime(mime)) {
    return { error: 'Format d’image non autorisé (PNG, JPEG, WebP, GIF)' };
  }
  return { mime, data: data.replace(/\s/g, '') };
}

function parseStoredObject(raw: unknown): RoleImageStored | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const mime = o.mime;
  const data = o.data;
  if (typeof mime !== 'string' || typeof data !== 'string') return null;
  const dec = decodeBase64Image(mime.trim().toLowerCase(), data);
  if (!dec.ok) return null;
  if (!isRoleImageMime(mime.trim().toLowerCase())) return null;
  return {
    mime: mime.trim().toLowerCase() as RoleImageMime,
    data: data.replace(/\s/g, ''),
  };
}

/** Résout une valeur JSON DB vers bytes ou URL (embed Discord / route publique). */
export function resolveStoredRoleImageValue(
  raw: unknown
): ResolvedRoleImage | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    if (t.startsWith('https://') && isAllowedRoleImageUrl(t)) {
      return { kind: 'url', url: t };
    }
    if (t.startsWith('data:')) {
      const p = parseDataUrlToStored(t);
      if ('error' in p) return null;
      const dec = decodeBase64Image(p.mime, p.data);
      if (!dec.ok) return null;
      return { kind: 'bytes', mime: p.mime, buffer: dec.buffer };
    }
    return null;
  }
  const obj = parseStoredObject(raw);
  if (!obj) return null;
  const dec = decodeBase64Image(obj.mime, obj.data);
  if (!dec.ok) return null;
  return { kind: 'bytes', mime: obj.mime, buffer: dec.buffer };
}

/** Filtre JSON Prisma → uniquement entrées exploitables (URL ou objet base64 valide). */
export function readRoleOverridesFromDb(
  raw: unknown
): Record<string, string | RoleImageStored> {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string | RoleImageStored> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isBotRoleKey(k)) continue;
    if (typeof v === 'string') {
      const t = v.trim();
      if (!t) continue;
      if (t.startsWith('https://') && isAllowedRoleImageUrl(t)) {
        out[k] = t;
        continue;
      }
    }
    const obj = parseStoredObject(v);
    if (obj) out[k] = obj;
  }
  return out;
}

export function validateRoleOverridesInput(
  raw: unknown
): Record<BotRoleKey, string | RoleImageStored> | { error: string } {
  if (raw == null) return {} as Record<BotRoleKey, string | RoleImageStored>;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'Format invalide' };
  }
  const out: Partial<Record<BotRoleKey, string | RoleImageStored>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isBotRoleKey(k)) {
      return { error: `Clé de rôle inconnue : ${k}` };
    }
    if (v === null) continue;
    if (v === undefined) continue;
    if (typeof v === 'string') {
      const t = v.trim();
      if (!t) continue;
      if (!isAllowedRoleImageUrl(t)) {
        return { error: `URL HTTPS non autorisée pour ${k}` };
      }
      out[k] = t;
      continue;
    }
    if (typeof v !== 'object' || Array.isArray(v)) {
      return { error: `Image invalide pour ${k}` };
    }
    const o = v as Record<string, unknown>;
    const mime = o.mime;
    const data = o.data;
    if (typeof mime !== 'string' || typeof data !== 'string') {
      return { error: `Image invalide pour ${k}` };
    }
    const dec = decodeBase64Image(mime.trim().toLowerCase(), data);
    if (!dec.ok) {
      return { error: `${dec.error} (${k})` };
    }
    if (!isRoleImageMime(mime.trim().toLowerCase())) {
      return { error: `Type MIME non autorisé pour ${k}` };
    }
    out[k] = {
      mime: mime.trim().toLowerCase() as RoleImageMime,
      data: data.replace(/\s/g, ''),
    };
  }
  return out as Record<BotRoleKey, string | RoleImageStored>;
}
