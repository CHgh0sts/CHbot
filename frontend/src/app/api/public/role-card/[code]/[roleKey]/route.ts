import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePresetCodeInput } from '@/lib/party-preset-code';
import { isBotRoleKey } from '@/lib/role-keys';
import { SubscriptionTier } from '@/generated/prisma';
import {
  readRoleOverridesFromDb,
  resolveStoredRoleImageValue,
} from '@/lib/role-image-storage';

/**
 * Image publique pour les embeds Discord : corps binaire ou redirection 302 (URL legacy).
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ code: string; roleKey: string }> }
) {
  const { code: rawCode, roleKey: rawRole } = await context.params;
  const code = normalizePresetCodeInput(rawCode ?? '');
  if (!code) {
    return NextResponse.json({ error: 'code invalide' }, { status: 400 });
  }

  const roleKey = decodeURIComponent(rawRole ?? '')
    .trim()
    .toUpperCase();
  if (!isBotRoleKey(roleKey)) {
    return NextResponse.json({ error: 'rôle invalide' }, { status: 400 });
  }

  const preset = await prisma.partyConfigPreset.findUnique({
    where: { publicCode: code },
    select: {
      roleImageOverrides: true,
      userId: true,
      user: { select: { tier: true } },
    },
  });

  if (!preset) {
    return NextResponse.json({ error: 'preset introuvable' }, { status: 404 });
  }

  const premium = preset.user?.tier === SubscriptionTier.PREMIUM;
  const overrides = readRoleOverridesFromDb(preset.roleImageOverrides);

  let resolved = null as ReturnType<typeof resolveStoredRoleImageValue>;
  if (premium) {
    const raw = overrides[roleKey];
    if (raw !== undefined) {
      resolved = resolveStoredRoleImageValue(raw);
    }
  }

  if (!resolved) {
    const row = await prisma.roleCardDefault.findUnique({
      where: { roleKey },
    });
    if (row?.imageBase64?.trim()) {
      try {
        const buf = Buffer.from(row.imageBase64.trim(), 'base64');
        if (buf.length > 0) {
          resolved = {
            kind: 'bytes' as const,
            mime: row.mimeType || 'image/png',
            buffer: buf,
          };
        }
      } catch {
        resolved = null;
      }
    }
  }

  if (!resolved) {
    return NextResponse.json({ error: 'aucune image' }, { status: 404 });
  }

  if (resolved.kind === 'url') {
    return NextResponse.redirect(resolved.url, 302);
  }

  return new NextResponse(new Uint8Array(resolved.buffer), {
    status: 200,
    headers: {
      'Content-Type': resolved.mime,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
