import type { CompositionConfig } from "@/types/game";
import { DEFAULT_CONFIG } from "@/types/game";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Nombre de places occupées par des rôles non-villageois (loups + optionnels, sœurs/frères comptés). */
export function countCompositionSlots(c: CompositionConfig): number {
  let n = c.werewolfCount;
  if (c.includeInfectedWolf) n++;
  if (c.includeWhiteWolf) n++;
  if (c.includeDogWolf) n++;
  if (c.includeSeer) n++;
  if (c.includeWitch) n++;
  if (c.includeHunter) n++;
  if (c.includeCupid) n++;
  if (c.includeLittleGirl) n++;
  if (c.includeElder) n++;
  if (c.includeScapegoat) n++;
  if (c.includeIdiot) n++;
  if (c.includeDoctor) n++;
  if (c.includeGuard) n++;
  if (c.includeNecromancer) n++;
  if (c.includeDevotedServant) n++;
  if (c.includeAngel) n++;
  if (c.includeBearTamer) n++;
  if (c.includeFox) n++;
  if (c.includeRaven) n++;
  if (c.includeActor) n++;
  if (c.includeDictateur) n++;
  if (c.includeHackeur) n++;
  if (c.includeThief) n++;
  if (c.includeRedRidingHood) n++;
  if (c.includeBigBadWolf) n++;
  if (c.includePiedPiper) n++;
  if (c.includeRustySwordKnight) n++;
  if (c.includeWildChild) n++;
  if (c.includePyromaniac) n++;
  if (c.includeTwoSisters) n += 2;
  if (c.includeThreeBrothers) n += 3;
  if (c.includeSectarian) n++;
  return n;
}

const MAX_PARTY_PLAYERS = 24;
const MIN_PARTY_PLAYERS = 4;

/**
 * Ajuste `playerCount` et `werewolfCount` pour que le nombre de joueurs couvre au moins
 * toutes les places réservées (loups + rôles spéciaux), entre 4 et 24.
 * À utiliser côté UI quand on ajoute / retire des rôles pour rester aligné avec le serveur.
 */
export function ensureMinPlayerCountForSlots(c: CompositionConfig): CompositionConfig {
  const slots = countCompositionSlots(c);
  const minPc = Math.max(MIN_PARTY_PLAYERS, slots);
  let playerCount = Math.max(c.playerCount, minPc);
  playerCount = Math.min(MAX_PARTY_PLAYERS, playerCount);
  const maxWolves = Math.max(1, Math.floor(playerCount / 3));
  const werewolfCount = clamp(c.werewolfCount, 1, maxWolves);
  return { ...c, playerCount, werewolfCount };
}

/**
 * Fusionne une config partielle avec les défauts, borne les nombres et assure
 * playerCount >= nombre de rôles fixes (sinon la partie ne pourrait pas démarrer).
 */
export function normalizeCompositionConfig(raw: unknown): CompositionConfig {
  const base: CompositionConfig = { ...DEFAULT_CONFIG };

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    const rec = base as unknown as Record<string, unknown>;
    for (const k of Object.keys(base) as (keyof CompositionConfig)[]) {
      const v = r[k as string];
      if (v === undefined || v === null) continue;
      const key = k as string;
      if (typeof rec[key] === "boolean" && typeof v === "boolean") {
        rec[key] = v;
      }
      if (typeof rec[key] === "number" && typeof v === "number" && Number.isFinite(v)) {
        rec[key] = v;
      }
    }
  }

  base.playerCount = clamp(
    Math.floor(base.playerCount) || DEFAULT_CONFIG.playerCount,
    MIN_PARTY_PLAYERS,
    MAX_PARTY_PLAYERS
  );
  const maxWolves = Math.max(1, Math.floor(base.playerCount / 3));
  base.werewolfCount = clamp(
    Math.floor(base.werewolfCount) || 1,
    1,
    maxWolves
  );

  const slots = countCompositionSlots(base);
  if (slots > 24) {
    throw new Error(
      "Trop de rôles pour une partie (plus de 24 places). Réduisez les options ou les loups."
    );
  }
  if (slots > base.playerCount) {
    base.playerCount = clamp(slots, MIN_PARTY_PLAYERS, MAX_PARTY_PLAYERS);
  }

  return base;
}
