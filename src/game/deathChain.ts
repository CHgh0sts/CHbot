import type { Client, GuildTextBasedChannel } from 'discord.js';
import { Role } from '../types';
import type { GameSession } from './GameSession';
import {
  announceHunterDeathPublic,
  announceHunterShotPublic,
  runHunterShoot,
} from './hunter';
import { announceLoverGriefPublic } from './loversAnnounce';

type QueueItem = { id: string; griefTrigger?: string };

/**
 * Résout une vague de morts : chasseur peut tirer (sauf mort par chagrin d’amour),
 * puis les amoureux du groupe (couple ou ménage à trois) meurent de chagrin.
 */
export async function expandDeathsWithHunterAndLovers(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel,
  seedIds: string[]
): Promise<string[]> {
  const queue: QueueItem[] = [...new Set(seedIds)].map((id) => ({ id }));
  const final = new Set<string>();

  while (queue.length > 0) {
    const item = queue.shift()!;
    const uid = item.id;
    if (final.has(uid)) continue;
    final.add(uid);

    const p = session.getPlayer(uid);

    if (item.griefTrigger) {
      await announceLoverGriefPublic(
        session,
        textChannel,
        item.griefTrigger,
        uid
      );
    }

    if (p?.role === Role.Hunter && p.alive && !item.griefTrigger && !session.elderCursed) {
      await announceHunterDeathPublic(session, textChannel, uid);
      const shot = await runHunterShoot(client, session, uid, textChannel);
      if (shot) {
        await announceHunterShotPublic(session, textChannel, uid, shot);
        if (!final.has(shot)) {
          queue.push({ id: shot });
        }
      }
    }

    if (item.griefTrigger) continue;

    if (session.loversGroup?.includes(uid)) {
      for (const oid of session.loversGroup) {
        if (oid === uid) continue;
        const op = session.getPlayer(oid);
        if (op?.alive && !final.has(oid)) {
          queue.push({ id: oid, griefTrigger: uid });
        }
      }
    } else {
      const loverId = p?.loverUserId;
      if (loverId && !final.has(loverId)) {
        const lp = session.getPlayer(loverId);
        if (lp?.alive) {
          queue.push({ id: loverId, griefTrigger: uid });
        }
      }
    }
  }

  return [...final];
}
