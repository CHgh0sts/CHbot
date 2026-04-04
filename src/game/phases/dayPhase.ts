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
import { runScapegoatDeathChoice } from '../scapegoat';
import { checkWildChildTransform } from '../wildChild';

function voteKey(channelId: string, voterId: string): string {
  return `${channelId}:vote:${voterId}`;
}

/** Totaux par cible uniquement \u2014 ne r\u00e9v\u00e8le pas qui a vot\u00e9 pour qui. */
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
    return `\u2022 **${r.name}** (<@${r.id}>) \u2014 **${label}**`;
  });

  return (
    '_Les bulletins restent **secrets** : on affiche seulement combien de voix chaque joueur a **re\u00e7ues**._\n\n' +
    lines.join('\n')
  );
}

/** Apr\u00e8s le **premier** vote du village : l\u2019Ange vivant redevient villageois. */
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
    .setTitle('Ton nouveau r\u00f4le')
    .setDescription(
      `Tu n\u2019es plus l\u2019**Ange** : tu es maintenant **${roleLabelFr(Role.Villager)}**.\n\n${rolePowerBlurb(Role.Villager)}`
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
      ? `\n\n_L\u2019**Ange** est en jeu : au **tout premier vote du village**, si **l\u2019Ange** est \u00e9limin\u00e9\u00b7e, **il/elle gagne seul\u00b7e** et la partie s\u2019arr\u00eate. **Sinon**, l\u2019Ange **devient villageois\u00b7e**._`
      : '';

    const foolNote = session.foolOfVillageId()
      ? `\n\n_L\u2019**Idiot du village** est en jeu : si le village vote pour l\u2019\u00e9liminer, il ne meurt pas (une seule fois) mais perd son droit de vote._`
      : '';

    const elderNote = session.elderId()
      ? `\n\n_L\u2019**Ancien** est en jeu : s\u2019il est \u00e9limin\u00e9 par le village, tous les r\u00f4les sp\u00e9ciaux villageois perdent leurs pouvoirs._`
      : '';

    await sendNightBeat(
      textChannel,
      'Le jour \u2014 d\u00e9bat & vote',
      `Le village est **\u00e9veill\u00e9**. Discutez ici ou en vocal, puis chaque **vivant** recevra **en m\u00eame temps** un **menu de vote** dans **son fil priv\u00e9**.\n\n` +
        `\u23f1\ufe0f **${Math.floor(DAY_VOTE_MS / 1000)} s** maximum apr\u00e8s l\u2019envoi des menus.\n\n` +
        `_Si ce salon reste calme quelques secondes, c\u2019est que le bot **pr\u00e9pare** les votes \u2014 **pas un bug**._` +
        angelNote + foolNote + elderNote,
      0x3498db
    );

    const foolId = session.foolOfVillageId();
    const bannedIds = session.scapegoatVoteBannedIds;
    session.scapegoatVoteBannedIds = new Set();

    if (bannedIds.size > 0) {
      const bannedNames = [...bannedIds]
        .map((id) => session.getPlayer(id)?.displayName ?? `<@${id}>`)
        .join(', ');
      await textChannel.send({
        embeds: [
          publicEmbed(
            'Bouc \u00c9missaire \u2014 Interdictions de vote',
            `Suite au sacrifice du **Bouc \u00c9missaire**, les joueurs suivants **ne peuvent pas voter** ce tour :\n${bannedNames}`
          ).setColor(0x95a5a6),
        ],
      });
    }

    const voters = alive.filter((id) => {
      if (id === foolId && !session.foolOfVillageCanVote) return false;
      if (bannedIds.has(id)) return false;
      return true;
    });

    if (!session.foolOfVillageCanVote && foolId) {
      const foolPlayer = session.getPlayer(foolId);
      if (foolPlayer) {
        await textChannel.send({
          content: `**${foolPlayer.displayName}** (<@${foolId}>) \u2014 _Idiot du village_ : ne peut pas voter ce tour.`,
        });
      }
    }

    const sendResults = await Promise.all(
      voters.map(async (voterId) => {
        const targets = alive.filter((id) => id !== voterId);
        if (targets.length === 0) return { voterId, ok: false as const };

        const embed = new EmbedBuilder()
          .setTitle('Vote')
          .setDescription(
            'Vote pour **\u00e9liminer** un joueur (tu ne peux pas te viser toi-m\u00eame).'
          )
          .setColor(0x3498db);

        const menu = buildAlivePlayerSelect(
          `lg:${session.textChannelId}:vote`,
          '\u00c9liminer\u2026',
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
              `<@${voterId}> **\ud83d\udd14 Vote du village \u2014 \u00e0 toi !**\n` +
              `Choisis une cible ci-dessous (menu). Temps : **${Math.floor(DAY_VOTE_MS / 1000)} s**.`,
          }
        );

        if (!ok) {
          await textChannel.send({
            content:
              'Impossible d\u2019envoyer un menu de vote dans un fil priv\u00e9 \u2014 ce vote est ignor\u00e9.',
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

    if (session.ravenTargetId && session.getPlayer(session.ravenTargetId)?.alive) {
      const ravenBonus = (tally.get(session.ravenTargetId) ?? 0) + 2;
      tally.set(session.ravenTargetId, ravenBonus);
    }
    session.ravenTargetId = null;

    const maxScore = tally.size ? Math.max(...tally.values()) : 0;
    const tied = [...tally.entries()]
      .filter(([, s]) => s === maxScore)
      .map(([t]) => t);

    let singleWinner: string | null = null;
    let scapegoatTriggered = false;
    if (tied.length === 1 && maxScore > 0) {
      singleWinner = tied[0]!;
    } else if (tied.length > 1 && maxScore > 0) {
      const sgId = session.scapegoatId();
      if (sgId) {
        singleWinner = sgId;
        scapegoatTriggered = true;
      } else if (session.compositionConfig.tiebreakerRandom) {
        singleWinner = tied[Math.floor(Math.random() * tied.length)]!;
        await textChannel.send({
          content: `**\u00c9galit\u00e9 au vote** \u2014 tirage au sort : <@${singleWinner}> est d\u00e9sign\u00e9\u00b7e.`,
        });
      }
    }

    await textChannel.send({
      embeds: [
        publicEmbed(
          'Vote du village \u2014 d\u00e9compte',
          formatDayVoteTallyLines(session, alive, tally)
        ).setColor(0x3498db),
      ],
    });

    const isFirstVillageVote = session.dayVoteCount === 0;

    if (!singleWinner) {
      await textChannel.send({
        content:
          tied.length > 1 && maxScore > 0
            ? '**\u00c9galit\u00e9 au vote** \u2014 personne n\u2019est \u00e9limin\u00e9 aujourd\u2019hui.'
            : '**Aucun vote valide** \u2014 pas d\u2019\u00e9limination.',
      });
      if (isFirstVillageVote) {
        const demoted = await demoteAngelToVillagerIfAlive(client, session);
        if (demoted) {
          await textChannel.send({
            embeds: [
              publicEmbed(
                'Ange',
                '**Premier vote** sans \u00e9limination unique : l\u2019**Ange** redevient **villageois** (voir fil priv\u00e9).'
              ).setColor(0xe8daef),
            ],
          });
        }
      }
      session.dayVoteCount++;
    } else {
      const victim = singleWinner;
      const victimPlayer = session.getPlayer(victim);

      // Bouc \u00c9missaire : sacrifice lors d\u2019\u00e9galit\u00e9
      if (scapegoatTriggered) {
        session.kill(victim);
        await demotePlayersToStageAudience(textChannel.guild, session, [victim]);
        const sgName = victimPlayer?.displayName ?? 'Bouc';
        await textChannel.send({
          embeds: [
            publicEmbed(
              '\u00c9galit\u00e9 au vote \u2014 Bouc \u00c9missaire',
              `**${sgName}** (<@${victim}>) est le **Bouc \u00c9missaire** \u2014 sacrifi\u00e9\u00b7e lors de l\u2019\u00e9galit\u00e9 des votes.\n\nIl/elle choisit maintenant qui pourra voter lors du prochain tour.`
            ).setColor(0x95a5a6),
          ],
        });
        await runScapegoatDeathChoice(client, session, victim);
        await checkWildChildTransform(client, session, textChannel, [victim]);
        session.dayVoteCount++;
        const winCheck = session.checkVictory();
        if (winCheck) {
          session.phase = 'ended';
          await presentGameOverPanel(client, session, textChannel, winCheck);
          return;
        }
        await runNightSequence(client, session, textChannel);
        return;
      }

      if (isFirstVillageVote && victimPlayer?.role === Role.Angel) {
        session.kill(victim);
        await demotePlayersToStageAudience(textChannel.guild, session, [victim]);
        await textChannel.send({
          embeds: [
            publicEmbed(
              'L\u2019Ange triomphe',
              `**${victimPlayer.displayName}** (<@${victim}>) \u00e9tait l\u2019**Ange** : \u00e9limin\u00e9\u00b7e au **premier vote du village**, **il/elle remporte la partie seul\u00b7e** \u2014 fin de partie.`
            ).setColor(0xf1c40f),
          ],
        });
        session.dayVoteCount++;
        session.phase = 'ended';
        await presentGameOverPanel(client, session, textChannel, 'angel');
        return;
      }

      // Idiot du village : survive au premier vote, perd son droit de vote
      if (
        victimPlayer?.role === Role.FoolOfVillage &&
        !session.foolOfVillageUsedPower
      ) {
        session.foolOfVillageUsedPower = true;
        session.foolOfVillageCanVote = false;
        await textChannel.send({
          embeds: [
            publicEmbed(
              'L\u2019Idiot du village',
              `**${victimPlayer.displayName}** (<@${victim}>) est l\u2019**Idiot du village** !\n\n` +
                'Le village pensait l\u2019\u00e9liminer, mais il/elle ne meurt pas \u2014 c\u2019est l\u2019Idiot !\n\n' +
                '_En revanche, il/elle **perd son droit de vote** pour le reste de la partie. Il/elle peut toujours \u00eatre \u00e9limin\u00e9\u00b7e par les loups ou d\u2019autres effets._'
            ).setColor(0xf39c12),
          ],
        });
        if (isFirstVillageVote) {
          const demoted = await demoteAngelToVillagerIfAlive(client, session);
          if (demoted) {
            await textChannel.send({
              embeds: [
                publicEmbed(
                  'Ange',
                  '**Premier vote** r\u00e9solu : l\u2019**Ange** n\u2019a pas \u00e9t\u00e9 \u00e9limin\u00e9\u00b7e \u2014 **il/elle devient villageois\u00b7e** (voir fil priv\u00e9).'
                ).setColor(0xe8daef),
              ],
            });
          }
        }
        session.dayVoteCount++;
        const winCheck = session.checkVictory();
        if (winCheck) {
          session.phase = 'ended';
          await presentGameOverPanel(client, session, textChannel, winCheck);
          return;
        }
        await runNightSequence(client, session, textChannel);
        return;
      }

      const finalDeaths = await expandDeathsWithHunterAndLovers(
        client,
        session,
        textChannel,
        [victim]
      );

      // Ancien : malédiction si éliminé par le vote du village
      if (victimPlayer?.role === Role.Elder && finalDeaths.includes(victim)) {
        session.elderCursed = true;
        await textChannel.send({
          embeds: [
            publicEmbed(
              'La Mal\u00e9diction de l\u2019Ancien',
              `**${victimPlayer.displayName}** \u00e9tait l\u2019**Ancien** \u2014 \u00e9limin\u00e9\u00b7e par le village !\n\n` +
                '\u26a0\ufe0f **Mal\u00e9diction** : tous les **r\u00f4les sp\u00e9ciaux du camp Village** perdent leurs pouvoirs pour le reste de la partie (Voyante, Sorci\u00e8re, Garde, Corbeau\u2026)'
            ).setColor(0x8e44ad),
          ],
        });
      }

      const reveal = shouldRevealDeadRoles(session.compositionConfig);
      const desc =
        finalDeaths.length === 0
          ? 'Personne n\u2019est \u00e9limin\u00e9.'
          : reveal
            ? `\u00c9limin\u00e9s :\n${formatDeathAnnounces(session, finalDeaths, true)}`
            : `\u00c9limin\u00e9s : ${finalDeaths.map((id) => `<@${id}>`).join(', ')}`;

      const actualDayDeaths: string[] = [];
      for (const id of finalDeaths) {
        const dp = session.getPlayer(id);
        if (!dp) { session.kill(id); actualDayDeaths.push(id); continue; }
        // Servante D\u00e9vou\u00e9e : intercepte sa propre \u00e9limination (vote ou autre)
        if (
          dp.role === Role.DevotedServant &&
          !session.devotedServantUsed &&
          session.lastDeadPlayerRole !== null
        ) {
          session.devotedServantUsed = true;
          const newRole = session.lastDeadPlayerRole;
          dp.role = newRole;
          await textChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('\uD83E\uDDD5 La Servante D\u00e9vou\u00e9e r\u00e9v\u00e8le son identit\u00e9 !')
                .setDescription(
                  `**${dp.displayName}** \u00e9tait la **Servante D\u00e9vou\u00e9e** !\n\n` +
                    `Elle refuse de mourir et prend le r\u00f4le **${roleLabelFr(newRole)}** du dernier \u00e9limin\u00e9, et continue la partie avec ce r\u00f4le et ses pouvoirs.`
                )
                .setColor(0xf39c12),
            ],
          });
          continue;
        }
        session.lastDeadPlayerRole = dp.role;
        session.kill(id);
        actualDayDeaths.push(id);
      }
      if (actualDayDeaths.length > 0) {
        await demotePlayersToStageAudience(
          textChannel.guild,
          session,
          actualDayDeaths
        );
        await checkWildChildTransform(client, session, textChannel, actualDayDeaths);
      }

      let voteEmbed = publicEmbed('R\u00e9sultat du vote', desc).setColor(0xe67e22);
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
                '**Premier vote** r\u00e9solu : l\u2019**Ange** n\u2019a pas \u00e9t\u00e9 \u00e9limin\u00e9\u00b7e \u2014 **il/elle devient villageois\u00b7e** (voir fil priv\u00e9).'
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
      content: 'Erreur pendant le jour \u2014 v\u00e9rifie les logs du bot.',
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
