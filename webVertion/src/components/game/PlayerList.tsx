"use client";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ROLES } from "@/lib/game/roles";
import type { PublicPlayer } from "@/types/game";
import { useGameStore } from "@/lib/gameStore";

interface Props {
  players: PublicPlayer[];
  myId: string;
  onPlayerClick?: (id: string) => void;
  clickable?: boolean;
}

export function PlayerList({ players, myId, onPlayerClick, clickable }: Props) {
  const { myInfo, room, currentVotes } = useGameStore();

  return (
    <div className="flex flex-col gap-2">
      {players.map((p) => {
        const isMe = p.id === myId;
        const votedByMe = currentVotes[myId] === p.id;
        const voteCount = Object.values(currentVotes).filter((v) => v === p.id).length;
        const role = p.roleKey ? ROLES[p.roleKey] : null;

        return (
          <div
            key={p.id}
            onClick={() => clickable && p.isAlive && p.id !== myId && onPlayerClick?.(p.id)}
            className={`glass p-3 flex items-center gap-3 transition-all
              ${!p.isAlive ? "opacity-40" : ""}
              ${clickable && p.isAlive && p.id !== myId ? "cursor-pointer glass-hover" : ""}
              ${votedByMe ? "border-red-500/50 shadow-red-900/20 shadow-md" : ""}
              ${isMe ? "border-violet-500/30" : ""}
            `}
          >
            <div className="relative">
              <Avatar src={p.avatar} name={p.username} size={36} />
              {!p.isConnected && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gray-600 border-2 border-[var(--bg-panel)]" />
              )}
              {p.isConnected && p.isAlive && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[var(--bg-panel)]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`font-medium text-sm truncate ${isMe ? "text-violet-300" : ""}`}>
                  {p.username}
                  {isMe && <span className="text-xs text-gray-500 ml-1">(vous)</span>}
                </span>
                {p.isHost && <span title="Hôte" className="text-yellow-400 text-xs">👑</span>}
                {!p.isAlive && <span className="text-xs text-gray-500">☠️ mort</span>}
              </div>

              {role && !p.isAlive && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {role.icon} {role.name}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {voteCount > 0 && room?.status === "vote" && (
                <Badge color="#ef4444">🗳️ {voteCount}</Badge>
              )}
              {role && !p.isAlive && (
                <Badge color={role.color}>{role.icon}</Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
