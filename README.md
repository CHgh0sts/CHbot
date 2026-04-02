# Botwolf — Loup-Garou (Thiercelieux) pour Discord

Bot [discord.js](https://discord.js.org/) v14 en TypeScript : parties dans un salon dédié, **rôles et actions dans des fils privés** sous ce salon (pas de MP), annonces publiques dans le salon de partie.

## Prérequis

- Node.js 18+
- **Slash `/`** : aucun intent privilégié requis.
- **Préfixe `*`** (optionnel) : dans `.env` mets `PREFIX_COMMANDS=true` **et** active **Message Content Intent** sur le portail (**Bot** → *Privileged Gateway Intents*). Sinon tu obtiens `Used disallowed intents` au démarrage.
- Au **démarrage**, le bot enregistre les slash **sur chaque serveur** où il est (effet **immédiat**). Optionnel : `GUILD_ID` pour ne cibler que certains serveurs.

## Dépannage

| Erreur | Cause probable |
|--------|----------------|
| `TokenInvalid` | Token faux, expiré ou régénéré : **Bot** → *Reset Token*, copie la valeur dans `.env` sur **une seule ligne**, sans guillemets, sans espace autour du `=`. |
| `Used disallowed intents` | Souvent : **Message Content** demandé sans être coché sur le portail. Enlève `PREFIX_COMMANDS=true` du `.env` ou active *Message Content Intent* (page **Bot**). |
| « Cette commande est obsolète » (slash) | Souvent un **ancien** déploiement global : redémarre le bot (les globales sont vidées, sync par serveur). **Ctrl+R** dans Discord. Voir [COMMANDES.md](COMMANDES.md). |

## Configuration

1. Copie `.env.example` vers `.env`.
2. Renseigne :
   - `DISCORD_TOKEN` : token du bot (Discord Developer Portal → Bot).
   - `CLIENT_ID` : ID de l’application (section « OAuth2 » ou « General Information »).
3. **Optionnel** : `GUILD_ID` pour n’enregistrer les slash **que** sur ces serveurs. Sans `GUILD_ID`, le bot pousse les / sur **tous** les serveurs au démarrage (immédiat). Plusieurs IDs : `GUILD_ID=id1,id2`.

## Installation

```bash
npm install
npm run deploy
npm run build
npm start
```

En développement : `npm run dev` (recharge avec [tsx](https://github.com/privatenumber/tsx)).

## Invitation du bot

URL (remplace `CLIENT_ID`) :

`https://discord.com/oauth2/authorize?client_id=CLIENT_ID&permissions=93200&scope=bot%20applications.commands`

`93200` inclut notamment : **Gérer les salons**, **Voir les salons**, **Envoyer des messages**, **Gérer les messages**, **Intégrer des liens**, **Lire l’historique**. Ajuste au besoin dans les paramètres du serveur. Les **fils privés** sont créés sous le salon de partie (permissions du salon).

## Utilisation

1. Dans un salon du serveur : `/lg-init` — un **nouveau salon** est créé **dans la même catégorie** (nom optionnel, **preset** optionnel = code 5 car. depuis le site, salon vocal optionnel pour le `/lg-join`).
2. L’hôte peut utiliser `/lg-config` en lobby pour le **minimum de joueurs**, le nombre de **loups** et les **rôles spéciaux** (voyante, sorcière, chasseur).
3. Les joueurs vont dans le **salon texte créé** et font `/lg-join` (jusqu’à 18 joueurs ; minimum pour lancer selon la config, souvent 6 par défaut).
4. L’hôte lance `/lg-start` — chaque joueur reçoit son rôle dans **son fil privé** ; les loups votent dans le **fil Meute**.
5. La partie enchaîne **nuits** (voyante, loups, sorcière) et **jours** (vote dans le fil de chaque joueur) jusqu’à victoire village ou loups.
6. `/lg-end` supprime le **salon de partie** (hôte ou modérateur avec **Gérer les salons**).

## Règles implémentées (résumé)

- Composition : loups, rôles spéciaux optionnels, villageois ; nombre de loups et minimum de joueurs réglables avec `/lg-config` (sinon table type Thiercelieux).
- Victoire loups : nombre de loups vivants ≥ nombre de non-loups vivants.
- Victoire village : plus aucun loup vivant.

Les joueurs doivent pouvoir **voir le salon de partie** (et les fils qui y sont rattachés) pour recevoir rôles et actions.
