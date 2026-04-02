import 'dotenv/config';

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Variable d'environnement manquante: ${name}`);
  return v;
}

export const discordToken = requireEnv('DISCORD_TOKEN');
export const clientId = requireEnv('CLIENT_ID');

/**
 * IDs serveurs : enregistrement slash **uniquement** sur ces serveurs (effet immédiat).
 * `GUILD_ID=id1,id2` ou séparées par des espaces (doublons ignorés).
 * Les commandes **globales** sont vidées pour éviter les doublons.
 * **Vide (défaut)** : au démarrage, le bot pousse les / sur **chaque** serveur où il est (immédiat) ;
 * plus besoin d’attendre la propagation globale (~1 h).
 */
const GUILD_IDS_PARSED = (() => {
  const raw = (process.env.GUILD_ID ?? '').trim();
  if (!raw) return [] as string[];
  return raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
})();

/** Premier `GUILD_ID` (compatibilité, diagnostic). */
export const guildId = GUILD_IDS_PARSED[0] ?? '';

/** IDs uniques (évite d’enregistrer deux fois le même serveur si GUILD_ID est dupliqué). */
export function guildIdsForSlashDeploy(): string[] {
  return [...new Set(GUILD_IDS_PARSED)];
}

function parseBoolEnv(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/**
 * Active l’intent **Message Content** + les commandes `*…` en texte.
 * Sans ça, le bot ne demande pas cet intent (évite `Used disallowed intents` si tu ne l’as pas coché dans le portail).
 * Pour utiliser `*setup`, etc. : mets `PREFIX_COMMANDS=true` et active *Message Content Intent* sur la page Bot.
 */
export const enablePrefixCommands = parseBoolEnv('PREFIX_COMMANDS');

/**
 * URL de base du site Next.js (sans slash final), pour l’API interne stats / grades.
 * Si vide, le bot n’envoie pas les fins de partie et ne vérifie pas les paliers.
 */
export const statsApiBaseUrl = (process.env.STATS_API_BASE_URL ?? '').trim();

/** Secret partagé avec `INTERNAL_API_SECRET` du frontend (header Authorization Bearer). */
export const statsApiSecret = (process.env.INTERNAL_API_SECRET ?? '').trim();

export function statsApiEnabled(): boolean {
  return Boolean(statsApiBaseUrl && statsApiSecret);
}

export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 18;

/** Timeout actions de nuit (ms) */
export const NIGHT_ACTION_MS = 90_000;

/** Timeout vote de jour (ms) */
export const DAY_VOTE_MS = 120_000;
