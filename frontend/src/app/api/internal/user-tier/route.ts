import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyInternalRequest, internalAuthUnauthorized } from '@/lib/internal-auth';

export async function GET(req: Request) {
  if (!verifyInternalRequest(req)) return internalAuthUnauthorized();

  const { searchParams } = new URL(req.url);
  const discordId = searchParams.get('discordId')?.trim();
  if (!discordId) {
    return NextResponse.json({ error: 'discordId requis' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { discordId },
    select: { tier: true, siteRole: true },
  });

  if (!user) {
    return NextResponse.json({
      tier: 'FREE',
      siteRole: 'USER',
      knownUser: false,
    });
  }

  return NextResponse.json({
    tier: user.tier,
    siteRole: user.siteRole,
    knownUser: true,
  });
}
