import { REST, Routes, type Client } from 'discord.js';
import { clientId, discordToken, guildIdsForSlashDeploy } from './config';
import { slashCommands } from './commands/slashCommands';

function slashBody(): unknown[] {
  return [...slashCommands] as unknown[];
}

async function clearGlobalCommands(rest: REST): Promise<void> {
  await rest.put(Routes.applicationCommands(clientId), { body: [] });
}

async function putGuildCommands(rest: REST, guildId: string): Promise<void> {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: slashBody(),
  });
}

/**
 * Enregistre les / sur un seul serveur (nouvelle invitation, resync).
 * Ne vide pas les globales (déjà fait au démarrage ou via GUILD_ID).
 */
export async function registerSlashCommandsForGuild(
  guildId: string
): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(discordToken);
  await putGuildCommands(rest, guildId);
  console.log(
    `[slash] ${slashCommands.length} commande(s) sur le serveur ${guildId} (sync immédiate).`
  );
}

/**
 * Au démarrage du bot : même logique que `npm run deploy`.
 * Sans `GUILD_ID` : commandes **par serveur** pour chaque guilde en cache (effet immédiat),
 * globales vidées pour éviter doublons + latence ~1 h.
 */
export async function registerSlashCommands(client: Client): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(discordToken);
  const explicit = guildIdsForSlashDeploy();

  if (explicit.length > 0) {
    await clearGlobalCommands(rest);
    console.log(
      '[slash] Commandes **globales** vidées (évite les doublons avec GUILD_ID).'
    );
    for (const gid of explicit) {
      await putGuildCommands(rest, gid);
      console.log(
        `[slash] ${slashCommands.length} commande(s) sur le serveur ${gid} (effet immédiat).`
      );
    }
    return;
  }

  await clearGlobalCommands(rest);
  console.log(
    '[slash] Commandes **globales** vidées ; enregistrement **par serveur** (mise à jour immédiate).'
  );

  const ids = [...new Set(client.guilds.cache.map((g) => g.id))];
  if (ids.length === 0) {
    console.warn(
      '[slash] Aucun serveur pour l’instant ; les / seront poussées à l’arrivée sur un serveur (événement guildCreate).'
    );
    return;
  }

  for (const gid of ids) {
    await putGuildCommands(rest, gid);
  }
  console.log(
    `[slash] ${slashCommands.length} commande(s) sur ${ids.length} serveur(s).`
  );
}

/** Utilisé par `npm run deploy` (pas de client connecté). */
export async function deploySlashCommandsCli(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(discordToken);
  const explicit = guildIdsForSlashDeploy();

  if (explicit.length > 0) {
    await clearGlobalCommands(rest);
    console.log(
      'OK — commandes **globales** supprimées (sinon doublons avec les commandes du serveur).'
    );
    for (const gid of explicit) {
      await putGuildCommands(rest, gid);
      console.log(
        `OK — ${slashCommands.length} commande(s) sur le serveur ${gid} (mise à jour instantanée ; Ctrl+R si besoin).`
      );
    }
    return;
  }

  console.warn(
    '\nSans GUILD_ID : les commandes slash sont poussées **au démarrage du bot** sur chaque serveur (immédiat).\n' +
      'Pour forcer depuis ce script sans lancer le bot : GUILD_ID=id1,id2 puis relance npm run deploy.\n'
  );
  await clearGlobalCommands(rest);
  console.log(
    'OK — commandes **globales** vidées. Démarre le bot pour enregistrer les / sur chaque serveur.'
  );
}
