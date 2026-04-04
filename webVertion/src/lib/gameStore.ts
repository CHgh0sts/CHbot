"use client";
import { create } from "zustand";
import type {
  RoomState,
  PrivatePlayer,
  GameAnnouncement,
  ChatMessage,
  NightSubPhase,
  Camp,
} from "@/types/game";

interface GameStore {
  // Room
  room: RoomState | null;
  setRoom: (room: RoomState) => void;
  updateRoom: (partial: Partial<RoomState>) => void;

  // Private info
  myInfo: PrivatePlayer | null;
  setMyInfo: (info: PrivatePlayer) => void;

  // Announcements
  announcements: GameAnnouncement[];
  addAnnouncement: (ann: GameAnnouncement) => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;

  // Phase UI
  myTurn: NightSubPhase | null;
  myTurnTimeout: number;
  setMyTurn: (phase: NightSubPhase | null, timeout?: number) => void;

  // Votes
  currentVotes: Record<string, string>;
  setVotes: (votes: Record<string, string>) => void;

  // Game over
  gameOver: { winner: Camp; winnerIds: string[] } | null;
  setGameOver: (data: { winner: Camp; winnerIds: string[] }) => void;

  // Voice
  voiceUsers: Set<string>;
  addVoiceUser: (id: string) => void;
  removeVoiceUser: (id: string) => void;

  // Night phase info
  nightPhase: NightSubPhase | null;
  nightActors: string[];
  setNightPhase: (phase: NightSubPhase | null, actors?: string[]) => void;

  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  room: null,
  setRoom: (room) => set({ room }),
  updateRoom: (partial) =>
    set((state) => ({ room: state.room ? { ...state.room, ...partial } : state.room })),

  myInfo: null,
  setMyInfo: (info) => set({ myInfo: info }),

  announcements: [],
  addAnnouncement: (ann) =>
    set((state) => ({
      announcements: [...state.announcements.slice(-100), ann],
    })),

  chatMessages: [],
  addChatMessage: (msg) =>
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-200), msg],
    })),

  myTurn: null,
  myTurnTimeout: 90,
  setMyTurn: (phase, timeout = 90) =>
    set({ myTurn: phase, myTurnTimeout: timeout }),

  currentVotes: {},
  setVotes: (votes) => set({ currentVotes: votes }),

  gameOver: null,
  setGameOver: (data) => set({ gameOver: data }),

  voiceUsers: new Set(),
  addVoiceUser: (id) =>
    set((state) => ({ voiceUsers: new Set([...state.voiceUsers, id]) })),
  removeVoiceUser: (id) =>
    set((state) => {
      const s = new Set(state.voiceUsers);
      s.delete(id);
      return { voiceUsers: s };
    }),

  nightPhase: null,
  nightActors: [],
  setNightPhase: (phase, actors = []) =>
    set({ nightPhase: phase, nightActors: actors }),

  reset: () =>
    set({
      room: null,
      myInfo: null,
      announcements: [],
      chatMessages: [],
      myTurn: null,
      myTurnTimeout: 90,
      currentVotes: {},
      gameOver: null,
      voiceUsers: new Set(),
      nightPhase: null,
      nightActors: [],
    }),
}));
