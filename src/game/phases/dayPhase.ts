import type {
  AttachmentBuilder,
  Client,
  GuildTextBasedChannel,
} from 'discord.js';
import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { createWaiter, fulfillPending } from '../../interaction/pending';
import { DAY_VOTE_MS } from '../../config';
import { Role } from '../../types';
import type { GameSession } from '../GameSession';
import {
  roleLabelFr,
  rolePowerBlurb,
} from '../composition';
import { deliverRoleToPlayer } from '../../services/RoleDeliveryService';
import {
  buildAlivePlayerSelect,
  publicEmbed,
} from '../../services/MessagingService';
import { sendNightBeat } from '../nightNarration';
import { shouldRevealDeadRoles } from '../composition';
import { formatDeathAnnounces } from '../deathAnnounce';
import { embedWithRoleCardThumbnail } from '../roleCards';
import { roleCardSource } from '../../utils/roleCardRemoteUrl';
import { presentGameOverPanel } from '../../services/PostGameService';
import {
  demotePlayersToStageAudience,
  serverUnmuteAllOnGameStage,
} from '../../services/StageVoiceService';
import { sendComponentsToPlayerThread } from '../../services/SecretThreadService';
import { expandDeathsWithHunterAndLovers } from '../deathChain';
import { runNightSequence } from './nightPhase';

function voteKey(channelId: string, voterId: string): string {
  return `${channelId}:vote:${voterId}`;
}

/** Totaux par cible uniquement — ne révèle pas qui a voté pour qui. */
function formatDayVoteTallyLines(
  session: GameSession,
  aliveAtVote: string[],
  tally: Map<string, number>
): string {
  const rows = aliveAtVote
    .map((id) => {
      const p = session.getPlayer(id);
      const n = tally.get(id) ?? 0;
      return {
        id,
        n,
        name: p?.displayName ?? 'Joueur',
      };
    })
    .sort(
      (a, b) =>
        b.n - a.n || a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    );

  const lines = rows.map((r) => {
    const label = r.n === 1 ? '1 vote' : `${r.n} votes`;
    return `• **${r.name}** (<@${r.id}>) — **${label}**`;
  });

  return (
    '_Les bulletins restent **secrets** : on affiche seulement combien de voix chaque joueur a **reçues**._\n\n' +
    lines.join('\n')
  );
}

/** Après le **premier** vote du village : l’Ange vivant redevient villageois. */
async function demoteAngelToVillagerIfAlive(
  client: Client,
  session: GameSession
): Promise<boolean> {
  const angel = [...session.players.values()].find(
    (p) => p.role === Role.Angel && p.alive
  );
  if (!angel) return false;
  angel.role = Role.Villager;
  const embed = new EmbedBuilder()
    .setTitle('Ton nouveau rôle')
    .setDescription(
      `Tu n’es plus l’**Ange** : tu es maintenant **${roleLabelFr(Role.Villager)}**.\n\n${rolePowerBlurb(Role.Villager)}`
    )
    .setColor(0x3498db);
  await deliverRoleToPlayer(
    client,
    session,
    angel.userId,
    angel.displayName,
    embed,
    Role.Villager
  );
  return true;
}

export async function startDayPhase(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel
): Promise<void> {
  try {
    session.phase = 'day';

    await serverUnmuteAllOnGameStage(textChannel.guild, session);

    const alive = session.aliveIds();
    if (alive.length < 2) {
      const win = session.checkVictory() ?? 'village';
      session.phase = 'ended';
      await presentGameOverPanel(client, session, textChannel, win);
      return;
    }

    const angelNote = session.angelId()
      ? `\n\n_L’**Ange** est en jeu : au **tout premier vote du village**, si **l’Ange** est éliminé·e, **il/elle gagne seul·e** et la partie s’arrête. **Sinon**, l’Ange **devient villageois·e**._`
      : '';

    await sendNightBeat(
      textChannel,
      'Le jour — débat & vote',
      `Le village est **éveillé**. Discutez ici ou en vocal, puis chaque **vivant** recevra **en même temps** un **menu de vote** dans **son fil privé**.\n\n` +
        `⏱️ **${Math.floor(DAY_VOTE_MS / 1000)} s** maximum après l’envoi des menus.\n\n` +
        `_Si ce salon reste calme quelques secondes, c’est que le bot **prépare** les votes — **pas un bug**._` +
        angelNote,
      0x3498db
    );

    const sendResults = await Promise.all(
      alive.map(async (voterId) => {
        const targets = alive.filter((id) => id !== voterId);
        if (targets.length === 0) return { voterId, ok: false as const };

        const embed = new EmbedBuilder()
          .setTitle('Vote')
          .setDescription(
            'Vote pour **éliminer** un joueur (tu ne peux pas te viser toi-même).'
          )
          .setColor(0x3498db);

        const menu = buildAlivePlayerSelect(
          `lg:${session.textChannelId}:vote`,
          'Éliminer…',
          targets,
          session.labelMap(),
          new Set([voterId])
        );

        const ok = await sendComponentsToPlayerThread(
          client,
          session,
          voterId,
          embed,
          [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
          {
            pingContent:
              `<@${voterId}> **🔔 Vote du village — à toi !**\n` +
              `Choisis une cible ci-dessous (menu). Temps : **${Math.floor(DAY_VOTE_MS / 1000)} s**.`,
          }
        );

        if (!ok) {
          await textChannel.send({
            content:
              'Impossible d’envoyer un menu de vote dans un fil privé — ce vote est ignoré.',
          });
        }
        return { voterId, ok };
      })
    );

    const votersReady = sendResults.filter((r) => r.ok).map((r) => r.voterId);

    const voteResults = await Promise.all(
      votersReady.map((voterId) =>
        createWaiter(
          voteKey(session.textChannelId, voterId),
          DAY_VOTE_MS
        ).then((choice) => ({ voterId, choice }))
      )
    );

    const votes = new Map<string, string>();
    for (const { voterId, choice } of voteResults) {
      if (choice) votes.set(voterId, choice);
    }

    const tally = new Map<string, number>();
    for (const t of votes.values()) {
      tally.set(t, (tally.get(t) ?? 0) + 1);
    }

    const maxScore = tally.size ? Math.max(...tally.values()) : 0;
    const winners = [...tally.entries()]
      .filter(([, s]) => s === maxScore)
      .map(([t]) => t);

    await textChannel.send({
      embeds: [
        publicEmbed(
          'Vote du village — décompte',
          formatDayVoteTallyLines(session, alive, tally)
        ).setColor(0x3498db),
      ],
    });

    const isFirstVillageVote = session.dayVoteCount === 0;

    if (winners.length !== 1 || maxScore === 0) {
      await textChannel.send({
        content:
          winners.length > 1
            ? '**Égalité au vote** — personne n’est éliminé aujourd’hui.'
            : '**Aucun vote valide** — pas d’élimination.',
      });
      if (isFirstVillageVote) {
        const demoted = await demoteAngelToVillagerIfAlive(client, session);
        if (demoted) {
          await textChannel.send({
            embeds: [
              publicEmbed(
                'Ange',
                '**Premier vote** sans élimination unique : l’**Ange** redevient **villageois** (voir fil privé).'
              ).setColor(0xe8daef),
            ],
          });
        }
      }
      session.dayVoteCount++;
    } else {
      const victim = winners[0]!;
      const victimPlayer = session.getPlayer(victim);

      if (
        isFirstVillageVote &&
        victimPlayer?.role === Role.Angel
      ) {
        session.kill(victim);
        await demotePlayersToStageAudience(textChannel.guild, session, [
          victim,
        ]);
        await textChannel.send({
          embeds: [
            publicEmbed(
              'L’Ange triomphe',
              `**${victimPlayer.displayName}** (<@${victim}>) était l’**Ange** : éliminé·e au **premier vote du village**, **il/elle remporte la partie seul·e** — fin de partie.`
            ).setColor(0xf1c40f),
          ],
        });
        session.dayVoteCount++;
        session.phase = 'ended';
        await presentGameOverPanel(client, session, textChannel, 'angel');
        return;
      }

      const finalDeaths = await expandDeathsWithHunterAndLovers(
        client,
        session,
        textChannel,
        [victim]
      );

      const reveal = shouldRevealDeadRoles(session.compositionConfig);
      const desc =
        finalDeaths.length === 0
          ? 'Personne n’est éliminé.'
          : reveal
            ? `Éliminés :\n${formatDeathAnnounces(session, finalDeaths, true)}`
            : `Éliminés : ${finalDeaths.map((id) => `<@${id}>`).join(', ')}`;

      for (const id of finalDeaths) session.kill(id);
      if (finalDeaths.length > 0) {
        await demotePlayersToStageAudience(
          textChannel.guild,
          session,
          finalDeaths
        );
      }

      let voteEmbed = publicEmbed('Résultat du vote', desc).setColor(0xe67e22);
      let files: AttachmentBuilder[] = [];
      if (reveal && finalDeaths.length > 0) {
        const r = session.getPlayer(finalDeaths[0]!)?.role;
        if (r !== undefined) {
          const t = embedWithRoleCardThumbnail(
            voteEmbed,
            r,
            roleCardSource(session.presetPublicCode, r)
          );
          voteEmbed = t.embed;
          files = t.files;
        }
      }
      await textChannel.send({ embeds: [voteEmbed], files });

      if (isFirstVillageVote) {
        const demoted = await demoteAngelToVillagerIfAlive(client, session);
        if (demoted) {
          await textChannel.send({
            embeds: [
              publicEmbed(
                'Ange',
                '**Premier vote** résolu : l’**Ange** n’a pas été éliminé·e — **il/elle devient villageois·e** (voir fil privé).'
              ).setColor(0xe8daef),
            ],
          });
        }
      }
      session.dayVoteCount++;
    }

    const win = session.checkVictory();
    if (win) {
      session.phase = 'ended';
      await presentGameOverPanel(client, session, textChannel, win);
      return;
    }

    await runNightSequence(client, session, textChannel);
  } catch (e) {
    console.error(e);
    await textChannel.send({
      content: 'Erreur pendant le jour — vérifie les logs du bot.',
    });
  }
}

export function fulfillVote(
  channelId: string,
  voterId: string,
  targetId: string
): boolean {
  return fulfillPending(voteKey(channelId, voterId), targetId);
}
