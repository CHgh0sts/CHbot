"use client";
import { useGameStore } from "@/lib/gameStore";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useRouter } from "next/navigation";

export function GameOverOverlay() {
  const { gameOver, room } = useGameStore();
  const router = useRouter();

  if (!gameOver) return null;

  const { winner, winnerIds } = gameOver;
  const winners = room?.players.filter((p) => winnerIds.includes(p.id)) ?? [];

  const configs = {
    village: { emoji: "🏡", title: "Le Village Gagne !", color: "#22c55e", bg: "from-green-950 to-[var(--bg-base)]" },
    wolves: { emoji: "🐺", title: "Les Loups-Garous Gagnent !", color: "#ef4444", bg: "from-red-950 to-[var(--bg-base)]" },
    solo: { emoji: "🌟", title: "Victoire Solitaire !", color: "#f59e0b", bg: "from-yellow-950 to-[var(--bg-base)]" },
  };

  const cfg = configs[winner];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)" }}
    >
      <div className="glass p-8 max-w-md w-full text-center mx-4">
        <div className="text-6xl mb-4 animate-float">{cfg.emoji}</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: cfg.color }}>
          {cfg.title}
        </h2>

        <div className="my-6">
          <p className="text-gray-400 text-sm mb-3">Gagnants :</p>
          <div className="flex flex-wrap justify-center gap-3">
            {winners.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1">
                <Avatar src={p.avatar} name={p.username} size={44} />
                <span className="text-xs text-gray-300">{p.username}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => router.push("/lobby")}>
            Retour au lobby
          </Button>
          <Button onClick={() => router.push("/")}>
            Accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
