import { statsApiBaseUrl, statsApiEnabled } from '../config';
import type { Role } from '../types';

/** Source d’image pour les embeds : URL publique du site si preset + API configurée. */
export function roleCardSource(
  presetPublicCode: string | null | undefined,
  role: Role
): { remoteImageUrl?: string } {
  const code = presetPublicCode?.trim();
  if (!code || !statsApiEnabled()) return {};
  const base = statsApiBaseUrl.replace(/\/$/, '');
  const url = `${base}/api/public/role-card/${encodeURIComponent(code)}/${encodeURIComponent(role)}`;
  return { remoteImageUrl: url };
}
