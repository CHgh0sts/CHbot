import { randomInt } from 'node:crypto';
import type {
  AttachmentBuilder,
  Client,
  GuildTextBasedChannel,
} from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { createWaiter, fulfillPending } from '../../interaction/pending';
import { NIGHT_ACTION_MS } from '../../config';
import { Role } from '../../types';
import type { GameSession } from '../GameSession';
import {
  roleLabelFr,
  rolePowerBlurb,
  shouldRevealDeadRoles,
} from '../composition';
import { embedWithRoleCardThumbnail } from '../roleCards';
import {
  demotePlayersToStageAudience,
  serverMuteAllOnGameStage,
} from '../../services/StageVoiceService';
import { roleCardSource } from '../../utils/roleCardRemoteUrl';
import {
  buildAlivePlayerSelect,
  publicEmbed,
} from '../../services/MessagingService';
import { formatDeathAnnounces } from '../deathAnnounce';
import { presentGameOverPanel } from '../../services/PostGameService';
import { deliverRoleToPlayer } from '../../services/RoleDeliveryService';
import {
  ensureWolfPackThread,
  sendComponentsToPlayerThread,
  sendInPlayerSecretThread,
  syncWolfPackMembership,
} from '../../services/SecretThreadService';
import { runCupidPhase } from '../cupid';
import { runRavenPhase } from '../raven';
import { runBigBadWolfPhase } from '../bigbadwolf';
import { runWhiteWolfPhase } from '../whiteWolf';
import { runPiedPiperPhase } from '../piedPiper';
import { runWildChildPhase, checkWildChildTransform } from '../wildChild';
import { runFoxPhase } from '../fox';
import { runPyromaniacPhase } from '../pyromaniac';
import { initBearTamerNeighbors, checkBearTamerGrowl } from '../bearTamer';
import { createSistersThread, createBrothersThread } from '../siblings';
import { runDocteurPhase } from '../docteur';
import { runNecromancerPhase } from '../necromancer';
import { initSectarianGroups, runSectarianPhase } from '../sectarian';
import { runInfectFatherPhase } from '../infectFather';
import { runDogWolfPhase } from '../dogWolf';
import { expandDeathsWithHunterAndLovers } from '../deathChain';
import {
  sendDawnApproaching,
  sendMeuteBeat,
  sendNightBeat,
  sendNightPrologue,
} from '../nightNarration';
import { startDayPhase } from './dayPhase';

function seerKey(channelId: string, seerId: string): string {
  return `${channelId}:seer:${seerId}`;
}

function thiefKey(channelId: string, thiefId: string): string {
  return `${channelId}:thief:${thiefId}`;
}

function guardKey(channelId: string, guardId: string): string {
  return `${channelId}:guard:${guardId}`;
}

export function littleGirlSpyKey(channelId: string): string {
  return `${channelId}:littlegirl:spy`;
}

function swapPlayerRoles(session: GameSession, a: string, b: string): void {
  const pa = session.getPlayer(a);
  const pb = session.getPlayer(b);
  if (!pa || !pb) return;
  const tmp = pa.role;
  pa.role = pb.role;
  pb.role = tmp;
}

export async function runThiefPhase(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  if (session.nightNumber !== 1 || session.thiefNightDone) return;

  const thiefId = session.thiefId();
  if (!thiefId) {
    session.thiefNightDone = true;
    return;
  }

  const targets = session.aliveIds().filter((id) => id !== thiefId);
  if (targets.length === 0) {
    session.thiefNightDone = true;
    return;
  }

  session.nightSubPhase = 'thief';

  const embed = new EmbedBuilder()
    .setTitle('Voleur — 1re nuit')
    .setDescription(
      'Choisis **un autre joueur vivant** : vous **échangez vos cartes** (rôles). Vous serez prévenus chacun dans votre fil privé.'
    )
    .setColor(0x95a5a6);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:thief:${thiefId}`,
    'Échanger avec…',
    targets,
    session.labelMap(),
    new Set([thiefId])
  );

  const ok = await sendComponentsToPlayerThread(
        client,
        session,
    thiefId,
    embed,
    [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)]
  );

  if (!ok) {
    await textChannel.send({
      content:
        '**Voleur** : impossible d’envoyer l’action dans le fil prévu — échange ignoré.',
    });
    session.thiefNightDone = true;
    return;
  }

  const picked = await createWaiter(
    thiefKey(session.textChannelId, thiefId),
    NIGHT_ACTION_MS
  );
  if (!picked) {
    await textChannel.send({
      content: '**Voleur** : temps écoulé — **aucun** échange.',
    });
    session.thiefNightDone = true;
    return;
  }

  swapPlayerRoles(session, thiefId, picked);
  await syncWolfPackMembership(client, session);

  for (const uid of [thiefId, picked]) {
    const p = session.getPlayer(uid);
    if (!p) continue;
    const roleEmbed = new EmbedBuilder()
      .setTitle('Nouveau rôle')
      .setDescription(
        `Tu es **${roleLabelFr(p.role)}**.\n\n${rolePowerBlurb(p.role)}`
      )
      .setColor(0x2b2d31);
    await deliverRoleToPlayer(
      client,
      session,
      uid,
      p.displayName,
      roleEmbed,
      p.role
    );
  }

  session.thiefNightDone = true;
}

export async function runGuardPhase(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  const guardId = session.guardId();
  if (!guardId) return;
  if (session.elderCursed) {
    await textChannel.send({ content: '**Garde** : malédiction de l\'Ancien — pouvoir désactivé.' });
    return;
  }

  session.nightSubPhase = 'guard';

  const exclude = new Set<string>([guardId]);
  if (session.guardLastProtectedId) {
    exclude.add(session.guardLastProtectedId);
  }

  const targets = session.aliveIds().filter((id) => !exclude.has(id));
  if (targets.length === 0) {
    await textChannel.send({
      content:
        '**Garde** : aucune cible valide (tous exclus) — protection impossible ce soir.',
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('Garde — Nuit')
    .setDescription(
      'Choisis un joueur à **protéger** des **loups** cette nuit (pas toi-même, ni ta dernière protection réussie).'
    )
    .setColor(0x3498db);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:guard:${guardId}`,
    'Protéger…',
    targets,
    session.labelMap(),
    new Set()
  );

  const ok = await sendComponentsToPlayerThread(
        client,
        session,
    guardId,
    embed,
    [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)]
  );

  if (!ok) {
    await textChannel.send({
      content:
        '**Garde** : impossible d’envoyer l’action dans le fil prévu — tour ignoré.',
    });
    return;
  }

  const picked = await createWaiter(
    guardKey(session.textChannelId, guardId),
    NIGHT_ACTION_MS
  );
  if (!picked) {
    await textChannel.send({
      content: '**Garde** : temps écoulé — **personne** n’est protégé ce soir.',
    });
    return;
  }

  session.guardProtectedUserId = picked;
  await sendInPlayerSecretThread(client, session, guardId, {
    embeds: [
      new EmbedBuilder()
        .setTitle('Protection')
        .setDescription(
          `Tu protèges **${session.getPlayer(picked)?.displayName ?? 'ce joueur'}** cette nuit.`
        )
        .setColor(0x3498db),
    ],
  });

  if (session.compositionConfig.announceNightProtection) {
    await textChannel.send({
      embeds: [
        publicEmbed(
          'Nuit — protection',
          'Quelqu’un a passé la nuit **à l’abri des griffes des loups** (pouvoir de protection actif).'
        ).setColor(0x3498db),
      ],
    });
  }
}

function witchSaveKey(channelId: string): string {
  return `${channelId}:witch:save`;
}

function witchKillKey(channelId: string): string {
  return `${channelId}:witch:kill`;
}

export async function runSeerPhase(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  const seerId = session.seerId();
  if (!seerId) return;
  if (session.elderCursed) {
    await textChannel.send({ content: '**Voyante** : malédiction de l\'Ancien — pouvoir désactivé.' });
    return;
  }

  session.nightSubPhase = 'seer';
  const targets = session.aliveIds().filter((id) => id !== seerId);
  if (targets.length === 0) return;

  const gossip = session.compositionConfig.gossipSeerMode;
  const embed = new EmbedBuilder()
    .setTitle('Voyante — Nuit')
    .setDescription(
      gossip
        ? 'Choisis un joueur **vivant** à observer. **Voyante bavarde** : tu vois son **rôle exact** ici (confidentiel). Dans le salon, un **rôle** ne s’affiche **que** dans les **annonces de mort** (lever du soleil, vote, chagrin, etc.), jamais pour un **vivant**.'
        : 'Choisis un joueur **vivant** à observer. Tu verras s’il appartient aux **Loups-Garous**.'
    )
    .setColor(0x9b59b6);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:seer`,
    'Observer…',
    targets,
    session.labelMap(),
    new Set([seerId])
  );

  const ok = await sendComponentsToPlayerThread(
        client,
        session,
    seerId,
    embed,
    [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)]
  );

  if (!ok) {
    await textChannel.send({
      content:
        '**Voyante** : impossible d’envoyer l’action dans le fil prévu — tour ignoré.',
    });
    return;
  }

  const picked = await createWaiter(seerKey(session.textChannelId, seerId), NIGHT_ACTION_MS);
  if (!picked) {
    await textChannel.send({
      content: '**Voyante** : aucune observation (temps écoulé).',
    });
    return;
  }

  const target = session.getPlayer(picked);
  if (!target) return;

  if (gossip) {
    session.gossipSeerNightTargetId = picked;
    await sendInPlayerSecretThread(client, session, seerId, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Observation enregistrée')
          .setDescription(
            `Cible : **${target.displayName}** — rôle : **${roleLabelFr(target.role)}**.\n\n_Resté **confidentiel** tant que cette personne est **vivante** ; si elle meurt, son rôle pourra apparaître **uniquement** dans le message d’**annonce de mort**, selon la config (nuit sombre / révélation des morts)._`
          )
          .setColor(0x9b59b6),
      ],
    });
  } else {
    const isWolf = target.role === Role.Werewolf;
    await sendInPlayerSecretThread(client, session, seerId, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Résultat')
          .setDescription(
            isWolf
              ? `**${target.displayName}** est un **Loup-Garou**.`
              : `**${target.displayName}** n’est **pas** un Loup-Garou.`
          )
          .setColor(isWolf ? 0xed4245 : 0x57f287),
      ],
    });
  }
}

async function announceGossipSeerAtDawn(
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  if (!session.compositionConfig.gossipSeerMode) return;
  const tid = session.gossipSeerNightTargetId;
  if (!tid) return;
  const observed = session.getPlayer(tid);
  session.gossipSeerNightTargetId = null;
  if (!observed) return;
  // Rôle public uniquement dans les annonces de morts : pas de double annonce si la cible est déjà dans le lever du soleil.
  if (!observed.alive) return;
  await textChannel.send({
    embeds: [
      publicEmbed(
        'Voyante bavarde',
        'La **Voyante bavarde** a mené son enquête pendant la nuit. Le **rôle exact** d’un joueur **encore vivant** ne s’affiche pas ici : **uniquement** dans une **annonce de mort** le cas échéant.'
      ).setColor(0x9b59b6),
    ],
  });
}

function wolfAllVoted(session: GameSession): boolean {
  const wolves = session.wolfIds();
  if (wolves.length === 0) return true;
  return wolves.every((w) => session.wolfVotesByWolf.has(w));
}

export function buildWolfVoteBoardContent(session: GameSession): string {
  const targets = session
    .aliveIds()
    .filter((id) => !session.wolfIds().includes(id));
  const tally = new Map<string, number>();
  for (const tid of session.wolfVotesByWolf.values()) {
    tally.set(tid, (tally.get(tid) ?? 0) + 1);
  }

  const lines =
    targets.length === 0
      ? '_(aucune cible)_'
      : targets
          .map((id) => {
            const n = tally.get(id) ?? 0;
            const name = session.getPlayer(id)?.displayName ?? id;
            return `• **${name}** : ${n} vote(s)`;
          })
          .join('\n');

  const wolves = session.wolfIds();
  const voted = wolves.filter((w) => session.wolfVotesByWolf.has(w)).length;
  const secLeft = Math.max(
    0,
    Math.ceil((session.wolfVoteDeadlineAt - Date.now()) / 1000)
  );

  const detail = [...session.wolfVotesByWolf.entries()]
    .map(([w, t]) => {
      const wn = session.getPlayer(w)?.displayName ?? w;
      const tn = session.getPlayer(t)?.displayName ?? t;
      return `${wn} → ${tn}`;
    })
    .join(' · ');

  return (
    `**Votes loups** — Nuit ${session.nightNumber}\n` +
    `⏱️ ~${secLeft}s max · **${voted}/${wolves.length}** loups ont voté\n\n` +
    `**Comptage par cible :**\n${lines}\n\n` +
    (detail ? `**Détail :** ${detail}\n\n` : '') +
    `Utilise \`/lg-vote\` avec l’option **cible** (pseudo ou \`<@mention>\`).\n` +
    `**Loups :** ${wolves.map((id) => `<@${id}>`).join(' ')}`
  );
}

export async function refreshWolfVoteBoard(
  client: Client,
  session: GameSession
): Promise<void> {
  if (!session.wolfPackThreadId || !session.wolfVoteBoardMessageId) return;
  const pack = await client.channels
    .fetch(session.wolfPackThreadId)
    .catch(() => null);
  if (!pack?.isThread()) return;
  const msg = await pack.messages
    .fetch(session.wolfVoteBoardMessageId)
    .catch(() => null);
  if (!msg?.editable) return;
  await msg.edit({ content: buildWolfVoteBoardContent(session) });
}

export async function runWolfPhase(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  const wolves = session.wolfIds();
  if (wolves.length === 0) return;

  session.nightSubPhase = 'wolves';
  session.wolfVotesByWolf.clear();
  session.wolfVoteBoardMessageId = null;

  const targets = session
    .aliveIds()
    .filter((id) => !session.wolfIds().includes(id));
  if (targets.length === 0) {
    await textChannel.send({
      content: '**Loups** : aucune cible (tous loups ?).',
    });
    return;
  }

  const pack = await ensureWolfPackThread(client, session);
  if (!pack) {
    await textChannel.send({
      content:
        '**Loups** : impossible de créer le fil **Meute** — vérifie les fils privés sur le serveur.',
    });
    return;
  }

  await sendMeuteBeat(textChannel, session);

  session.wolfVoteDeadlineAt = Date.now() + NIGHT_ACTION_MS;
  const boardMsg = await pack.send({
    content: buildWolfVoteBoardContent(session),
  });
  session.wolfVoteBoardMessageId = boardMsg.id;

  const spyK = littleGirlSpyKey(session.textChannelId);
  let lgSpyPromise: Promise<string | null> = Promise.resolve(null);
  const lgUid = session.elderCursed ? undefined : session.littleGirlId();
  if (lgUid && session.getPlayer(lgUid)?.alive) {
    lgSpyPromise = createWaiter(spyK, NIGHT_ACTION_MS);
    const spyEmbed = new EmbedBuilder()
      .setTitle('Petite fille')
      .setDescription(
        'Les **loups** délibèrent. Veux-tu **espionner** la meute ?\n\n' +
          '• **Espionner** : tu apprendras leur **cible majoritaire** ; **50 %** de risque d’être **repérée** — tu mourrais **à la place** de cette personne (épargnée par les loups ce soir).\n' +
          '• **Ne pas regarder** : aucun risque, aucune info.'
      )
      .setColor(0xf5b7b1);
    const spyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`lg:${session.textChannelId}:littlegirl:yes`)
        .setLabel('Espionner')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`lg:${session.textChannelId}:littlegirl:no`)
        .setLabel('Ne pas regarder')
        .setStyle(ButtonStyle.Secondary)
    );
    const okSpy = await sendInPlayerSecretThread(
      client,
      session,
      lgUid,
      {
        content: `<@${lgUid}> **Petite fille** — choix pour la nuit **${session.nightNumber}**.`,
        embeds: [spyEmbed],
        components: [spyRow],
      }
    );
    if (!okSpy) {
      fulfillPending(spyK, 'no');
    }
  }

  const deadline = Date.now() + NIGHT_ACTION_MS;
  const tick = setInterval(() => {
    refreshWolfVoteBoard(client, session).catch(() => undefined);
  }, 8000);

  try {
    while (Date.now() < deadline) {
      if (wolfAllVoted(session)) break;
      await new Promise((r) => setTimeout(r, 500));
    }
  } finally {
    clearInterval(tick);
  }

  await refreshWolfVoteBoard(client, session).catch(() => undefined);

  const tally = new Map<string, number>();
  for (const t of session.wolfVotesByWolf.values()) {
    tally.set(t, (tally.get(t) ?? 0) + 1);
  }

  const maxScore = tally.size ? Math.max(...tally.values()) : 0;
  const winners = [...tally.entries()]
    .filter(([, s]) => s === maxScore)
    .map(([t]) => t);
  const rawBest =
    winners.length === 1 && maxScore > 0 ? (winners[0] ?? null) : null;

  session.wolfVoteBoardMessageId = null;
  session.wolfVotesByWolf.clear();
  session.wolfVoteDeadlineAt = 0;

  if (!rawBest) {
    session.wolfTargetId = null;
    await textChannel.send({
      content:
        '**Loups** : égalité ou votes manquants — **aucune victime** ce soir.',
    });
  } else {
    let wolfTarget: string | null = rawBest;
    if (wolfTarget === session.guardProtectedUserId) {
      wolfTarget = null;
    }
    const rrhId = session.elderCursed ? undefined : session.redRidingHoodId();
    if (wolfTarget !== null && wolfTarget === rrhId && session.hunterId()) {
      await textChannel.send({
        embeds: [
          publicEmbed(
            'Le Chaperon Rouge est sauf\u2026',
            'Les loups ont tent\u00e9 de d\u00e9vorer quelqu\u2019un, mais leur proie \u00e9tait prot\u00e9g\u00e9e cette nuit. **Personne** ne meurt de leur attaque.'
          ).setColor(0xd63031),
        ],
      });
      wolfTarget = null;
    }

    if (wolfTarget !== null) {
      const elderP = session.getPlayer(wolfTarget);
      if (elderP?.role === Role.Elder && !session.elderSurvivedAttack) {
        session.elderSurvivedAttack = true;
        wolfTarget = null;
        await textChannel.send({
          embeds: [
            publicEmbed(
              'Une r\u00e9sistance myst\u00e9rieuse\u2026',
              'Les loups ont attaqu\u00e9 cette nuit, mais leur proie a **r\u00e9sist\u00e9** \u00e0 l\u2019assaut d\u2019une mani\u00e8re inexplicable. **Personne** ne meurt de cette attaque.'
            ).setColor(0x8e44ad),
          ],
        });
      }
    }

    if (session.compositionConfig.skipFirstNightKill && session.nightNumber === 1) {
      wolfTarget = null;
    }

    session.wolfTargetId = wolfTarget;
  }

  const spyChoice = await lgSpyPromise;
  if (
    lgUid &&
    session.getPlayer(lgUid)?.alive &&
    spyChoice === 'yes'
  ) {
    const caught = randomInt(1, 101) <= 50;
    if (caught) {
      session.pendingNightDeaths.push(lgUid);
      session.wolfTargetId = null;
      await sendInPlayerSecretThread(client, session, lgUid, {
        embeds: [
          new EmbedBuilder()
            .setTitle('Repérée !')
            .setDescription(
              'Les loups t’ont **vue**. Tu meurs **à la place** de leur victime désignée — elle est **épargnée** par la meute ce soir (sauf autres effets : sorcière, etc.).'
            )
            .setColor(0xed4245),
        ],
      });
    } else {
      const desc =
        rawBest != null
          ? `Tu observes sans être vue : la meute a majoritairement désigné **${session.getPlayer(rawBest)?.displayName ?? '?'}**.`
          : `Tu observes : les loups n’ont **pas** de cible unique claire ce soir.`;
      await sendInPlayerSecretThread(client, session, lgUid, {
        embeds: [
          new EmbedBuilder()
            .setTitle('Espionnage')
            .setDescription(
              `${desc}\n\n_La nuit continue (protections, sorcière…)._`
            )
            .setColor(0x9b59b6),
        ],
      });
    }
  }
}

export async function runWitchPhase(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  const witchId = session.witchId();
  if (!witchId) return;
  if (session.elderCursed) {
    await textChannel.send({ content: '**Sorci\u00e8re** : mal\u00e9diction de l\u2019Ancien \u2014 potions d\u00e9sactiv\u00e9es.' });
    return;
  }

  session.nightSubPhase = 'witch';

  let wolfVictimName = 'personne';
  if (session.wolfTargetId) {
    wolfVictimName =
      session.getPlayer(session.wolfTargetId)?.displayName ?? 'un joueur';
  }

  if (session.witchLifePotion && session.wolfTargetId) {
    const embed = new EmbedBuilder()
      .setTitle('Sorcière — potion de vie')
      .setDescription(
        `Les loups visent **${wolfVictimName}**. Utiliser la **potion de vie** ?`
      )
      .setColor(0x2ecc71);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`lg:${session.textChannelId}:witch:save:yes`)
        .setLabel('Sauver')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`lg:${session.textChannelId}:witch:save:no`)
        .setLabel('Ne pas sauver')
        .setStyle(ButtonStyle.Secondary)
    );

    const ok = await sendInPlayerSecretThread(client, session, witchId, {
      embeds: [embed],
      components: [row],
    });

    if (!ok) {
      await textChannel.send({
        content: `**Sorcière** : impossible d’envoyer dans le fil — potion de vie non utilisée.`,
      });
    } else {
      const saveChoice = await createWaiter(
        witchSaveKey(session.textChannelId),
        NIGHT_ACTION_MS
      );
      if (saveChoice === 'yes') {
        session.witchLifePotion = false;
        session.wolfTargetId = null;
      }
    }
  }

  if (!session.witchDeathPotion) return;

  const alive = session.aliveIds();
  if (alive.length <= 1) return;

  const embed = new EmbedBuilder()
    .setTitle('Sorcière — potion de mort')
    .setDescription(
      'Tu peux empoisonner **un joueur vivant**, ou passer ton tour.'
    )
    .setColor(0x992d22);

  const menu = buildAlivePlayerSelect(
    `lg:${session.textChannelId}:witch:kill`,
    'Empoisonner…',
    alive,
    session.labelMap(),
    new Set()
  );

  const rowSkip = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`lg:${session.textChannelId}:witch:skip`)
      .setLabel('Ne pas utiliser')
      .setStyle(ButtonStyle.Secondary)
  );

  const ok2 = await sendInPlayerSecretThread(client, session, witchId, {
    embeds: [embed],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
      rowSkip,
    ],
  });

  if (!ok2) {
    await textChannel.send({
      content: `**Sorcière** : impossible d’envoyer dans le fil — potion de mort non utilisée.`,
    });
    return;
  }

  const killChoice = await createWaiter(
    witchKillKey(session.textChannelId),
    NIGHT_ACTION_MS
  );
  if (killChoice && killChoice !== 'skip') {
    session.witchDeathPotion = false;
    session.pendingNightDeaths.push(killChoice);
  }
}

export async function resolveNightDeaths(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  // Chevalier \u00e0 l\u2019\u00e9p\u00e9e rouill\u00e9e : infection de la nuit pr\u00e9c\u00e9dente
  if (session.rustKillPending) {
    session.rustKillPending = false;
    const wolves = session
      .wolfIds()
      .map((id) => ({ id, name: session.getPlayer(id)?.displayName ?? '' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    const firstWolf = wolves[0];
    if (firstWolf) {
      session.pendingNightDeaths.push(firstWolf.id);
      await textChannel.send({
        embeds: [
          publicEmbed(
            'Infection\u2026 l\u2019\u00e9p\u00e9e rouill\u00e9e fait son oeuvre',
            'Le **Chevalier \u00e0 l\u2019\u00e9p\u00e9e rouill\u00e9e** avait \u00e9t\u00e9 d\u00e9vor\u00e9 par les loups.\n\n' +
              'L\u2019infection se propage : un loup succombe ce matin.'
          ).setColor(0x7f8c8d),
        ],
      });
    }
  }

  const deaths: string[] = [];
  if (session.wolfTargetId) deaths.push(session.wolfTargetId);
  deaths.push(...session.pendingNightDeaths);
  const unique = [...new Set(deaths)];

  const finalIds = await expandDeathsWithHunterAndLovers(
    client,
    session,
    textChannel,
    unique
  );

  const names: string[] = [];
  const actualDeadIds: string[] = [];
  for (const id of finalIds) {
    const p = session.getPlayer(id);
    if (!p) continue;
    // Servante D\u00e9vou\u00e9e : intercepte sa propre mort si elle a encore son pouvoir
    if (
      p.role === Role.DevotedServant &&
      !session.devotedServantUsed &&
      session.lastDeadPlayerRole !== null
    ) {
      session.devotedServantUsed = true;
      const newRole = session.lastDeadPlayerRole;
      p.role = newRole;
      await textChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('\uD83E\uDDD5 La Servante D\u00e9vou\u00e9e r\u00e9v\u00e8le son identit\u00e9 !')
            .setDescription(
              `**${p.displayName}** \u00e9tait la **Servante D\u00e9vou\u00e9e** !\n\n` +
                `Elle refuse de mourir et prend le r\u00f4le du dernier joueur \u00e9limin\u00e9 \u2014 **${roleLabelFr(newRole)}** \u2014 et continue la partie avec ce r\u00f4le et ses pouvoirs.`
            )
            .setColor(0xf39c12),
        ],
      });
      continue; // Ne pas l\u2019ajouter aux morts
    }
    // Mise \u00e0 jour du dernier r\u00f4le mort (avant session.kill)
    session.lastDeadPlayerRole = p.role;
    session.kill(id);
    actualDeadIds.push(id);
    names.push(p.displayName ?? `<@${id}>`);
  }

  if (actualDeadIds.length > 0) {
    await demotePlayersToStageAudience(textChannel.guild, session, actualDeadIds);
  }

  session.pendingNightDeaths = [];

  // Chevalier \u00e0 l\u2019\u00e9p\u00e9e rouill\u00e9e : si tu\u00e9 par les loups (wolfTargetId), programmer l\u2019infection
  if (
    session.wolfTargetId &&
    finalIds.includes(session.wolfTargetId) &&
    session.getPlayer(session.wolfTargetId)?.role === Role.RustySwordKnight
  ) {
    session.rustKillPending = true;
  }

  // Enfant Sauvage : v\u00e9rifier si le mod\u00e8le vient de mourir
  await checkWildChildTransform(client, session, textChannel, finalIds);

  const reveal = shouldRevealDeadRoles(session.compositionConfig);
  const desc =
    finalIds.length === 0
      ? 'Personne n’est mort cette nuit.'
      : reveal
        ? `Victimes :\n${formatDeathAnnounces(session, finalIds, true)}`
        : `Victimes : ${finalIds.map((id) => `<@${id}>`).join(', ')}`;

  let embed = publicEmbed(
    `Jour ${session.nightNumber} — lever du soleil`,
    desc
  );
  if (finalIds.length > 0 && !reveal) {
    embed.setFooter({ text: names.join(' · ') });
  } else if (finalIds.length === 0) {
    embed.setFooter({ text: 'Aucun mort' });
  }

  let files: AttachmentBuilder[] = [];
  if (finalIds.length > 0 && reveal) {
    const firstRole = session.getPlayer(finalIds[0]!)?.role;
    if (firstRole !== undefined) {
      const t = embedWithRoleCardThumbnail(
        embed,
        firstRole,
        roleCardSource(session.presetPublicCode, firstRole)
      );
      embed = t.embed;
      files = t.files;
    }
  }

  await textChannel.send({ embeds: [embed], files });
}

export async function runNightSequence(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  try {
    session.nightNumber++;
    session.phase = 'night';
    session.resetNightScratch();

    await serverMuteAllOnGameStage(textChannel.guild, session);

    await sendNightPrologue(textChannel, session);

    if (
      session.nightNumber === 1 &&
      !session.thiefNightDone &&
      session.thiefId()
    ) {
      await sendNightBeat(
        textChannel,
        'Mains dans la pénombre…',
        'Le **Voleur** choisit avec qui **échanger sa carte**. _Réponse attendue dans **son fil privé** — patience dans ce salon._'
      );
    }
    await runThiefPhase(client, session, textChannel);

    if (session.nightNumber === 1 && session.wildChildId()) {
      await sendNightBeat(
        textChannel,
        'L\u2019Enfant Sauvage choisit\u2026',
        'L\u2019**Enfant Sauvage** d\u00e9signe son **mod\u00e8le** (nuit 1 uniquement). _\u00b7 fil priv\u00e9._'
      );
    }
    await runWildChildPhase(client, session, textChannel);

    // Nuit 1 : initialisation de l'Montreur d'Ours
    if (session.nightNumber === 1 && session.bearTamerId()) {
      await initBearTamerNeighbors(client, session);
    }

    // Nuit 1 : initialisation du Sectaire Abominable (groupes A/B)
    if (session.nightNumber === 1 && session.sectarianId()) {
      await initSectarianGroups(client, session);
    }

    // Nuit 1 : Chien-Loup choisit son camp
    if (session.nightNumber === 1 && session.dogWolfId() && !session.dogWolfChoseSide) {
      await sendNightBeat(
        textChannel,
        'Le Chien-Loup choisit\u2026',
        'Le **Chien-Loup** choisit son camp cette nuit (Village ou Loups). _\u00b7 fil priv\u00e9._'
      );
      await runDogWolfPhase(client, session, textChannel);
    }

    // Nuit 1 : cr\u00e9ation du fil des Deux S\u0153urs
    if (session.nightNumber === 1 && session.sisterIds().length === 2) {
      await sendNightBeat(
        textChannel,
        'Les Deux S\u0153urs se retrouvent\u2026',
        'Les **Deux S\u0153urs** se reconnaissent dans un fil priv\u00e9 partag\u00e9 (nuit 1).'
      );
      await createSistersThread(client, session);
    }

    // Nuit 1 : cr\u00e9ation du fil des Trois Fr\u00e8res
    if (session.nightNumber === 1 && session.brotherIds().length === 3) {
      await sendNightBeat(
        textChannel,
        'Les Trois Fr\u00e8res se retrouvent\u2026',
        'Les **Trois Fr\u00e8res** se reconnaissent dans un fil priv\u00e9 partag\u00e9 (nuit 1).'
      );
      await createBrothersThread(client, session);
    }

    if (session.nightNumber === 1 && !session.cupidNightDone && session.cupidId()) {
      await sendNightBeat(
        textChannel,
        'Cupidon bande son arc…',
        '**Cupidon** désigne les **amoureux** (ou le **ménage à trois**). _Choix dans **son fil privé**._'
      );
    }
    await runCupidPhase(client, session, textChannel);

    if (session.seerId()) {
      const bavarde = session.compositionConfig.gossipSeerMode;
      await sendNightBeat(
        textChannel,
        bavarde ? 'La Voyante bavarde observe…' : 'La Voyante consulte les cartes…',
        bavarde
          ? 'La **Voyante bavarde** **inspecte un rôle** ce soir — résultat **dans son fil privé** ; le salon ne révèle un **rôle** que dans les **messages d’annonce de mort**.'
          : 'La **Voyante** observe un joueur pour savoir s’il est **Loup-Garou** ou non. _· fil privé._'
      );
    }
    await runSeerPhase(client, session, textChannel);

    if (session.guardId()) {
      await sendNightBeat(
        textChannel,
        'La protection veille…',
        'Le **Garde** choisit qui mettre **à l’abri des loups** cette nuit. _· fil privé._'
      );
    }
    await runGuardPhase(client, session, textChannel);
    if (session.docteurId() && session.docteurCharges > 0) {
      await sendNightBeat(
        textChannel,
        'Le Docteur soigne\u2026',
        `Le **Docteur** utilise une de ses charges de protection (**${session.docteurCharges}** restante${session.docteurCharges > 1 ? 's' : ''}). _\u00b7 fil priv\u00e9._`
      );
    }
    await runDocteurPhase(client, session, textChannel);

    if (session.wolfIds().length > 0) {
      const pf = session.littleGirlId()
        ? ' La **Petite fille** a aussi un message dans **son fil privé** (espionner ou non).'
        : '';
      await sendNightBeat(
        textChannel,
        'La meute se lève…',
        'Les **Loups-Garou** vont **délibérer** puis **voter** leur victime. La prochaine annonce ouvre le **fil Meute** avec les consignes et **`/lg-vote`**.' +
          pf
      );
    }
    await runWolfPhase(client, session, textChannel);

    if (session.ravenId()) {
      await sendNightBeat(
        textChannel,
        'Le Corbeau observe…',
        'Le **Corbeau** choisit un joueur à **marquer** (optionnel). _· fil privé._'
      );
    }
    await runRavenPhase(client, session, textChannel);

    if (session.witchId()) {
      await sendNightBeat(
        textChannel,
        'Chaudron & grimoire…',
        'La **Sorcière** peut utiliser ses **potions** (vie / mort). _· fil privé._'
      );
    }
    await runWitchPhase(client, session, textChannel);

    if (session.bigBadWolfId()) {
      await sendNightBeat(
        textChannel,
        'Grand M\u00e9chant Loup\u2026',
        'Le **Grand M\u00e9chant Loup** peut d\u00e9vorer un joueur suppl\u00e9mentaire. _\u00b7 fil priv\u00e9._'
      );
    }
    await runBigBadWolfPhase(client, session, textChannel);
    if (session.infectFatherId() && !session.infectFatherUsed && session.wolfTargetId) {
      await sendNightBeat(
        textChannel,
        'Infect P\u00e8re des Loups\u2026',
        'L\u2019**Infect P\u00e8re des Loups** peut choisir d\u2019infecter la victime plut\u00f4t que de la tuer. _\u00b7 fil priv\u00e9._'
      );
    }
    await runInfectFatherPhase(client, session, textChannel);

    if (session.whiteWerewolfId() && session.nightNumber % 2 === 0) {
      await sendNightBeat(
        textChannel,
        'Loup-Blanc \u2014 frappe secr\u00e8te\u2026',
        'Le **Loup-Blanc** peut \u00e9liminer un loup en secret (nuit paire). _\u00b7 fil priv\u00e9._'
      );
    }
    await runWhiteWolfPhase(client, session, textChannel);

    if (session.piedPiperId()) {
      await sendNightBeat(
        textChannel,
        'La m\u00e9lodie du Joueur de Fl\u00fbte\u2026',
        'Le **Joueur de Fl\u00fbte** ensorcelle 2 joueurs. _\u00b7 fil priv\u00e9._'
      );
    }
    await runPiedPiperPhase(client, session, textChannel);

    if (session.foxId() && !session.foxLostPower) {
      await sendNightBeat(
        textChannel,
        'Le Renard flaire\u2026',
        'Le **Renard** choisit 3 joueurs \u00e0 flairer pour d\u00e9tecter d\u2019\u00e9ventuels loups parmi eux. _\u00b7 fil priv\u00e9._'
      );
    }
    await runFoxPhase(client, session, textChannel);

    if (session.pyromaniacId() && !session.pyromaniacIgnited) {
      await sendNightBeat(
        textChannel,
        'Le Pyromane agit\u2026',
        'Le **Pyromane** arrose un joueur \u2014 ou d\u00e9clenche l\u2019incendie. _\u00b7 fil priv\u00e9._'
      );
    }
    await runPyromaniacPhase(client, session, textChannel);
    if (session.necromancerId()) {
      const deadCount = [...session.players.values()].filter(p => !p.alive).length;
      if (deadCount > 0) {
        await sendNightBeat(
          textChannel,
          'Le N\u00e9cromancien consulte\u2026',
          'Le **N\u00e9cromancien** inspecte un mort pour conna\u00eetre son r\u00f4le exact. _\u00b7 fil priv\u00e9._'
        );
      }
    }
    await runNecromancerPhase(client, session, textChannel);

    if (session.sectarianId()) {
      await sendNightBeat(
        textChannel,
        'Le Sectaire Abominable inspecte\u2026',
        'Le **Sectaire Abominable** inspecte un joueur pour conna\u00eetre son groupe. _\u00b7 fil priv\u00e9._'
      );
    }
    await runSectarianPhase(client, session, textChannel);

    await sendDawnApproaching(textChannel, session);
    await checkBearTamerGrowl(session, textChannel);
    await resolveNightDeaths(client, session, textChannel);
    await announceGossipSeerAtDawn(session, textChannel);

    if (session.guardProtectedUserId !== null) {
      session.guardLastProtectedId = session.guardProtectedUserId;
    }

    session.phase = 'day';
    const win = session.checkVictory();
    if (win) {
      session.phase = 'ended';
      await presentGameOverPanel(client, session, textChannel, win);
      return;
    }

    await startDayPhase(client, session, textChannel);
  } catch (e) {
    console.error(e);
    await textChannel.send({
      content: 'Erreur pendant la nuit — vérifie les logs du bot.',
    });
  }
}

export function fulfillSeer(channelId: string, seerId: string, target: string): boolean {
  return fulfillPending(seerKey(channelId, seerId), target);
}

export function fulfillThief(
  channelId: string,
  thiefId: string,
  target: string
): boolean {
  return fulfillPending(thiefKey(channelId, thiefId), target);
}

export function fulfillGuard(
  channelId: string,
  guardId: string,
  target: string
): boolean {
  return fulfillPending(guardKey(channelId, guardId), target);
}

export function fulfillLittleGirlSpy(
  channelId: string,
  spy: boolean
): boolean {
  return fulfillPending(littleGirlSpyKey(channelId), spy ? 'yes' : 'no');
}

export function fulfillWitchSave(channelId: string, choice: 'yes' | 'no'): boolean {
  return fulfillPending(witchSaveKey(channelId), choice);
}

export function fulfillWitchKill(channelId: string, targetOrSkip: string): boolean {
  return fulfillPending(witchKillKey(channelId), targetOrSkip);
}



