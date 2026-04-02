import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  verifyInternalRequest,
  internalAuthUnauthorized,
} from '@/lib/internal-auth';
import { normalizePresetCodeInput } from '@/lib/party-preset-code';

export async function GET(req: Request) {
  if (!verifyInternalRequest(req)) return internalAuthUnauthorized();

  const { searchParams } = new URL(req.url);
  const code = normalizePresetCodeInput(searchParams.get('code') ?? '');
  if (!code) {
    return NextResponse.json({ error: 'code invalide' }, { status: 400 });
  }

  const preset = await prisma.partyConfigPreset.findUnique({
    where: { publicCode: code },
    select: { name: true, composition: true },
  });

  if (!preset) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  }

  return NextResponse.json({
    name: preset.name,
    composition: preset.composition,
  });
}
