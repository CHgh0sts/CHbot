import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-server';
import { BOT_ROLE_KEYS } from '@/lib/role-keys';
import {
  MAX_BASE64_CHARS,
  type RoleImageStored,
} from '@/lib/role-image-storage';

const storedSchema = z.object({
  mime: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  data: z.string().min(1).max(MAX_BASE64_CHARS),
});

const putSchema = z.object({
  defaults: z.record(z.string(), z.union([z.null(), storedSchema])),
});

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 });
  }

  const rows = await prisma.roleCardDefault.findMany();
  const defaults: Record<string, RoleImageStored> = {};
  for (const r of rows) {
    if (r.imageBase64?.trim()) {
      defaults[r.roleKey] = {
        mime: (r.mimeType || 'image/png') as RoleImageStored['mime'],
        data: r.imageBase64.trim(),
      };
    }
  }
  return NextResponse.json({ defaults });
}

export async function PUT(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { defaults } = parsed.data;
  const allowed = new Set<string>(BOT_ROLE_KEYS);

  for (const [key, payload] of Object.entries(defaults)) {
    if (!allowed.has(key)) {
      return NextResponse.json(
        { error: `Clé de rôle inconnue : ${key}` },
        { status: 400 }
      );
    }
    if (payload === null) {
      await prisma.roleCardDefault.deleteMany({ where: { roleKey: key } });
      continue;
    }
    await prisma.roleCardDefault.upsert({
      where: { roleKey: key },
      create: {
        roleKey: key,
        mimeType: payload.mime,
        imageBase64: payload.data.replace(/\s/g, ''),
      },
      update: {
        mimeType: payload.mime,
        imageBase64: payload.data.replace(/\s/g, ''),
      },
    });
  }

  const rows = await prisma.roleCardDefault.findMany();
  const map: Record<string, RoleImageStored> = {};
  for (const r of rows) {
    if (r.imageBase64?.trim()) {
      map[r.roleKey] = {
        mime: (r.mimeType || 'image/png') as RoleImageStored['mime'],
        data: r.imageBase64.trim(),
      };
    }
  }
  return NextResponse.json({ defaults: map });
}
