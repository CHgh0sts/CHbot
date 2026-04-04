export enum Role {
  Werewolf = 'WEREWOLF',
  Villager = 'VILLAGER',
  Seer = 'SEER',
  Witch = 'WITCH',
  Hunter = 'HUNTER',
  Cupid = 'CUPID',
  Guard = 'GUARD',
  Thief = 'THIEF',
  Angel = 'ANGEL',
  LittleGirl = 'LITTLE_GIRL',
  Raven = 'RAVEN',
  RedRidingHood = 'RED_RIDING_HOOD',
}

export type GamePhase = 'lobby' | 'night' | 'day' | 'ended';

export type NightSubPhase =
  | 'none'
  | 'thief'
  | 'seer'
  | 'angel'
  | 'guard'
  | 'wolves'
  | 'witch'
  | 'raven';

export interface PlayerState {
  userId: string;
  displayName: string;
  role: Role;
  alive: boolean;
  /** Partenaire désigné par le Cupidon (les deux ont le même lien mutuel) */
  loverUserId: string | null;
}
