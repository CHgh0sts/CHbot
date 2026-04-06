"use client";
import { useState, useEffect } from "react";
import { useGameStore } from "@/lib/gameStore";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import type { NightActionRequest, NightSubPhase, PublicPlayer } from "@/types/game";
import { ROLES } from "@/lib/game/roles";

interface Props {
  submitAction: (action: NightActionRequest) => void;
  myId: string;
}

const SUB_PHASE_LABELS: Record<NightSubPhase, string> = {
  werewolves: "🐺 Choisissez votre victime",
  seer: "🔮 Inspectez un joueur",
  witch: "🧙‍♀️ Utilisez vos potions",
  doctor: "⚕️ Protégez un joueur",
  guard: "🛡️ Protégez un joueur",
  cupid: "💘 Choisissez deux amoureux",
  hackeur: "💻 Ciblez votre victime",
  fox: "🦊 Pointez un groupe de 3",
  raven: "🐦‍⬛ Désignez un joueur (+2 votes)",
  necromancer: "💀 Communiquez avec les morts",
  white_wolf: "🤍 Éliminez un loup",
  infected: "🧟 Infectez ou laissez mourir",
  actor: "🎭 Choisissez un rôle à jouer",
  bear: "🐻 (passif)",
  thief: "🥷 Choisissez qui voler",
  wild_child: "🌿 Choisissez votre modèle",
  big_bad_wolf: "🐺 Seconde victime (GML)",
  pied_piper: "🎵 Ensorcellez 2 joueurs",
  pyromaniac: "🔥 Arrosez ou déclenchez l'incendie",
  sectarian: "☠️ Inspectez un joueur (groupe A/B)",
};

const SUB_PHASE_COLORS: Record<NightSubPhase, string> = {
  werewolves: "#ef4444",
  seer: "#a855f7",
  witch: "#06b6d4",
  doctor: "#38bdf8",
  guard: "#64748b",
  cupid: "#ec4899",
  hackeur: "#00ff88",
  fox: "#f97316",
  raven: "#1e293b",
  necromancer: "#7c3aed",
  white_wolf: "#e5e7eb",
  infected: "#dc2626",
  actor: "#e879f9",
  bear: "#92400e",
  thief: "#64748b",
  wild_child: "#65a30d",
  big_bad_wolf: "#991b1b",
  pied_piper: "#7c3aed",
  pyromaniac: "#ea580c",
  sectarian: "#581c87",
};

export function ActionSidebar({ submitAction, myId }: Props) {
  const { myTurn, myTurnTimeout, room, myInfo } = useGameStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [witchChoice, setWitchChoice] = useState<"heal" | "kill" | "pass" | null>(null);
  const [pyroChoice, setPyroChoice] = useState<"douse" | "ignite" | null>(null);
  const [dogCampChoice, setDogCampChoice] = useState<"wolves" | "village" | null>(null);
  const [timeLeft, setTimeLeft] = useState(myTurnTimeout);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSelected([]);
    setWitchChoice(null);
    setPyroChoice(null);
    setDogCampChoice(null);
    setSubmitted(false);
    setTimeLeft(myTurnTimeout);
  }, [myTurn, myTurnTimeout]);

  useEffect(() => {
    if (!myTurn || submitted) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [myTurn, submitted]);

  if (!myTurn || submitted) return null;

  const alivePlayers = room?.players.filter((p) => p.isAlive && p.id !== myId) ?? [];
  const aliveWolves = room?.players.filter((p) => p.isAlive && p.roleKey && ROLES[p.roleKey]?.camp === "wolves" && p.id !== myId) ?? [];
  const color = SUB_PHASE_COLORS[myTurn] ?? "#7c3aed";

  const toggleSelect = (id: string) => {
    if (myTurn === "cupid" || myTurn === "pied_piper") {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev
      );
    } else {
      setSelected([id]);
    }
  };

  const handleSubmit = () => {
    let action: NightActionRequest;

    switch (myTurn) {
      case "witch":
        action = {
          subPhase: myTurn,
          choice: witchChoice ?? "pass",
          targetId: witchChoice === "kill" ? selected[0] : undefined,
        };
        break;
      case "cupid":
        if (selected.length !== 2) return;
        action = { subPhase: myTurn, targetIds: selected };
        break;
      case "infected":
        action = {
          subPhase: myTurn,
          choice: witchChoice === "heal" ? "infect" : "pass",
          targetId: selected[0],
        };
        break;
      case "pied_piper":
        if (selected.length !== 2) return;
        action = { subPhase: myTurn, targetIds: selected };
        break;
      case "pyromaniac":
        if (pyroChoice === "ignite") {
          action = { subPhase: myTurn, choice: "ignite" };
        } else {
          if (!selected[0]) return;
          action = { subPhase: myTurn, targetId: selected[0] };
        }
        break;
      case "hackeur":
        if (myInfo?.roleKey === "dog_wolf") {
          if (!dogCampChoice) return;
          action = { subPhase: myTurn, choice: dogCampChoice };
        } else {
          action = { subPhase: myTurn, targetId: selected[0] };
        }
        break;
      default:
        action = { subPhase: myTurn, targetId: selected[0] };
    }

    submitAction(action);
    setSubmitted(true);
  };

  const renderTargets = (targets: PublicPlayer[]) =>
    targets.map((p) => (
      <button
        key={p.id}
        onClick={() => toggleSelect(p.id)}
        className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all text-left ${
          selected.includes(p.id)
            ? "border-opacity-100 bg-opacity-15"
            : "border-[var(--border)] hover:border-opacity-50"
        }`}
        style={
          selected.includes(p.id)
            ? { borderColor: color, backgroundColor: `${color}20`, color }
            : {}
        }
      >
        <Avatar src={p.avatar} name={p.username} size={28} />
        <span>{p.username}</span>
        {p.roleKey && !p.isAlive && (
          <span className="ml-auto text-xs text-gray-500">{ROLES[p.roleKey]?.icon}</span>
        )}
      </button>
    ));

  const progressPct = (timeLeft / myTurnTimeout) * 100;

  return (
    <div
      className="fixed right-0 top-0 bottom-0 w-80 glass border-l shadow-2xl flex flex-col z-40"
      style={{ borderColor: `${color}40` }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: `${color}30` }}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold" style={{ color }}>
            {SUB_PHASE_LABELS[myTurn]}
          </span>
          <span
            className={`text-sm font-mono ${timeLeft < 15 ? "text-red-400 animate-pulse" : "text-gray-400"}`}
          >
            {timeLeft}s
          </span>
        </div>
        {/* Timer bar */}
        <div className="h-1 rounded-full bg-[var(--bg-base)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${progressPct}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {/* Witch special UI */}
        {myTurn === "witch" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-400 mb-1">Que souhaitez-vous faire ?</p>
            {[
              { key: "heal" as const, label: "💊 Sauver la victime de la nuit", disabled: myInfo?.camp === undefined },
              { key: "kill" as const, label: "☠️ Empoisonner un joueur", disabled: false },
              { key: "pass" as const, label: "⏭️ Ne rien faire", disabled: false },
            ].map((opt) => (
              <button
                key={opt.key}
                disabled={opt.disabled}
                onClick={() => setWitchChoice(opt.key)}
                className={`p-3 rounded-lg border text-sm text-left transition-all ${
                  witchChoice === opt.key
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                    : "border-[var(--border)] text-gray-300 hover:border-gray-500"
                } disabled:opacity-40`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Chien-loup — même créneau que Hackeur nuit 1 */}
        {myTurn === "hackeur" && myInfo?.roleKey === "dog_wolf" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-400 mb-1">Choisissez votre camp pour toute la partie :</p>
            {[
              { key: "village" as const, label: "🏡 Village" },
              { key: "wolves" as const, label: "🐺 Meute (Loups)" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setDogCampChoice(opt.key)}
                className={`p-3 rounded-lg border text-sm text-left transition-all ${
                  dogCampChoice === opt.key
                    ? "border-orange-500 bg-orange-500/10 text-orange-200"
                    : "border-[var(--border)] text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Pyromane */}
        {myTurn === "pyromaniac" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-400 mb-1">Arroser un joueur ou déclencher l&apos;incendie ?</p>
            {[
              { key: "douse" as const, label: "🛢️ Arroser (choisissez une cible ci-dessous)" },
              { key: "ignite" as const, label: "🔥 Déclencher l&apos;incendie (tous les arrosés meurent)" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPyroChoice(opt.key)}
                className={`p-3 rounded-lg border text-sm text-left transition-all ${
                  pyroChoice === opt.key
                    ? "border-orange-600 bg-orange-600/10 text-orange-200"
                    : "border-[var(--border)] text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Infected special UI */}
        {myTurn === "infected" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-400 mb-1">Infecter la victime ou la laisser mourir ?</p>
            {[
              { key: "heal" as const, label: "🧟 Infecter (elle devient loup)" },
              { key: "pass" as const, label: "💀 Laisser mourir" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setWitchChoice(opt.key)}
                className={`p-3 rounded-lg border text-sm text-left transition-all ${
                  witchChoice === opt.key
                    ? "border-red-500 bg-red-500/10 text-red-300"
                    : "border-[var(--border)] text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Target selection */}
        {(() => {
          const showTargets =
            (myTurn !== "witch" || witchChoice === "kill") &&
            myTurn !== "necromancer" &&
            !(myTurn === "pyromaniac" && pyroChoice === "ignite") &&
            !(myTurn === "hackeur" && myInfo?.roleKey === "dog_wolf");
          return showTargets;
        })() ? (
          <div className="flex flex-col gap-2">
            {(myTurn === "cupid" || myTurn === "pied_piper") && (
              <p className="text-xs text-gray-500">
                Sélectionnez 2 joueurs ({selected.length}/2)
              </p>
            )}
            {(myTurn === "white_wolf" ? aliveWolves : alivePlayers).map((p) => (
              <button
                key={p.id}
                onClick={() => toggleSelect(p.id)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all text-left ${
                  selected.includes(p.id)
                    ? "border-opacity-80 bg-opacity-15"
                    : "border-[var(--border)] hover:border-gray-500"
                }`}
                style={selected.includes(p.id) ? { borderColor: color, backgroundColor: `${color}20`, color } : {}}
              >
                <Avatar src={p.avatar} name={p.username} size={28} />
                <span>{p.username}</span>
              </button>
            ))}
          </div>
        ) : null}

        {/* Necromancer — text only */}
        {myTurn === "necromancer" && (
          <p className="text-sm text-gray-400 italic">
            Utilisez le chat pour communiquer avec les morts. Ils peuvent vous répondre en privé.
          </p>
        )}
      </div>

      {/* Submit */}
      <div className="p-4 border-t" style={{ borderColor: `${color}30` }}>
        <Button
          className="w-full"
          style={{ backgroundColor: color, color: "#000" }}
          onClick={handleSubmit}
          disabled={(() => {
            if (myTurn === "cupid" || myTurn === "pied_piper")
              return selected.length !== 2;
            if (myTurn === "witch")
              return witchChoice === null || (witchChoice === "kill" && !selected[0]);
            if (myTurn === "infected")
              return witchChoice === null || !selected[0];
            if (myTurn === "necromancer") return false;
            if (myTurn === "pyromaniac")
              return (
                pyroChoice === null ||
                (pyroChoice === "douse" && !selected[0])
              );
            if (myTurn === "hackeur" && myInfo?.roleKey === "dog_wolf")
              return dogCampChoice === null;
            if (myTurn === "hackeur") return !selected[0];
            return !selected[0];
          })()}
        >
          Confirmer
        </Button>
        <button
          className="w-full mt-2 text-xs text-gray-600 hover:text-gray-400"
          onClick={() => setSubmitted(true)}
        >
          Passer (ne rien faire)
        </button>
      </div>
    </div>
  );
}
