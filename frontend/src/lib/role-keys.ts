/** Aligné sur l’enum `Role` du bot Discord. */
export const BOT_ROLE_KEYS = [
  'WEREWOLF',
  'VILLAGER',
  'SEER',
  'WITCH',
  'HUNTER',
  'CUPID',
  'GUARD',
  'THIEF',
  'ANGEL',
  'LITTLE_GIRL',
] as const;

export type BotRoleKey = (typeof BOT_ROLE_KEYS)[number];

export const BOT_ROLE_LABELS_FR: Record<BotRoleKey, string> = {
  WEREWOLF: 'Loup-Garou',
  VILLAGER: 'Villageois',
  SEER: 'Voyante',
  WITCH: 'Sorcière',
  HUNTER: 'Chasseur',
  CUPID: 'Cupidon',
  GUARD: 'Garde',
  THIEF: 'Voleur',
  ANGEL: 'Ange',
  LITTLE_GIRL: 'Petite fille',
};

export function isBotRoleKey(s: string): s is BotRoleKey {
  return (BOT_ROLE_KEYS as readonly string[]).includes(s);
}
