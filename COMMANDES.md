# Liste des commandes — Botwolf

Tu peux jouer avec les **commandes slash** (`/lg-init`, etc.). Les **messages** avec préfixe **`*`** (`*init`, `*setup`, …) ne sont disponibles que si `PREFIX_COMMANDS=true` dans `.env` et l’intent Message Content est activé sur le portail (voir section préfixe ci‑dessous).

---

## Enregistrement auto des `/` au démarrage

Quand tu lances **`npm run dev`** ou **`npm start`**, le bot tente d’**enregistrer les commandes slash** chez Discord (comme `npm run deploy`). Vérifie la console : un message `[slash] … commande(s) enregistrée(s)` confirme que c’est bon ; sinon lance manuellement `npm run deploy` ou corrige `.env` (`DISCORD_TOKEN`, `CLIENT_ID`, optionnellement `GUILD_ID`).

---

## Commandes texte (préfixe `*`)

| Message | Équivalent slash | Remarque |
|--------|------------------|----------|
| `*lg-init`, `*init` ou `*setup` [code?] [nom] | `/lg-init` | Si le **premier mot** est un **code à 5 caractères** (A–Z, 2–9), il est pris comme **preset** du site ; le reste est le **nom** (ex. `*init 3XK9P ma-soirée`). Sinon tout le texte = **nom** (ex. `*setup ma-partie`). Pas de choix vocal en texte. |
| `*lg-config` ou `*config` | `/lg-config` | Sans options : affiche la composition actuelle (comme le slash sans paramètres). Pour modifier, utilise le **slash** avec les options. |
| `*lg-join` ou `*join` | `/lg-join` | |
| `*lg-leave` ou `*leave` | `/lg-leave` | |
| `*lg-start` ou `*start` | `/lg-start` | |
| `*lg-end` ou `*end` | `/lg-end` | |
| `*lg-status` ou `*status` | `/lg-status` | |

Les réponses sont **publiques** dans le salon (pas comme les réponses éphémères des slash).

**Activation** : dans `.env`, `PREFIX_COMMANDS=true`, et sur le [portail](https://discord.com/developers/applications) → **Bot** → coche **Message Content Intent**. Sans ces deux points, laisse `PREFIX_COMMANDS` absent ou `false` : le bot démarre sans cet intent et tu utilises uniquement les **`/`** (sinon erreur `Used disallowed intents`).

---

## Les commandes `/` n’apparaissent pas sur le serveur

Les slash ne viennent **pas** tout seuls : il faut les **enregistrer chez Discord** (au démarrage du bot ou avec `npm run deploy`) et inviter le bot correctement.

1. **Enregistrer les commandes** : au lancement du bot (`npm run dev` / `npm start`) **ou** manuellement (à refaire après chaque changement de liste de commandes) :
   ```bash
   npm run deploy
   ```
   Le script utilise `DISCORD_TOKEN` et `CLIENT_ID` dans ton fichier `.env`.

2. **Mise à jour immédiate** : par défaut, au **démarrage** le bot enregistre les `/` **sur chaque serveur** où il est (pas de latence « globale » ~1 h). Optionnel : `GUILD_ID=id` dans `.env` pour ne cibler **que** ces serveurs ; puis `npm run deploy` si tu veux pousser sans lancer le bot.

3. **Invitation du bot** : le lien d’invitation doit inclure le scope **`applications.commands`** (sinon Discord n’affiche pas les slash pour ce bot). Exemple de fin d’URL :
   `&scope=bot%20applications.commands`  
   Si le bot a été ajouté **sans** ce scope, retire-le du serveur et réinvite-le avec une URL qui contient **bot** + **applications.commands**.

4. **Vérifier** : tape `/` dans un salon texte du serveur ; tu peux filtrer avec le nom du bot. Redémarre l’app Discord (Ctrl+R) si besoin.

5. **Diagnostic automatique** (vérifie ce que Discord a vraiment enregistré) :
   ```bash
   npm run diagnose
   ```
   - Si tu vois `lg-init`, `lg-join`, etc. mais **pas** dans Discord → problème d’**invitation** (`applications.commands`), de **mauvais serveur**, ou de **cache** (essaie [discord.com/app](https://discord.com/app) dans le navigateur).
   - Si la liste est **vide** → sans `GUILD_ID`, mets `GUILD_ID=id_du_serveur` le temps du diagnostic, ou redémarre le bot (sync sur toutes les guildes).

6. **Token et CLIENT_ID** : ils doivent venir de la **même** application sur le [portail développeur](https://discord.com/developers/applications) (onglet **Bot** pour le token, **OAuth2** ou page d’accueil pour l’**ID de l’application**). Si tu mélanges deux apps, le bot tourne avec un token mais les commandes sont enregistrées sur une autre → rien ne s’affiche pour le bon bot.

7. **Menu `/` vide** : après avoir tapé `/`, une colonne peut lister les **applications** ; choisis **ton bot** dans cette liste, puis retape `lg` — les commandes sont groupées par bot.

8. **« Cette commande est obsolète… »** : redémarre le bot (les commandes globales sont vidées, les `/` sont repoussées **par serveur**). Puis **Ctrl+R** dans Discord ou [discord.com/app](https://discord.com/app). Tu peux aussi **changer de salon texte** pour rafraîchir la liste.

---

## `/lg-init`

| | |
|---|---|
| **Rôle** | Crée un **nouveau salon texte** pour la partie, **dans la même catégorie** que le salon où tu as tapé la commande (si le salon n’a pas de catégorie, le salon est créé au même niveau). Les **permissions** du salon créé **reproduisent** celles du salon où la commande est utilisée (surcharges copiées, comme un copier-coller des droits). |
| **Qui peut l’utiliser** | Membres ayant la permission **Gérer les salons** sur le serveur. |
| **Options** | • **nom** (optionnel) : nom affiché pour la partie.<br>• **preset** (optionnel) : **code à 5 caractères** d’une config enregistrée sur le **site** (frontend Botwolf) ; applique la composition (équivalent d’un `/lg-config` prérempli). Le bot doit avoir `STATS_API_BASE_URL` et `INTERNAL_API_SECRET` identiques au site.<br>• **vocal** (optionnel) : salon vocal lié ; si défini, les joueurs devront être **connectés à ce vocal** pour `/lg-join`. |
| **Effet** | Un **message public** est envoyé dans le salon où tu as tapé la commande, avec un **lien cliquable** vers le nouveau salon. L’auteur est ajouté au lobby ; les autres joueurs ouvrent le salon via ce lien puis utilisent `/lg-join`. |

---

## `/lg-config`

| | |
|---|---|
| **Rôle** | En **lobby**, configure la **composition** : nombre **minimum** de joueurs pour lancer, nombre de **loups** (fixe ou **auto** au lancement), présence de la **voyante**, **sorcière**, **chasseur**. Le reste des rôles sont des **villageois** simples. |
| **Qui peut l’utiliser** | L’**hôte** **ou** un membre avec **Gérer le serveur**. |
| **Condition** | Partie en **lobby** dans **ce** salon (celui créé par `/lg-init`). Sans option : affiche la config actuelle. |
| **Options** | **min_joueurs** (4–18), **loups** (1–10), **loups_auto** (oui = nombre de loups recalculé automatiquement au lancement), **voyante** / **sorciere** / **chasseur** (oui/non). |

---

## `/lg-join`

| | |
|---|---|
| **Rôle** | **Rejoindre** la partie en cours de préparation (lobby) dans **ce** salon texte. |
| **Condition** | Une partie doit exister ici (`/lg-init` a créé ce salon) et être encore en phase **lobby**. |
| **Effet** | Ajoute ton compte aux joueurs inscrits (jusqu’à **18** joueurs) et te donne l’accès au salon. Si un vocal a été lié à la partie, tu dois y être connecté au moment du `/lg-join`. |

---

## `/lg-leave`

| | |
|---|---|
| **Rôle** | **Quitter** le lobby **avant** le début de la partie. |
| **Condition** | Partie en **lobby** dans ce salon. |
| **Effet** | Tu es retiré de la liste des joueurs et ton accès au salon peut être révoqué. |

---

## `/lg-start`

| | |
|---|---|
| **Rôle** | **Lancer** la partie : attribution des rôles et début du cycle nuit / jour. |
| **Qui peut l’utiliser** | L’**hôte** (celui qui a fait `/lg-init`) **ou** un membre avec la permission **Gérer le serveur**. |
| **Condition** | Au moins autant de joueurs que le **minimum** défini (par défaut **6**, modifiable avec `/lg-config`). |
| **Effet** | Chaque joueur reçoit son rôle dans un **fil privé** sous le salon de partie. **Aucun MP** : voyante, loups (fil **Meute** partagé), sorcière, vote du jour et chasseur utilisent aussi des **fils privés** ou le fil meute. |

---

## `/lg-end`

| | |
|---|---|
| **Rôle** | **Arrêter** la partie et **supprimer** le salon texte de la partie. |
| **Qui peut l’utiliser** | L’**hôte** **ou** un membre avec la permission **Gérer les salons**. |
| **Effet** | Annule les attentes en cours (votes / actions) et supprime le salon créé pour cette partie (la catégorie du serveur n’est pas supprimée). |

---

## `/lg-status`

| | |
|---|---|
| **Rôle** | Afficher un **résumé** de l’état de la partie liée à ce salon. |
| **Affichage** | En **lobby** : nombre d’inscrits + résumé de la composition. Pendant la partie : phase (nuit / jour / terminé), nombre de vivants, nombre de loups vivants. |

---

## Interactions hors slash (rappel)

Ce ne sont pas des commandes `/`, mais elles font partie du jeu :

| Contexte | Utilité |
|----------|---------|
| **Menus / boutons** dans **ton fil privé** | Voyante, sorcière, vote du jour, tir du chasseur. |
| **Fil « Meute — Loups-Garous »** | Votes des loups (tous les loups y sont invités). |

Tout se passe dans les **fils** rattachés au salon de partie — **pas de message privé Discord (MP)**.
