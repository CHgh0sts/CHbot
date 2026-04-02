import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyInternalRequest, internalAuthUnauthorized } from '@/lib/internal-auth';

export async function GET(req: Request) {
  if (!verifyInternalRequest(req)) return internalAuthUnauthorized();

  const rules = await prisma.compositionAccessRule.findMany({
    select: { compositionKey: true, minTier: true },
  });

  const map: Record<string, string> = {};
  for (const r of rules) {
    map[r.compositionKey] = r.minTier;
  }

  return NextResponse.json({ rules: map });
}
