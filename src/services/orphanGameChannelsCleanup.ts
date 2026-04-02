import { ChannelType, type Client } from 'discord.js';
import { getSessionByTextChannel } from '../game/GameManager';
import {
  LG_GAME_CHANNEL_PREFIX,
  LG_THREAD_PARENT_SUFFIX,
  deleteGamePartyChannels,
  deleteGameTextChannel,
} from './ChannelService';

/**
 * Après un **redémarrage**, les `GameSession` en mémoire sont perdus : les salons
 * `lg-*` créés par `/lg-init` ne peuvent plus fonctionner. On les supprime pour
 * éviter des salons « fantômes ».
 */
export async function cleanupOrphanGameChannels(client: Client): Promise<void> {
  const guilds = [...client.guilds.cache.values()];
  let removed = 0;
  const filsDeletedWithStage = new Set<string>();

  for (const guild of guilds) {
    try {
      await guild.channels.fetch();
    } catch (e) {
      console.warn(
        `[cleanup] Chargement des salons impossible (${guild.name}) :`,
        e
      );
      continue;
    }

    for (const ch of guild.channels.cache.values()) {
      if (!ch.name.startsWith(LG_GAME_CHANNEL_PREFIX)) continue;
      if (getSessionByTextChannel(ch.id)) continue;
      if (ch.type !== ChannelType.GuildStageVoice) continue;

      const filsName = `${ch.name}${LG_THREAD_PARENT_SUFFIX}`.slice(0, 100);
      const fils = guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildText &&
          c.name === filsName &&
          c.parentId === ch.parentId
      );

      try {
        if (fils && !getSessionByTextChannel(fils.id)) {
          filsDeletedWithStage.add(fils.id);
          await deleteGamePartyChannels(
            fils as import('discord.js').TextChannel,
            ch as import('discord.js').StageChannel
          );
        } else {
          await ch.delete('Redémarrage du bot — partie sans état en mémoire');
        }
        removed++;
        console.log(
          `[cleanup] Scène orpheline supprimée : #${ch.name} — ${guild.name} (${guild.id})`
        );
      } catch (e) {
        console.warn(
          `[cleanup] Suppression impossible : #${ch.name} (${guild.name})`,
          e
        );
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    for (const ch of guild.channels.cache.values()) {
      if (!ch.name.startsWith(LG_GAME_CHANNEL_PREFIX)) continue;
      if (!ch.name.endsWith(LG_THREAD_PARENT_SUFFIX)) continue;
      if (ch.type !== ChannelType.GuildText) continue;
      if (getSessionByTextChannel(ch.id)) continue;
      if (filsDeletedWithStage.has(ch.id)) continue;

      try {
        await deleteGameTextChannel(
          ch as import('discord.js').TextChannel,
          'Redémarrage du bot — salon technique orphelin'
        );
        removed++;
        console.log(
          `[cleanup] Salon -fils orphelin supprimé : #${ch.name} — ${guild.name}`
        );
      } catch (e) {
        console.warn(`[cleanup] Suppression -fils impossible : #${ch.name}`, e);
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  if (removed > 0) {
    console.log(
      `[cleanup] Terminé : **${removed}** salon(s) de partie orphelin(s) traité(s).`
    );
  } else {
    console.log('[cleanup] Aucun salon lg-* orphelin à supprimer.');
  }
}
