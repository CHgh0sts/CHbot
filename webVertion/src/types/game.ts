// ─── Enums ────────────────────────────────────────────────────────────────────

export type RoleKey =
  | "werewolf"
  | "villager"
  | "seer"
  | "witch"
  | "hunter"
  | "cupid"
  | "little_girl"
  | "elder"
  | "scapegoat"
  | "idiot"
  | "doctor"
  | "necromancer"
  | "devoted_servant"
  | "infected_wolf"
  | "dog_wolf"
  | "angel"
  | "white_wolf"
  | "bear_tamer"
  | "fox"
  | "raven"
  | "guard"
  | "actor"
  | "dictateur"
  | "hackeur"
  | "thief"
  | "red_riding_hood"
  | "big_bad_wolf"
  | "pied_piper"
  | "rusty_sword_knight"
  | "wild_child"
  | "pyromaniac"
  | "two_sisters"
  | "three_brothers"
  | "sectarian";

export type Camp = "village" | "wolves" | "solo";

export type GamePhase = "lobby" | "night" | "day" | "vote" | "finished";

export type NightSubPhase =
  | "cupid"
  | "hackeur"
  | "seer"
  | "guard"
  | "werewolves"
  | "infected"
  | "witch"
  | "doctor"
  | "necromancer"
  | "fox"
  | "raven"
  | "white_wolf"
  | "actor"
  | "bear"
  | "thief"
  | "wild_child"
  | "big_bad_wolf"
  | "pied_piper"
  | "pyromaniac"
  | "sectarian";

// ─── Role Definition ─────────────────────────────────────────────────────────

export interface RoleDef {
  key: RoleKey;
  name: string;
  camp: Camp;
  icon: string;
  color: string;
  image?: string;
  description: string;
  nightOrder?: number;
  hasNightAction: boolean;
}

// ─── Player (client-visible) ─────────────────────────────────────────────────

export interface PublicPlayer {
  id: string;
  username: string;
  avatar: string | null;
  isAlive: boolean;
  isHost: boolean;
  isConnected: boolean;
  roleKey?: RoleKey;  // only revealed when dead or game over
}

export interface PrivatePlayer extends PublicPlayer {
  roleKey: RoleKey;
  camp: Camp;
  loverPartnerId?: string | null;
  isProtected?: boolean;
}

// ─── Room State (broadcast to all) ───────────────────────────────────────────

export interface RoomState {
  roomId: string;
  code: string;
  name: string | null;
  isPublic: boolean;
  status: "lobby" | "night" | "day" | "vote" | "finished";
  hostId: string | null;
  players: PublicPlayer[];
  maxPlayers: number;
  round: number;
  config: CompositionConfig;
}

// ─── Game Events (broadcast) ─────────────────────────────────────────────────

export interface GameAnnouncement {
  id: string;
  type:
    | "death"
    | "phase_change"
    | "system"
    | "vote_result"
    | "game_over"
    | "role_reveal";
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

// ─── Night Action ────────────────────────────────────────────────────────────

export interface NightActionRequest {
  subPhase: NightSubPhase;
  targetId?: string;
  targetIds?: string[];
  choice?: string;
}

export interface NightPhaseInfo {
  subPhase: NightSubPhase;
  actorIds: string[];
  timeoutSec: number;
}

// ─── Composition Config ──────────────────────────────────────────────────────

export interface CompositionConfig {
  playerCount: number;
  werewolfCount: number;
  includeVillager: boolean;
  includeSeer: boolean;
  includeWitch: boolean;
  includeHunter: boolean;
  includeCupid: boolean;
  includeLittleGirl: boolean;
  includeElder: boolean;
  includeScapegoat: boolean;
  includeIdiot: boolean;
  includeDoctor: boolean;
  includeNecromancer: boolean;
  includeDevotedServant: boolean;
  includeInfectedWolf: boolean;
  includeDogWolf: boolean;
  includeAngel: boolean;
  includeWhiteWolf: boolean;
  includeBearTamer: boolean;
  includeFox: boolean;
  includeRaven: boolean;
  includeGuard: boolean;
  includeActor: boolean;
  includeDictateur: boolean;
  includeHackeur: boolean;
  includeThief: boolean;
  includeRedRidingHood: boolean;
  includeBigBadWolf: boolean;
  includePiedPiper: boolean;
  includeRustySwordKnight: boolean;
  includeWildChild: boolean;
  includePyromaniac: boolean;
  includeTwoSisters: boolean;
  includeThreeBrothers: boolean;
  includeSectarian: boolean;
}

export const DEFAULT_CONFIG: CompositionConfig = {
  playerCount: 8,
  werewolfCount: 2,
  includeVillager: true,
  includeSeer: true,
  includeWitch: true,
  includeHunter: false,
  includeCupid: false,
  includeLittleGirl: false,
  includeElder: false,
  includeScapegoat: false,
  includeIdiot: false,
  includeDoctor: false,
  includeNecromancer: false,
  includeDevotedServant: false,
  includeInfectedWolf: false,
  includeDogWolf: false,
  includeAngel: false,
  includeWhiteWolf: false,
  includeBearTamer: false,
  includeFox: false,
  includeRaven: false,
  includeGuard: false,
  includeActor: false,
  includeDictateur: false,
  includeHackeur: false,
  includeThief: false,
  includeRedRidingHood: false,
  includeBigBadWolf: false,
  includePiedPiper: false,
  includeRustySwordKnight: false,
  includeWildChild: false,
  includePyromaniac: false,
  includeTwoSisters: false,
  includeThreeBrothers: false,
  includeSectarian: false,
};

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:player_joined": (player: PublicPlayer) => void;
  "room:player_left": (playerId: string) => void;
  "room:player_connected": (playerId: string, connected: boolean) => void;
  "game:private_info": (info: PrivatePlayer) => void;
  "game:night_phase": (info: NightPhaseInfo) => void;
  "game:your_turn": (subPhase: NightSubPhase, timeoutSec: number) => void;
  "game:day_phase": (round: number) => void;
  "game:vote_phase": () => void;
  "game:vote_update": (votes: Record<string, string>) => void;
  "game:announcement": (announcement: GameAnnouncement) => void;
  "game:over": (winner: Camp, winnerIds: string[]) => void;
  "chat:message": (msg: ChatMessage) => void;
  "voice:signal": (fromId: string, signal: unknown) => void;
  "voice:user_joined": (playerId: string) => void;
  "voice:user_left": (playerId: string) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  "room:create": (
    data: { name?: string; isPublic: boolean; config: CompositionConfig },
    cb: (result: { ok: boolean; code?: string; error?: string }) => void
  ) => void;
  "room:join": (
    code: string,
    cb: (result: { ok: boolean; roomId?: string; error?: string }) => void
  ) => void;
  "room:leave": () => void;
  "room:kick": (targetPlayerId: string) => void;
  "game:start": (
    cb: (result: { ok: boolean; error?: string }) => void
  ) => void;
  "game:night_action": (action: NightActionRequest) => void;
  "game:vote": (targetId: string) => void;
  "game:servant_take_place": (take: boolean) => void;
  "game:hunter_shoot": (targetId: string) => void;
  "chat:send": (text: string) => void;
  "voice:join": () => void;
  "voice:signal": (toId: string, signal: unknown) => void;
  "voice:leave": () => void;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  username: string;
  avatar: string | null;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}
