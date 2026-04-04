import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  type ButtonInteraction,
  type Client,
  GuildMember,
  type GuildTextBasedChannel,
} from 'discord.js';
import { cloneCompositionConfig, roleLabelFr } from '../game/composition';
import { MAX_PLAYERS } from '../config';
import { GameSession } from '../game/GameSession';
import { Role } from '../types';
import {
  getSessionByTextChannel,
  registerSession,
  removeSession,
} from '../game/GameManager';
import { cancelAllForChannel } from '../interaction/pending';
import {
  deleteGamePartyChannels,
  fetchPartyChannels,
  grantPlayerGameAccess,
} from './ChannelService';
import { sendLobbyMessage } from './LobbyMessageService';
import { serverUnmuteAllOnGameStage } from './StageVoiceService';
import { postGameEnded } from './StatsApiService';

/** Supprime tous les fils privés joueurs + fil Meute. */
export async function deleteAllGameThreads(
  client: Client,
  session: GameSession
): Promise<void> {
  const ids = [...session.secretThreads.values()];
  if (session.wolfPackThreadId) ids.push(session.wolfPackThreadId);
  if (session.loversThreadId) ids.push(session.loversThreadId);
  if (session.sistersThreadId) ids.push(session.sistersThreadId);
  if (session.brothersThreadId) ids.push(session.brothersThreadId);
  if (session.necromancerThreadId) ids.push(session.necromancerThreadId);
  for (const id of ids) {
    const ch = await client.channels.fetch(id).catch(() => null);
    if (ch?.isThread()) {
      await ch.delete('Fin de partie Loup-Garou').catch(() => undefined);
    }
  }
  session.secretThreads.clear();
  session.wolfPackThreadId = null;
  session.loversThreadId = null;
  session.sistersThreadId = null;
  session.brothersThreadId = null;
  session.necromancerThreadId = null;
}

function canUsePostGameButtons(
  userId: string,
  hostId: string,
  member: GuildMember | null
): boolean {
  if (userId === hostId) return true;
  if (member?.permissions.has(PermissionFlagsBits.ManageChannels)) return true;
  return false;
}

export type GameOverWin = 'wolves' | 'village' | 'lovers' | 'angel' | 'whitewerewolf' | 'piedpiper' | 'pyromaniac' | 'sectarian';

/** Joueurs du camp victorieux (vivants ou morts), selon le rôle final en base. */
function winningUserIds(session: GameSession, win: GameOverWin): string[] {
  const players = [...session.players.values()];
  if (win === 'wolves') {
    return players.filter((p) => session.isWolfRole(p.role)).map((p) => p.userId);
  }
  if (win === 'village') {
    return players.filter((p) => !session.isWolfRole(p.role)).map((p) => p.userId);
  }
  if (win === 'angel') {
    return players.filter((p) => p.role === Role.Angel).map((p) => p.userId);
  }
  if (win === 'whitewerewolf') {
    return players.filter((p) => p.role === Role.WhiteWerewolf).map((p) => p.userId);
  }
  if (win === 'piedpiper') {
    return players.filter((p) => p.role === Role.PiedPiper).map((p) => p.userId);
  }
  if (win === 'pyromaniac') {
    return players.filter((p) => p.role === Role.Pyromaniac).map((p) => p.userId);
  }
  if (win === 'sectarian') {
    return players.filter((p) => p.role === Role.Sectarian).map((p) => p.userId);
  }
  const lg = session.loversGroup;
  if (lg && lg.length >= 2) {
    return [...lg];
  }
  const alive = players.filter((p) => p.alive);
  if (
    alive.length === 2 &&
    alive[0]!.loverUserId === alive[1]!.userId &&
    alive[1]!.loverUserId === alive[0]!.userId
  ) {
    return [alive[0]!.userId, alive[1]!.userId];
  }
  return alive.map((p) => p.userId);
}

function clipField(s: string, max = 1024): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 20)}… _(tronqué)_`;
}

function buildWinnersField(session: GameSession, win: GameOverWin): string {
  const ids = winningUserIds(session, win);
  const lines: string[] = [];
  for (const uid of ids) {
    const p = session.getPlayer(uid);
    if (!p) continue;
    const status = p.alive ? 'vivant' : 'mort';
    lines.push(`• **${p.displayName}** (<@${uid}>) — _${status}_`);
  }
  return clipField(lines.join('\n') || '—');
}

function buildSummaryField(session: GameSession, win: GameOverWin): string {
  const players = [...session.players.values()];
  const n = players.length;
  const aliveN = players.filter((p) => p.alive).length;
  const nights = session.nightNumber;
  const winLabel =
    win === 'wolves'
      ? '**Loups-Garous**'
      : win === 'village'
        ? '**Village** (tous les non-loups)'
        : win === 'angel'
          ? '**Ange** (victoire solo au 1er vote)'
          : win === 'whitewerewolf'
              ? '**Loup-Blanc** (solo \u2014 dernier survivant)'
            : win === 'piedpiper'
              ? '**Joueur de Fl\u00fbte** (solo \u2014 tous ensorcel\u00e9s)'
              : win === 'pyromaniac'
                ? '**Pyromane** (solo \u2014 tous arros\u00e9s / incendi\u00e9s)'
                : win === 'sectarian'
                  ? '**Sectaire Abominable** (solo \u2014 tous les survivants du m\u00eame groupe)'
                  : '**Amoureux**';

  const header = [
    `**Nuits** : **${nights}** · **Joueurs** : **${n}** · **Survivants** : **${aliveN}**`,
    `**Camp vainqueur** : ${winLabel}`,
    '',
    '**Rôles finaux**',
  ];

  const sorted = [...players].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' })
  );
  const roleLines = sorted.map((p) => {
    const st = p.alive ? '🟢' : '💀';
    return `${st} **${p.displayName}** — ${roleLabelFr(p.role)}`;
  });

  return clipField([...header, ...roleLines].join('\n'));
}

/**
 * Fin naturelle : annule les attentes, supprime les fils, affiche victoire + boutons.
 */
export async function presentGameOverPanel(
  client: Client,
  session: GameSession,
  textChannel: GuildTextBasedChannel,
  win: GameOverWin
): Promise<void> {
  cancelAllForChannel(session.textChannelId);
  await deleteAllGameThreads(client, session);
  await serverUnmuteAllOnGameStage(textChannel.guild, session);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`lg:${session.textChannelId}:aftergame:replay`)
      .setLabel('Rejouer')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`lg:${session.textChannelId}:aftergame:close`)
      .setStyle(ButtonStyle.Danger)
      .setLabel('Fermer la partie')
  );

  const desc =
    win === 'wolves'
      ? '**Les Loups-Garous** remportent la partie.'
      : win === 'lovers'
        ? session.loversGroup && session.loversGroup.length >= 3
          ? '**Le m\u00e9nage \u00e0 trois** remporte la partie (derniers survivants du lien).'
          : '**Les Amoureux** remportent la partie (derniers survivants ensemble).'
        : win === 'angel'
          ? '**L\u2019Ange** remporte la partie **seul\u00b7e** (\u00e9limin\u00e9\u00b7e au premier vote du village).'
          : win === 'whitewerewolf'
            ? '**Le Loup-Blanc** remporte la partie **seul** \u2014 dernier survivant !'
            : win === 'piedpiper'
              ? '**Le Joueur de Fl\u00fbte** a ensorcel\u00e9 tous les survivants \u2014 il remporte la partie **seul** !'
              : win === 'pyromaniac'
                ? '**Le Pyromane** a tout incendi\u00e9 \u2014 il remporte la partie **seul** !'
                : win === 'sectarian'
                  ? '**Le Sectaire Abominable** a r\u00e9ussi \u00e0 r\u00e9unir tous les survivants dans son groupe \u2014 il remporte la partie **seul** !'
                  : '**Le village** remporte la partie.';

  const color =
    win === 'wolves'
      ? 0xed4245
      : win === 'lovers'
        ? 0xff69b4
        : win === 'angel' || win === 'whitewerewolf'
          ? 0xf1c40f
          : win === 'piedpiper'
            ? 0x9b59b6
            : win === 'pyromaniac'
              ? 0xe74c3c
              : win === 'sectarian'
                ? 0x8e44ad
                : 0x57f287;

    const embed = new EmbedBuilder()
    .setTitle('Partie terminée')
    .setDescription(
      `${desc}\n\nLes **fils privés** (joueurs + meute) ont été supprimés.`
    )
    .addFields(
      {
        name: '🏆 Gagnants (tout le camp, vivants et morts)',
        value: buildWinnersField(session, win),
        inline: false,
      },
      {
        name: '📋 Résumé de la partie',
        value: buildSummaryField(session, win),
        inline: false,
      }
    )
    .setColor(color);

  await textChannel.send({
    content: `<@${session.hostId}> — Tu peux **relancer un lobby** ici ou **fermer la partie** (scène + salon technique).`,
    embeds: [embed],
    components: [row],
  });

  void postGameEnded(session, win).catch((err) =>
    console.error('[stats-api] postGameEnded', err)
  );
}

export async function handleAfterGameReplay(
  interaction: ButtonInteraction
): Promise<void> {
  const parts = interaction.customId.split(':');
  const gameChannelId = parts[1] ?? interaction.channelId;
  const session = getSessionByTextChannel(gameChannelId);
  if (!session || session.phase !== 'ended') {
    await interaction.reply({
      content: 'Partie introuvable ou déjà relancée.',
      ephemeral: true,
    });
    return;
  }

  const member =
    interaction.member instanceof GuildMember ? interaction.member : null;
  if (!canUsePostGameButtons(interaction.user.id, session.hostId, member)) {
    await interaction.reply({
      content: 'Seul l’hôte ou un modérateur (**Gérer les salons**) peut faire ça.',
      ephemeral: true,
    });
    return;
  }

  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: 'Erreur serveur.', ephemeral: true });
    return;
  }

  const gameChId = session.textChannelId;
  const fetched = await guild.channels.fetch(gameChId).catch(() => null);
  if (!fetched?.isTextBased() || fetched.isDMBased()) {
    await interaction.reply({ content: 'Salon de partie introuvable.', ephemeral: true });
    return;
  }
  const stageCh = fetched as GuildTextBasedChannel;
  const { stage, threadParent } = await fetchPartyChannels(guild, session);
  if (!stage || !threadParent) {
    await interaction.reply({
      content: 'Salons de partie introuvables.',
      ephemeral: true,
    });
    return;
  }

  const hostId = session.hostId;
  const guildId = session.guildId;
  const parentId = session.parentCategoryId;
  const threadParentId = session.threadParentChannelId;

  const prevConfig = cloneCompositionConfig(session.compositionConfig);
  const previousPlayerIds = [...session.players.keys()];
  const voiceId = session.voiceChannelId;

  cancelAllForChannel(gameChId);
  removeSession(gameChId);

  const newSession = new GameSession(
    gameChId,
    threadParentId,
    guildId,
    parentId,
    hostId
  );
  newSession.compositionConfig = prevConfig;
  newSession.voiceChannelId = voiceId ?? gameChId;
  newSession.presetPublicCode = session.presetPublicCode;

  const prevRoles = new Map<string, Role>();
  for (const [uid, p] of session.players) {
    prevRoles.set(uid, p.role);
  }
  if (prevRoles.size > 0) {
    newSession.lastGameRoleByUserId = prevRoles;
  }

  const ordered = [
    hostId,
    ...previousPlayerIds.filter((id) => id !== hostId),
  ];
  const seen = new Set<string>();
  for (const uid of ordered) {
    if (seen.has(uid)) continue;
    seen.add(uid);
    if (newSession.lobbyPlayers.size >= MAX_PLAYERS) break;
    newSession.lobbyPlayers.add(uid);
    await grantPlayerGameAccess(stage, threadParent, uid).catch(() => undefined);
  }

  registerSession(newSession);
  await sendLobbyMessage(stageCh, newSession);

  const uniquePrev = new Set(previousPlayerIds);
  let msg =
    `**Lobby relancé** — **${newSession.lobbyPlayers.size}** joueur(s) de la partie précédente réinscrit(s) automatiquement, **mêmes paramètres** (\`/lg-config\` inchangé).\n` +
    `**Rejoindre** / **Quitter** : boutons du lobby · lancer avec **Lancer la partie**, \`/lg-start\` ou \`*start\` quand tout le monde est prêt.`;
  if (uniquePrev.size > MAX_PLAYERS) {
    msg += `\n⚠️ Limite **${MAX_PLAYERS}** joueurs : certains n’ont pas été réinscrits.`;
  }

  await interaction.update({
    content: msg,
    embeds: [],
    components: [],
  });
}

export async function handleAfterGameClose(
  client: Client,
  interaction: ButtonInteraction
): Promise<void> {
  const parts = interaction.customId.split(':');
  const gameChannelId = parts[1] ?? interaction.channelId;
  const session = getSessionByTextChannel(gameChannelId);
  if (!session) {
    await interaction.reply({ content: 'Partie déjà fermée.', ephemeral: true });
    return;
  }

  const member =
    interaction.member instanceof GuildMember ? interaction.member : null;
  if (!canUsePostGameButtons(interaction.user.id, session.hostId, member)) {
    await interaction.reply({
      content: 'Seul l’hôte ou un modérateur (**Gérer les salons**) peut faire ça.',
      ephemeral: true,
    });
    return;
  }

  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: 'Erreur serveur.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();
  await interaction.message
    .edit({
      content: 'Suppression de la scène et du salon technique…',
      embeds: [],
      components: [],
    })
    .catch(() => undefined);

  cancelAllForChannel(session.textChannelId);
  await deleteAllGameThreads(client, session);
  removeSession(session.textChannelId);
  try {
    const { stage, threadParent } = await fetchPartyChannels(guild, session);
    if (threadParent && stage) {
      await deleteGamePartyChannels(threadParent, stage);
    }
  } catch (e) {
    console.warn('[post-game] Suppression des salons de partie échouée :', e);
  }
}

