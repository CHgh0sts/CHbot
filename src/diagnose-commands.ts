/**
 * Affiche les commandes slash enregistrées chez Discord pour ton bot.
 * Compare avec ce que tu vois (ou pas) dans le client Discord.
 *
 * Usage : npm run diagnose
 */
import { REST, Routes } from 'discord.js';
import { clientId, discordToken, guildIdsForSlashDeploy } from './config';

async function main(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(discordToken);

  console.log('CLIENT_ID (application) :', clientId);
  console.log('');

  const guildIds = guildIdsForSlashDeploy();
  if (guildIds.length > 0) {
    console.log(
      'Mode : commandes **du serveur** (GUILD_ID — mise à jour rapide)'
    );
    for (const gid of guildIds) {
      console.log(`\n--- Serveur ${gid} ---`);
      try {
        const cmds = (await rest.get(
          Routes.applicationGuildCommands(clientId, gid)
        )) as { name: string; description: string }[];
        printList(cmds);
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        console.error('Erreur API :', err?.status, err?.message ?? e);
        if (err?.status === 403 || err?.status === 404) {
          console.error(
            '\n→ Souvent : le bot n’est **pas** sur ce serveur, ou le GUILD_ID est faux.'
          );
          console.error(
            '→ Vérifie que le bot est invité sur le serveur dont tu as copié l’ID.'
          );
        }
        process.exitCode = 1;
      }
    }
    try {
      const globalCmds = (await rest.get(
        Routes.applicationCommands(clientId)
      )) as { name: string }[];
      if (globalCmds.length > 0) {
        console.log('\n--- Commandes GLOBALES (hors serveur) ---');
        console.warn(
          `⚠ ${globalCmds.length} commande(s) globale(s) encore enregistrée(s) → **doublons** possibles dans le client.\n` +
            '  Redémarre le bot ou lance `npm run deploy` : avec GUILD_ID, les globales sont maintenant **vidées** automatiquement.'
        );
        for (const c of globalCmds) {
          console.log(`  /${c.name}`);
        }
      } else {
        console.log(
          '\n✓ Aucune commande globale (cohérent avec GUILD_ID — pas de doublon de ce côté).'
        );
      }
    } catch {
      /* ignore */
    }
  } else {
    console.log(
      'Mode : **pas de GUILD_ID** — les / sont enregistrées **par serveur** au démarrage du bot (immédiat).'
    );
    console.log(
      'Pour lister les commandes d’un serveur précis : GUILD_ID=id_du_serveur npm run diagnose\n'
    );
    try {
      const globalCmds = (await rest.get(
        Routes.applicationCommands(clientId)
      )) as { name: string; description: string }[];
      if (globalCmds.length === 0) {
        console.log(
          '✓ Aucune commande **globale** (normal : sync par guilde après démarrage du bot).'
        );
      } else {
        console.log('--- Commandes GLOBALES (inattendu si le bot a déjà tourné) ---');
        printList(globalCmds);
      }
    } catch (e) {
      console.error('Erreur API :', e);
      process.exitCode = 1;
    }
  }

  console.log('\n---');
  console.log(
    'Si la liste contient lg-init, lg-start, etc. mais Discord ne les propose pas :'
  );
  console.log(
    '• Même CLIENT_ID que l’app où tu as copié le token (Portail Discord → ton application).'
  );
  console.log(
    '• Invitation du bot avec scope applications.commands (voir COMMANDES.md).'
  );
  console.log('• Essai sur discord.com/app (navigateur) ou Ctrl+R sur l’app.');
}

function printList(cmds: { name: string; description: string }[]): void {
  if (!cmds.length) {
    console.log('\n⚠ Aucune commande enregistrée. Lance : npm run deploy\n');
    return;
  }
  console.log(`\n${cmds.length} commande(s) côté Discord :\n`);
  for (const c of cmds) {
    console.log(`  /${c.name} — ${c.description ?? ''}`);
  }
}

main().catch(console.error);
