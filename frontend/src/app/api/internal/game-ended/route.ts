import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { verifyInternalRequest, internalAuthUnauthorized } from '@/lib/internal-auth';
import { levelFromXp, xpAwardForGame } from '@/lib/xp';

const participantSchema = z.object({
  discordUserId: z.string().min(1),
  roleKey: z.string().min(1),
  alive: z.boolean(),
  won: z.boolean(),
});

const bodySchema = z.object({
  guildId: z.string().min(1),
  channelId: z.string().optional(),
  endedAt: z.string().min(1),
  win: z.enum(['wolves', 'village', 'lovers']),
  participants: z.array(participantSchema).min(1),
});

export async function POST(req: Request) {
  if (!verifyInternalRequest(req)) return internalAuthUnauthorized();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { guildId, channelId, endedAt, participants } = parsed.data;
  const ended = new Date(endedAt);
  if (Number.isNaN(ended.getTime())) {
    return NextResponse.json({ error: 'endedAt invalide' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const userXpUpdates = new Map<string, number>();

      for (const p of participants) {
        const xpAwarded = xpAwardForGame(p.won);
        const linked = await tx.user.findUnique({
          where: { discordId: p.discordUserId },
          select: { id: true, xp: true },
        });

        await tx.gameParticipation.create({
          data: {
            discordUserId: p.discordUserId,
            guildId,
            channelId: channelId ?? null,
            endedAt: ended,
            roleKey: p.roleKey,
            won: p.won,
            alive: p.alive,
            xpAwarded,
            userId: linked?.id ?? null,
          },
        });

        if (linked) {
          const prev = userXpUpdates.get(linked.id) ?? linked.xp;
          userXpUpdates.set(linked.id, prev + xpAwarded);
        }
      }

      for (const [userId, newXp] of userXpUpdates) {
        await tx.user.update({
          where: { id: userId },
          data: {
            xp: newXp,
            level: levelFromXp(newXp),
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[internal/game-ended]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
