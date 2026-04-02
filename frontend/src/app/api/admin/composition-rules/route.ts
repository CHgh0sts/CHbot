import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-server';
import { SubscriptionTier } from '@/generated/prisma';
import { isCompositionKey } from '@/lib/composition-keys';

const patchSchema = z.object({
  compositionKey: z.string(),
  minTier: z.nativeEnum(SubscriptionTier),
});

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 });
  }

  const rules = await prisma.compositionAccessRule.findMany({
    orderBy: { compositionKey: 'asc' },
  });
  return NextResponse.json({ rules });
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

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!isCompositionKey(parsed.data.compositionKey)) {
    return NextResponse.json({ error: 'Clé de composition inconnue' }, { status: 400 });
  }

  const rule = await prisma.compositionAccessRule.upsert({
    where: { compositionKey: parsed.data.compositionKey },
    create: {
      compositionKey: parsed.data.compositionKey,
      minTier: parsed.data.minTier,
    },
    update: { minTier: parsed.data.minTier },
  });

  return NextResponse.json({ rule });
}
