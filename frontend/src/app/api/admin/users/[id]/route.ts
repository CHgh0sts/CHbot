import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-server';
import { SiteRole, SubscriptionTier } from '@/generated/prisma';

const patchSchema = z.object({
  siteRole: z.nativeEnum(SiteRole).optional(),
  tier: z.nativeEnum(SubscriptionTier).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 });
  }

  const { id } = await ctx.params;
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

  if (parsed.data.siteRole === undefined && parsed.data.tier === undefined) {
    return NextResponse.json({ error: 'Rien à mettre à jour' }, { status: 400 });
  }

  if (id === session.user.id && parsed.data.siteRole === SiteRole.USER) {
    return NextResponse.json(
      { error: 'Tu ne peux pas te retirer le rôle admin toi-même' },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.siteRole !== undefined && {
          siteRole: parsed.data.siteRole,
        }),
        ...(parsed.data.tier !== undefined && { tier: parsed.data.tier }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        discordId: true,
        siteRole: true,
        tier: true,
        xp: true,
        level: true,
      },
    });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }
}
