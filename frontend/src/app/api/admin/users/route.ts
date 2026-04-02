import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-server';

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { discordId: { contains: q } },
            { name: { contains: q, mode: 'insensitive' } },
            { id: { equals: q } },
          ],
        }
      : undefined,
    take: 50,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      discordId: true,
      siteRole: true,
      tier: true,
      xp: true,
      level: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}
