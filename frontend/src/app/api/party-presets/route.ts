import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { SubscriptionTier } from '@/generated/prisma';
import { randomPartyPresetCode } from '@/lib/party-preset-code';
import { createPartyPresetBodySchema } from '@/lib/party-preset-schema';
import { validateRoleOverridesInput } from '@/lib/role-image-storage';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  }

  const presets = await prisma.partyConfigPreset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      publicCode: true,
      name: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ presets });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const parsed = createPartyPresetBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, composition, roleImageOverrides: rawImg } = parsed.data;

  let roleImageOverrides: object | undefined;
  if (rawImg != null) {
    const nonEmpty = Object.entries(rawImg).filter(([, v]) => {
      if (v == null) return false;
      if (typeof v === 'string') return v.trim() !== '';
      if (typeof v === 'object' && v !== null && 'data' in v) {
        return String((v as { data: string }).data).trim() !== '';
      }
      return false;
    });
    if (nonEmpty.length > 0) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { tier: true },
      });
      if (user?.tier !== SubscriptionTier.PREMIUM) {
        return NextResponse.json(
          { error: 'Images personnalisées réservées au compte Premium.' },
          { status: 403 }
        );
      }
      const checked = validateRoleOverridesInput(rawImg);
      if ('error' in checked) {
        return NextResponse.json({ error: checked.error }, { status: 400 });
      }
      roleImageOverrides = checked;
    }
  }

  for (let attempt = 0; attempt < 16; attempt++) {
    const publicCode = randomPartyPresetCode();
    try {
      const row = await prisma.partyConfigPreset.create({
        data: {
          publicCode,
          name: name ?? null,
          userId: session.user.id,
          composition: composition as object,
          ...(roleImageOverrides !== undefined
            ? { roleImageOverrides }
            : {}),
        },
        select: { id: true, publicCode: true },
      });
      return NextResponse.json({
        id: row.id,
        publicCode: row.publicCode,
      });
    } catch {
      /* collision rare sur publicCode */
    }
  }

  return NextResponse.json({ error: 'Réessaie dans un instant' }, { status: 503 });
}
