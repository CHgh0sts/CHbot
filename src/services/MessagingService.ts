import {
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type TextBasedChannel,
} from 'discord.js';

export function publicEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0x5865f2)
    .setTimestamp();
}

export function buildAlivePlayerSelect(
  customId: string,
  placeholder: string,
  aliveIds: string[],
  idToLabel: Map<string, string>,
  excludeIds: Set<string>
): StringSelectMenuBuilder {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .setMinValues(1)
    .setMaxValues(1);

  for (const id of aliveIds) {
    if (excludeIds.has(id)) continue;
    const label = idToLabel.get(id) ?? id;
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(label.slice(0, 100))
        .setValue(id)
    );
  }

  return menu;
}

export async function safeReplyChannel(
  channel: TextBasedChannel,
  content: string,
  embed?: EmbedBuilder
): Promise<void> {
  const payload: { content: string; embeds?: EmbedBuilder[] } = { content };
  if (embed) payload.embeds = [embed];
  if ('send' in channel && typeof channel.send === 'function') {
    await channel.send(payload);
  }
}
