"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useGameStore } from "@/lib/gameStore";
import { getSocket } from "@/lib/socket";
import { PhaseBanner } from "@/components/game/PhaseBanner";
import { PlayerList } from "@/components/game/PlayerList";
import { AnnouncementFeed } from "@/components/game/AnnouncementFeed";
import { ChatPanel } from "@/components/game/ChatPanel";
import { VoicePanel } from "@/components/game/VoicePanel";
import { ActionSidebar } from "@/components/game/ActionSidebar";
import { RoleCard } from "@/components/game/RoleCard";
import { GameOverOverlay } from "@/components/game/GameOverOverlay";
import { Button } from "@/components/ui/Button";
import type { NightActionRequest } from "@/types/game";

type Tab = "game" | "chat" | "voice";

export default function GamePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const { room, myInfo, myTurn, gameOver, setMyTurn } = useGameStore();
  const [tab, setTab] = useState<Tab>("game");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user) return;
    const socket = getSocket(
      session.user.id!,
      session.user.name ?? "Joueur",
      session.user.image ?? null
    );
    // Join the room if not already
    if (!room || room.roomId !== roomId) {
      socket.emit("room:join", roomId, (res) => {
        if (!res.ok) {
          router.push("/lobby");
        }
      });
    }
  }, [session, roomId]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-gray-500">Chargement…</span>
      </div>
    );
  }

  const user = session.user;
  const socket = getSocket(user.id!, user.name ?? "Joueur", user.image ?? null);

  const submitAction = (action: NightActionRequest) => {
    socket.emit("game:night_action", action);
    setMyTurn(null);
  };

  const submitVote = (targetId: string) => {
    socket.emit("game:vote", targetId);
  };

  const sendMessage = (text: string) => {
    socket.emit("chat:send", text);
  };

  const startGame = () => {
    setStarting(true);
    setStartError(null);
    socket.emit("game:start", (res) => {
      setStarting(false);
      if (!res.ok) setStartError(res.error ?? "Erreur");
    });
  };

  const leaveRoom = () => {
    socket.emit("room:leave");
    router.push("/lobby");
  };

  const isHost = room?.hostId === user.id;
  const isVotePhase = room?.status === "vote";
  const isLobby = room?.status === "lobby";
  const myPlayer = room?.players.find((p) => p.id === user.id);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="glass border-b border-[var(--border)] px-4 py-2 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-lg">🐺</span>
          <span className="font-bold hidden sm:block">{room?.name ?? "BotWolf"}</span>
          {room?.code && (
            <span className="text-xs font-mono text-violet-300 bg-violet-900/20 px-2 py-0.5 rounded border border-violet-700/30">
              {room.code}
            </span>
          )}
        </div>

        {/* Tab switcher (mobile) */}
        <div className="flex gap-1 sm:hidden">
          {(["game", "chat", "voice"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                tab === t ? "bg-violet-700 text-white" : "text-gray-400"
              }`}
            >
              {t === "game" ? "🎮" : t === "chat" ? "💬" : "🎤"}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={leaveRoom}>
          ← Quitter
        </Button>
      </nav>

      <div className="flex-1 flex overflow-hidden relative">
        {/* ── Left: Player list ───────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-[var(--border)] overflow-y-auto">
          <div className="p-3">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Joueurs ({room?.players.filter((p) => p.isAlive).length ?? 0} vivants)
            </h3>
            <PlayerList
              players={room?.players ?? []}
              myId={user.id!}
              onPlayerClick={isVotePhase ? submitVote : undefined}
              clickable={isVotePhase}
            />
          </div>
        </aside>

        {/* ── Center: Main game ────────────────────────────────────────────── */}
        <main className={`flex-1 flex flex-col overflow-hidden ${myTurn ? "pr-80" : ""}`}>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <PhaseBanner />

            {/* My role card (when game started) */}
            {myInfo && myInfo.roleKey && (
              <div>
                <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Votre rôle</h3>
                <RoleCard roleKey={myInfo.roleKey} />
              </div>
            )}

            {/* Lobby: waiting room */}
            {isLobby && (
              <div className="glass p-6 rounded-xl text-center">
                <div className="text-4xl mb-3">⏳</div>
                <h2 className="font-bold text-lg mb-1">Salle d'attente</h2>
                <p className="text-gray-400 text-sm mb-4">
                  {room?.players.length ?? 0}/{room?.maxPlayers ?? 16} joueurs connectés
                </p>

                {/* Player list in lobby */}
                <div className="flex flex-wrap justify-center gap-3 mb-6">
                  {room?.players.map((p) => (
                    <div key={p.id} className="flex flex-col items-center gap-1">
                      <div className="relative">
                        <img
                          src={p.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}&background=7c3aed&color=fff`}
                          alt={p.username}
                          className="w-10 h-10 rounded-full"
                        />
                        {p.isHost && (
                          <span className="absolute -top-1 -right-1 text-xs">👑</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-300">{p.username}</span>
                    </div>
                  ))}
                </div>

                {isHost ? (
                  <div>
                    {startError && <p className="text-red-400 text-sm mb-2">{startError}</p>}
                    <Button
                      size="lg"
                      onClick={startGame}
                      disabled={starting || (room?.players.length ?? 0) < 4}
                    >
                      {starting ? "Démarrage…" : "🚀 Lancer la partie"}
                    </Button>
                    {(room?.players.length ?? 0) < 4 && (
                      <p className="text-xs text-gray-500 mt-2">Minimum 4 joueurs requis.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    En attente du lancement par l'hôte…
                  </p>
                )}
              </div>
            )}

            {/* Vote phase: show player list with click */}
            {isVotePhase && (
              <div className="lg:hidden">
                <h3 className="text-sm font-medium text-red-400 mb-2">
                  🗳️ Votez — cliquez sur un joueur pour l'éliminer
                </h3>
                <PlayerList
                  players={room?.players.filter((p) => p.isAlive && p.id !== user.id) ?? []}
                  myId={user.id!}
                  onPlayerClick={submitVote}
                  clickable
                />
              </div>
            )}

            {/* Announcements */}
            {!isLobby && (
              <div>
                <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Journal</h3>
                <div className="h-64">
                  <AnnouncementFeed />
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ── Right: Chat & Voice ──────────────────────────────────────────── */}
        <aside className="hidden sm:flex flex-col w-72 border-l border-[var(--border)]">
          {/* Tabs */}
          <div className="flex border-b border-[var(--border)]">
            {[
              { id: "chat" as Tab, label: "💬 Chat" },
              { id: "voice" as Tab, label: "🎤 Vocal" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "border-b-2 border-violet-500 text-violet-300"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {tab === "chat" ? (
              <ChatPanel sendMessage={sendMessage} myId={user.id!} />
            ) : (
              <VoicePanel socket={socket} myId={user.id!} />
            )}
          </div>
        </aside>
      </div>

      {/* Night action sidebar */}
      {myTurn && (
        <ActionSidebar submitAction={submitAction} myId={user.id!} />
      )}

      {/* Game over */}
      {gameOver && <GameOverOverlay />}
    </div>
  );
}
