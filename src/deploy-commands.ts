import { deploySlashCommandsCli } from './registerSlashCommands';

async function main(): Promise<void> {
  await deploySlashCommandsCli();
}

main().catch((err) => {
  console.error('Échec du déploiement des commandes :', err);
  if (String(err?.message ?? err).includes('401')) {
    console.error(
      '→ Vérifie DISCORD_TOKEN (token du bot, pas le secret client OAuth2).'
    );
  }
  process.exitCode = 1;
});
