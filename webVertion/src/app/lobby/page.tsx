"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { CreateRoomModal } from "@/components/lobby/CreateRoomModal";
import { JoinRoomModal } from "@/components/lobby/JoinRoomModal";
import { useGameStore } from "@/lib/gameStore";
import { getSocket } from "@/lib/socket";
import type { RoomState } from "@/types/game";

export default function LobbyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const { room } = useGameStore();

  // If already in a room that started, redirect to game
  useEffect(() => {
    if (room && room.status !== "lobby") {
      router.push(`/game/${room.roomId}`);
    }
  }, [room, router]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Chargement…</div>
      </div>
    );
  }

  const user = session.user;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="glass border-b border-[var(--border)] px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐺</span>
          <span className="font-bold text-lg">BotWolf</span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar src={user.image ?? null} name={user.name ?? "?"} size={32} />
          <span className="text-sm text-gray-300 hidden sm:block">{user.name}</span>
          <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
            Déconnexion
          </Button>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Current room */}
        {room && room.status === "lobby" && (
          <div className="glass glass-hover p-4 mb-6 rounded-xl border-violet-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Salle actuelle</div>
                <div className="font-bold">{room.name ?? "Ma partie"}</div>
                <div className="text-sm text-gray-400 mt-0.5">
                  Code : <span className="font-mono text-violet-300">{room.code}</span>
                  {" · "}
                  {room.players.length}/{room.maxPlayers} joueurs
                </div>
              </div>
              <Button onClick={() => router.push(`/game/${room.roomId}`)}>
                Rejoindre →
              </Button>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">
            🐺 Lobby
          </h1>
          <p className="text-gray-400">Créez une partie ou rejoignez-en une avec un code.</p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => setShowCreate(true)}
            className="glass glass-hover p-6 rounded-2xl text-left flex flex-col gap-3 cursor-pointer"
          >
            <span className="text-4xl">➕</span>
            <div>
              <div className="font-bold text-lg">Créer une partie</div>
              <div className="text-sm text-gray-400">Configurez les rôles et invitez vos amis</div>
            </div>
          </button>

          <button
            onClick={() => setShowJoin(true)}
            className="glass glass-hover p-6 rounded-2xl text-left flex flex-col gap-3 cursor-pointer"
          >
            <span className="text-4xl">🔑</span>
            <div>
              <div className="font-bold text-lg">Rejoindre avec un code</div>
              <div className="text-sm text-gray-400">Entrez le code de la salle privée</div>
            </div>
          </button>
        </div>

        {/* Public rooms */}
        <PublicRoomsBrowser
          userId={user.id!}
          username={user.name ?? "Joueur"}
          avatar={user.image ?? null}
        />
      </main>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          userId={user.id!}
          username={user.name ?? "Joueur"}
          avatar={user.image ?? null}
        />
      )}
      {showJoin && (
        <JoinRoomModal
          onClose={() => setShowJoin(false)}
          userId={user.id!}
          username={user.name ?? "Joueur"}
          avatar={user.image ?? null}
        />
      )}
    </div>
  );
}

function PublicRoomsBrowser({
  userId,
  username,
  avatar,
}: {
  userId: string;
  username: string;
  avatar: string | null;
}) {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomState[]>([]);

  // In a real app, we'd fetch public rooms via API
  // For now, show a placeholder
  const joinPublic = (code: string) => {
    const socket = getSocket(userId, username, avatar);
    socket.emit("room:join", code, (res) => {
      if (res.ok && res.roomId) {
        router.push(`/game/${res.roomId}`);
      }
    });
  };

  return (
    <div>
      <h2 className="font-semibold text-gray-300 mb-3">Parties publiques</h2>
      {rooms.length === 0 ? (
        <div className="glass p-6 rounded-xl text-center">
          <p className="text-gray-500 text-sm">Aucune partie publique en attente.</p>
          <p className="text-gray-600 text-xs mt-1">Créez-en une pour commencer !</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rooms.map((r) => (
            <div key={r.roomId} className="glass glass-hover p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-medium">{r.name ?? "Partie sans nom"}</div>
                <div className="text-sm text-gray-400">
                  {r.players.length}/{r.maxPlayers} joueurs
                </div>
              </div>
              <Button size="sm" onClick={() => joinPublic(r.code)}>
                Rejoindre
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
