"use client";
import { useEffect, useRef } from "react";
import { useGameStore } from "@/lib/gameStore";

export function AnnouncementFeed() {
  const { announcements } = useGameStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [announcements]);

  const typeColors: Record<string, string> = {
    death: "border-red-800/50 bg-red-950/20",
    phase_change: "border-violet-800/50 bg-violet-950/20",
    system: "border-gray-700/50 bg-gray-900/20",
    vote_result: "border-orange-800/50 bg-orange-950/20",
    game_over: "border-yellow-600/50 bg-yellow-950/30",
    role_reveal: "border-blue-700/50 bg-blue-950/20",
  };

  return (
    <div className="flex flex-col gap-2 overflow-y-auto max-h-full pr-1">
      {announcements.map((ann) => (
        <div
          key={ann.id}
          className={`rounded-lg border p-3 text-sm ${typeColors[ann.type] ?? typeColors.system}`}
        >
          <p className="text-gray-200 whitespace-pre-wrap">{ann.message}</p>
          <p className="text-xs text-gray-600 mt-1">
            {new Date(ann.timestamp).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        </div>
      ))}
      {announcements.length === 0 && (
        <p className="text-gray-600 text-sm text-center mt-4">Aucune annonce pour le moment.</p>
      )}
      <div ref={endRef} />
    </div>
  );
}
