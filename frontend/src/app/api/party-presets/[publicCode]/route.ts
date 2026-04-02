import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Prisma, SubscriptionTier } from '@/generated/prisma';
import { normalizePresetCodeInput } from '@/lib/party-preset-code';
import { patchPartyPresetImagesSchema } from '@/lib/party-preset-schema';
import {
  readRoleOverridesFromDb,
  validateRoleOverridesInput,
} from '@/lib/role-image-storage';

type RouteCtx = { params: Promise<{ publicCode: string }> };

export async function GET(_req: Request, context: RouteCtx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  }

  const { publicCode: raw } = await context.params;
  const code = normalizePresetCodeInput(raw ?? '');
  if (!code) {
    return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
  }

  const preset = await prisma.partyConfigPreset.findFirst({
    where: { publicCode: code, userId: session.user.id },
    select: {
      publicCode: true,
      name: true,
      composition: true,
      roleImageOverrides: true,
    },
  });

  if (!preset) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  }

  return NextResponse.json({
    publicCode: preset.publicCode,
    name: preset.name,
    composition: preset.composition,
    roleImageOverrides: readRoleOverridesFromDb(preset.roleImageOverrides),
  });
}

export async function PATCH(req: Request, context: RouteCtx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  }

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

  const { publicCode: raw } = await context.params;
  const code = normalizePresetCodeInput(raw ?? '');
  if (!code) {
    return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const parsed = patchPartyPresetImagesSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const checked = validateRoleOverridesInput(parsed.data.roleImageOverrides);
  if ('error' in checked) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }

  const existing = await prisma.partyConfigPreset.findFirst({
    where: { publicCode: code, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  }

  await prisma.partyConfigPreset.update({
    where: { id: existing.id },
    data: {
      roleImageOverrides:
        Object.keys(checked).length > 0 ? checked : Prisma.JsonNull,
    },
  });

  return NextResponse.json({
    roleImageOverrides: checked,
  });
}
