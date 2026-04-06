"use client";
import { useGameStore } from "@/lib/gameStore";

const PHASE_CONFIG = {
  lobby: { icon: "🏠", label: "Lobby", bg: "phase-night", text: "En attente de joueurs…" },
  night: { icon: "🌙", label: "Nuit", bg: "phase-night", text: "Le village dort…" },
  day: { icon: "☀️", label: "Jour", bg: "phase-day", text: "Les villageois débattent." },
  vote: { icon: "🗳️", label: "Vote", bg: "phase-vote", text: "Qui doit partir ?" },
  finished: { icon: "🎉", label: "Fin", bg: "phase-night", text: "Partie terminée !" },
} as const;

export function PhaseBanner() {
  const { room, nightPhase } = useGameStore();
  if (!room) return null;

  const cfg = PHASE_CONFIG[room.status] ?? PHASE_CONFIG.lobby;

  const subPhaseLabels: Record<string, string> = {
    werewolves: "🐺 Les Loups-Garous se réveillent",
    seer: "🔮 La Voyante scrute",
    witch: "🧙‍♀️ La Sorcière agit",
    doctor: "⚕️ Le Docteur soigne",
    guard: "🛡️ Le Garde du Corps protège",
    cupid: "💘 Cupidon choisit les amoureux",
    hackeur: "💻 Le Hackeur cible sa victime",
    fox: "🦊 Le Renard flairen",
    raven: "🐦‍⬛ Le Corbeau désigne",
    necromancer: "💀 Le Nécromancien consulte les morts",
    white_wolf: "🤍 Le Loup Blanc agit",
    infected: "🧟 L'Infect Père choisit",
    actor: "🎭 L'Acteur joue un rôle",
    bear: "🐻 L'Ours fait le tour",
    thief: "🥷 Le Voleur agit",
    wild_child: "🌿 L'Enfant sauvage choisit son modèle",
    big_bad_wolf: "🐺 Le Grand méchant loup frappe",
    pied_piper: "🎵 Le Joueur de flûte ensorcelle",
    pyromaniac: "🔥 Le Pyromane prépare son feu",
    sectarian: "☠️ Le Sectaire inspecte",
  };

  return (
    <div className={`glass ${cfg.bg} p-4 rounded-xl mb-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-float">{cfg.icon}</span>
          <div>
            <div className="font-bold text-lg">
              {cfg.label}
              {room.round > 0 && room.status !== "lobby" && room.status !== "finished" && (
                <span className="text-sm font-normal text-gray-400 ml-2">Nuit/Jour {room.round}</span>
              )}
            </div>
            <div className="text-sm text-gray-400">
              {room.status === "night" && nightPhase
                ? subPhaseLabels[nightPhase] ?? "Phase nocturne"
                : cfg.text}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500">
            {room.players.filter((p) => p.isAlive).length} survivants
          </div>
          <div className="text-xs text-gray-600">
            {room.players.length} joueurs
          </div>
        </div>
      </div>
    </div>
  );
}
