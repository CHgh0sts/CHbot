import type { Client, GuildTextBasedChannel } from 'discord.js';
import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { createWaiter, fulfillPending } from '../interaction/pending';
import { NIGHT_ACTION_MS } from '../config';
import type { GameSession } from './GameSession';
import { roleLabelFr } from './composition';
import {
  buildAlivePlayerSelect,
  publicEmbed,
} from '../services/MessagingService';
import {
  ensureLoversThread,
  sendComponentsToPlayerThread,
  sendInPlayerSecretThread,
} from '../services/SecretThreadService';

export function cupidPickKey(
  channelId: string,
  cupidId: string,
  step: 1 | 2 | 3
): string {
  return `${channelId}:cupid:${cupidId}:${step}`;
}

function setLoversPair(session: GameSession, first: string, second: string): void {
  const pa = session.getPlayer(first)!;
  const pb = session.getPlayer(second)!;
  pa.loverUserId = second;
  pb.loverUserId = first;
  session.loversGroup = [first, second];
}

function setLoversTriple(
  session: GameSession,
  a: string,
  b: string,
  c: string
): void {
  const pa = session.getPlayer(a)!;
  const pb = session.getPlayer(b)!;
  const pc = session.getPlayer(c)!;
  pa.loverUserId = b;
  pb.loverUserId = c;
  pc.loverUserId = a;
  session.loversGroup = [a, b, c];
}

export async function runCupidPhase(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  if (session.nightNumber !== 1 || session.cupidNightDone) return;

  const cupidId = session.cupidId();
  if (!cupidId) {
    session.cupidNightDone = true;
    return;
  }

  const triple = session.compositionConfig.tripleLoversMode;
  const needLovers = triple ? 3 : 2;

  const candidates = session.aliveIds().filter((id) => id !== cupidId);
  if (candidates.length < needLovers) {
    await textChannel.send({
      embeds: [
        publicEmbed(
          'Cupidon',
          `Pas assez de joueurs pour lier **${needLovers}** amoureux — phase ignorée.`
        ).setColor(0xe91e63),
      ],
    });
    session.cupidNightDone = true;
    return;
  }

  const embed1 = new EmbedBuilder()
    .setTitle('Cupidon — 1ère flèche')
    .setDescription(
      triple
        ? 'Choisis le **premier** membre du **ménage à trois** (ni toi, ni les suivants).'
        : 'Choisis le **premier** amoureux (ni toi, ni le second encore choisi).'
    )
    .setColor(0xe91e63);

  const menu1 = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:cupid:${cupidId}:1`,
    '1er choix…',
    candidates,
    session.labelMap(),
    new Set([cupidId])
  );

  const ok1 = await sendComponentsToPlayerThread(
    client,
    session,
    cupidId,
    embed1,
    [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu1)]
  );

  if (!ok1) {
    await textChannel.send({
      content:
        '**Cupidon** : impossible d’envoyer l’action dans le fil prévu — phase ignorée.',
    });
    session.cupidNightDone = true;
    return;
  }

  const first = await createWaiter(
    cupidPickKey(session.textChannelId, cupidId, 1),
    NIGHT_ACTION_MS
  );
  if (!first) {
    await textChannel.send({
      content: '**Cupidon** : temps écoulé — aucun couple lié.',
    });
    session.cupidNightDone = true;
    return;
  }

  const secondCandidates = candidates.filter((id) => id !== first);
  if (secondCandidates.length === 0) {
    session.cupidNightDone = true;
    return;
  }

  const embed2 = new EmbedBuilder()
    .setTitle('Cupidon — 2e flèche')
    .setDescription(
      triple
        ? 'Choisis le **second** membre du ménage (différent du premier).'
        : 'Choisis le **second** amoureux (différent du premier).'
    )
    .setColor(0xe91e63);

  const menu2 = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:cupid:${cupidId}:2`,
    '2e choix…',
    secondCandidates,
    session.labelMap(),
    new Set([cupidId, first])
  );

  const ok2 = await sendComponentsToPlayerThread(
    client,
    session,
    cupidId,
    embed2,
    [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu2)]
  );

  if (!ok2) {
    await textChannel.send({
      content: `**Cupidon** : impossible d’envoyer le 2e choix — lien incomplet.`,
    });
    session.cupidNightDone = true;
    return;
  }

  const second = await createWaiter(
    cupidPickKey(session.textChannelId, cupidId, 2),
    NIGHT_ACTION_MS
  );
  if (!second || second === first) {
    await textChannel.send({
      content: '**Cupidon** : temps écoulé ou choix invalide — aucun lien.',
    });
    session.cupidNightDone = true;
    return;
  }

  let third: string | null = null;
  if (triple) {
    const thirdCandidates = candidates.filter((id) => id !== first && id !== second);
    if (thirdCandidates.length === 0) {
      session.cupidNightDone = true;
      return;
    }

    const embed3 = new EmbedBuilder()
      .setTitle('Cupidon — 3e flèche')
      .setDescription('Choisis le **troisième** membre du ménage (différent des deux premiers).')
      .setColor(0xe91e63);

    const menu3 = buildAlivePlayerSelect(
      `lg:${session.textChannelId}:cupid:${cupidId}:3`,
      '3e choix…',
      thirdCandidates,
      session.labelMap(),
      new Set([cupidId, first, second])
    );

    const ok3 = await sendComponentsToPlayerThread(
      client,
      session,
      cupidId,
      embed3,
      [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu3)]
    );

    if (!ok3) {
      await textChannel.send({
        content: `**Cupidon** : impossible d’envoyer le 3e choix — ménage incomplet.`,
      });
      session.cupidNightDone = true;
      return;
    }

    third = await createWaiter(
      cupidPickKey(session.textChannelId, cupidId, 3),
      NIGHT_ACTION_MS
    );
    if (!third || third === first || third === second) {
      await textChannel.send({
        content: '**Cupidon** : temps écoulé ou 3e choix invalide — ménage non formé.',
      });
      session.cupidNightDone = true;
      return;
    }
    setLoversTriple(session, first, second, third);
  } else {
    setLoversPair(session, first, second);
  }

  session.cupidNightDone = true;

  const loverIds = triple && third ? [first, second, third] : [first, second];
  const loversThread = await ensureLoversThread(client, session, loverIds);

  const linesRoles = loverIds
    .map((id) => {
      const p = session.getPlayer(id);
      return `• **${p?.displayName ?? id}** — ${roleLabelFr(p!.role)}`;
    })
    .join('\n');

  if (loversThread) {
    await loversThread.send({
      content: loverIds.map((id) => `<@${id}>`).join(' '),
      embeds: [
        new EmbedBuilder()
          .setTitle(triple ? 'Fil du ménage à trois' : 'Fil des amoureux')
          .setDescription(
            `${triple ? 'Vous êtes **trois** liés' : 'Vous êtes liés'} par le **Cupidon** — **seuls vous** (et le bot) avez accès à ce fil.\n\n${linesRoles}\n\n` +
              'Si **l’un** de vous **meurt**, **tous les autres** du lien **meurent de chagrin** (sans tir de **Chasseur** pour ces morts).\n' +
              (triple
                ? 'Si vous êtes **les trois derniers survivants**, vous **gagnez ensemble**.\n'
                : 'Si vous êtes **les deux derniers vivants**, vous **gagnez ensemble**.\n')
          )
          .setColor(0xff69b4),
      ],
    });

    const pointerDesc =
      `Un **fil privé commun** avec ${triple ? 'vos partenaires' : 'ton âme sœur'} :\n${loversThread.url}\n\n_Tout y est écrit (identités + règles)._`;

    for (const id of loverIds) {
      await sendInPlayerSecretThread(client, session, id, {
        embeds: [
          new EmbedBuilder()
            .setTitle(triple ? 'Ménage à trois' : 'Amoureux')
            .setDescription(pointerDesc)
            .setColor(0xff69b4),
        ],
      });
    }
  } else {
    for (const id of loverIds) {
      const others = loverIds.filter((x) => x !== id);
      if (triple) {
        const otherLines = others
          .map((oid) => {
            const op = session.getPlayer(oid);
            return `• **${op?.displayName ?? oid}** — ${roleLabelFr(op!.role)}`;
          })
          .join('\n');
        await sendInPlayerSecretThread(client, session, id, {
          embeds: [
            new EmbedBuilder()
              .setTitle('Ménage à trois')
              .setDescription(
                `Tes partenaires :\n${otherLines}\n\nSi **l’un** meurt, les **autres** meurent de **chagrin** (sans tir Chasseur pour ces morts).\nSi vous êtes les **trois derniers**, vous gagnez **ensemble**.\n\n_(Fil commun impossible — utilisez vos fils perso.)_`
              )
              .setColor(0xff69b4),
          ],
        });
      } else {
        const oid = others[0]!;
        const op = session.getPlayer(oid)!;
        await sendInPlayerSecretThread(client, session, id, {
          embeds: [
            new EmbedBuilder()
              .setTitle('Tu es amoureux(se)')
              .setDescription(
                `Ton âme sœur est **${op.displayName}** — **${roleLabelFr(op.role)}**.\n\nSi l’un de vous meurt, l’autre **meurt de chagrin** (sans tir de Chasseur pour cette mort).\nSi vous êtes **tous les deux les derniers survivants**, vous gagnez **ensemble**.\n\n_(Fil commun impossible — utilisez vos fils perso.)_`
              )
              .setColor(0xff69b4),
          ],
        });
      }
    }
  }

  await textChannel.send({
    embeds: [
      publicEmbed(
        'Cupidon',
        loversThread
          ? (triple
              ? 'Les **trois** joueurs liés ont un **fil privé commun** (eux seuls) + un rappel dans chaque fil joueur.\n_(Le lien reste secret pour les autres.)_'
              : 'Les **deux amoureux** ont un **fil privé commun** (eux seulement) + un rappel dans chaque fil joueur.\n_(Le couple reste secret pour les autres.)_')
          : (triple
              ? 'Les **trois** joueurs liés ont été prévenus **en secret** dans leurs fils privés.\n_(Fil commun indisponible.)_'
              : 'Les **deux amoureux** ont été prévenus **en secret** dans leurs fils privés.\n_(Fil commun indisponible — personne d’autre ne connaît le couple.)_')
      ).setColor(0xe91e63),
    ],
  });
}

export function fulfillCupidPick(
  channelId: string,
  cupidId: string,
  step: 1 | 2 | 3,
  targetId: string
): boolean {
  return fulfillPending(cupidPickKey(channelId, cupidId, step), targetId);
}
