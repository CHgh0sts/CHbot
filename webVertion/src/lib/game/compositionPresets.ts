import type { CompositionConfig } from "@/types/game";
import { DEFAULT_CONFIG } from "@/types/game";

export interface CompositionPreset {
  id: string;
  name: string;
  description: string;
  config: CompositionConfig;
}

/**
 * Presets alignés sur les compositions habituelles du bot / formulaire site
 * (`defaultCompositionFormValues` : voyante, sorcière, chasseur, cupidon).
 */
export const COMPOSITION_PRESETS: CompositionPreset[] = [
  {
    id: "bot_classic",
    name: "Classique (comme le bot)",
    description:
      "8 joueurs, 2 loups — voyante, sorcière, chasseur et cupidon (équivalent défaut bot / lg-config).",
    config: {
      ...DEFAULT_CONFIG,
      playerCount: 8,
      werewolfCount: 2,
      includeSeer: true,
      includeWitch: true,
      includeHunter: true,
      includeCupid: true,
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "8 joueurs, 2 loups — voyante et sorcière seulement.",
    config: {
      ...DEFAULT_CONFIG,
      playerCount: 8,
      werewolfCount: 2,
      includeSeer: true,
      includeWitch: true,
      includeHunter: false,
      includeCupid: false,
    },
  },
  {
    id: "quick",
    name: "Rapide",
    description: "6 joueurs, 1 loup — voyante et sorcière.",
    config: {
      ...DEFAULT_CONFIG,
      playerCount: 6,
      werewolfCount: 1,
      includeSeer: true,
      includeWitch: true,
      includeHunter: false,
      includeCupid: false,
    },
  },
  {
    id: "extended",
    name: "Étendu",
    description: "12 joueurs, 3 loups — village riche (garde, chevalier, bouc, idiot…).",
    config: {
      ...DEFAULT_CONFIG,
      playerCount: 12,
      werewolfCount: 3,
      includeSeer: true,
      includeWitch: true,
      includeHunter: true,
      includeCupid: true,
      includeGuard: true,
      includeRustySwordKnight: true,
      includeScapegoat: true,
      includeIdiot: true,
      includeDoctor: false,
    },
  },
  {
    id: "tournament",
    name: "Grand groupe",
    description: "16 joueurs, 4 loups — classique + rôles annexes variés.",
    config: {
      ...DEFAULT_CONFIG,
      playerCount: 16,
      werewolfCount: 4,
      includeSeer: true,
      includeWitch: true,
      includeHunter: true,
      includeCupid: true,
      includeGuard: true,
      includeFox: true,
      includeRustySwordKnight: true,
      includeScapegoat: true,
      includeLittleGirl: true,
      includeRaven: true,
    },
  },
];

export const DEFAULT_PRESET_ID = "bot_classic";
