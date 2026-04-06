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
import { ROLES } from "@/lib/game/roles";
import type { RoomState } from "@/types/game";

const ROLE_SHOWCASE = [
  "werewolf", "big_bad_wolf", "infected_wolf", "white_wolf", "dog_wolf",
  "seer", "witch", "hunter", "cupid", "little_girl", "red_riding_hood",
  "fox", "raven", "guard", "doctor", "rusty_sword_knight", "thief",
  "wild_child", "pied_piper", "pyromaniac", "sectarian", "two_sisters",
  "three_brothers", "actor", "elder", "idiot", "angel", "necromancer",
  "devoted_servant", "dictateur", "hackeur", "bear_tamer", "scapegoat",
] as const;

const CAMP_BORDER: Record<string, string> = {
  wolves:  "#c0392b",
  village: "#c9a84c",
  solo:    "#c9870a",
};

const ROLE_CARD_SIZE = 112;

function RoleCardMini({ roleKey }: { roleKey: string }) {
  const role = ROLES[roleKey as keyof typeof ROLES];
  if (!role) return null;
  const border = CAMP_BORDER[role.camp];
  return (
    <div
      className="role-card shrink-0"
      style={{
        width: ROLE_CARD_SIZE,
        border: `2px solid ${border}`,
        boxShadow: `0 0 12px ${border}33, 0 4px 16px rgba(0,0,0,0.7)`,
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Zone image strictement carrée (largeur = hauteur) */}
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {role.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={role.image}
            alt={role.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              background: `${border}15`,
            }}
          >
            {role.icon}
          </div>
        )}
      </div>
      <div
        style={{
          padding: "5px 6px",
          background: `linear-gradient(to top, ${border}44, transparent)`,
          fontSize: 8,
          fontWeight: 800,
          color: border,
          textAlign: "center",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          lineHeight: 1.25,
        }}
      >
        {role.name}
      </div>
    </div>
  );
}

export default function LobbyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const { room } = useGameStore();

  useEffect(() => {
    if (room && room.status !== "lobby") router.push(`/game/${room.roomId}`);
  }, [room, router]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ color: "var(--text-muted)" }}>Chargement…</div>
      </div>
    );
  }

  const user = session.user;

  return (
    <div className="min-h-screen flex flex-col" suppressHydrationWarning>

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav
        className="glass sticky top-0 z-30 px-6 py-3 flex items-center justify-between"
        style={{ borderRadius: 0, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "1px solid var(--gold-dim)" }}
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              overflow: "hidden",
              border: "2px solid var(--wolf-red)",
              boxShadow: "0 0 12px rgba(192,57,43,0.4)",
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/roles/loup_garou.png"
              alt="BotWolf"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            />
          </div>
          <span
            className="font-black text-xl tracking-tight"
            style={{ letterSpacing: "-0.01em" }}
          >
            <span style={{ color: "var(--text-primary)" }}>Bot</span>
            <span style={{ color: "#9d5bff" }}>Wolf</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Avatar src={user.image ?? null} name={user.name ?? "?"} size={32} />
          <span className="text-sm hidden sm:block" style={{ color: "var(--text-muted)" }}>{user.name}</span>
          <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
            Déconnexion
          </Button>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">

        {/* ── Active room banner ───────────────────────────────── */}
        {room && room.status === "lobby" && (
          <div
            className="glass glass-hover rounded-xl p-4 mb-6 flex items-center justify-between"
            style={{ border: "1px solid var(--gold-dim)" }}
          >
            <div>
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--gold)" }}>Salle actuelle</div>
              <div className="font-bold" style={{ color: "var(--text-primary)" }}>{room.name ?? "Ma partie"}</div>
              <div className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                Code : <span className="font-mono" style={{ color: "var(--gold-bright)" }}>{room.code}</span>
                {" · "}{room.players.length}/{room.maxPlayers} joueurs
              </div>
            </div>
            <Button onClick={() => router.push(`/game/${room.roomId}`)}>
              Rejoindre →
            </Button>
          </div>
        )}

        {/* ── Hero ────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black mb-2" style={{ color: "var(--text-primary)" }}>
            Choisissez votre destin
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Créez une partie ou rejoignez-en une avec un code secret.
          </p>
        </div>

        {/* ── Action cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">

          {/* Create */}
          <button
            onClick={() => setShowCreate(true)}
            className="glass glass-hover rounded-2xl overflow-hidden text-left cursor-pointer group"
            style={{ border: "1px solid var(--wolf-red)", padding: 0 }}
          >
            <div style={{ height: 120, overflow: "hidden", position: "relative" }}>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex",
                gap: 0,
              }}>
                {(["loup_garou", "loup_blanc", "loup_noir"] as const).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img}
                    src={`/roles/${img}.png`}
                    alt=""
                    style={{
                      flex: 1,
                      objectFit: "cover",
                      objectPosition: "top",
                      filter: "brightness(0.6)",
                      transition: "filter 0.3s",
                    }}
                  />
                ))}
              </div>
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to bottom, transparent 30%, rgba(7,5,15,0.95) 100%)",
              }} />
              <div style={{
                position: "absolute", bottom: 12, left: 16,
                fontSize: 22, fontWeight: 900,
                color: "var(--text-primary)",
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              }}>
                Créer une partie
              </div>
            </div>
            <div style={{ padding: "10px 16px 14px" }}>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Configurez les rôles, définissez les règles et invitez vos amis.
              </p>
            </div>
          </button>

          {/* Join */}
          <button
            onClick={() => setShowJoin(true)}
            className="glass glass-hover rounded-2xl overflow-hidden text-left cursor-pointer group"
            style={{ border: "1px solid var(--gold-dim)", padding: 0 }}
          >
            <div style={{ height: 120, overflow: "hidden", position: "relative" }}>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex",
              }}>
                {(["voyante", "sorciere", "chasseur"] as const).map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img}
                    src={`/roles/${img}.png`}
                    alt=""
                    style={{
                      flex: 1,
                      objectFit: "cover",
                      objectPosition: "top",
                      filter: "brightness(0.6)",
                    }}
                  />
                ))}
              </div>
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to bottom, transparent 30%, rgba(7,5,15,0.95) 100%)",
              }} />
              <div style={{
                position: "absolute", bottom: 12, left: 16,
                fontSize: 22, fontWeight: 900,
                color: "var(--text-primary)",
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              }}>
                Rejoindre avec un code
              </div>
            </div>
            <div style={{ padding: "10px 16px 14px" }}>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Entrez le code secret de la salle privée.
              </p>
            </div>
          </button>
        </div>

        {/* ── Role showcase ─────────────────────────────────────── */}
        <div className="mb-10">
          <div className="ornament mb-4">
            <span className="text-xs uppercase tracking-widest px-2" style={{ color: "var(--gold)" }}>
              Rôles disponibles
            </span>
          </div>
          <div
            className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide"
            style={{ cursor: "grab" }}
          >
            {ROLE_SHOWCASE.map((key) => (
              <RoleCardMini key={key} roleKey={key} />
            ))}
          </div>
        </div>

        {/* ── Public rooms ─────────────────────────────────────── */}
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
  const [rooms] = useState<RoomState[]>([]);

  const joinPublic = (code: string) => {
    const socket = getSocket(userId, username, avatar);
    socket.emit("room:join", code, (res) => {
      if (res.ok && res.roomId) router.push(`/game/${res.roomId}`);
    });
  };

  return (
    <div>
      <div className="ornament mb-4">
        <span className="text-xs uppercase tracking-widest px-2" style={{ color: "var(--gold)" }}>
          Parties publiques
        </span>
      </div>

      {rooms.length === 0 ? (
        <div
          className="glass rounded-xl p-8 text-center"
          style={{ border: "1px solid var(--border)" }}
        >
          <div style={{ fontSize: 40, marginBottom: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/roles/villageois.png"
              alt="Village vide"
              style={{
                width: 60,
                height: 60,
                objectFit: "cover",
                objectPosition: "top",
                borderRadius: 8,
                margin: "0 auto",
                border: "1px solid var(--border)",
                filter: "grayscale(0.4)",
              }}
            />
          </div>
          <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
            Aucune partie publique en attente.
          </p>
          <p className="text-xs" style={{ color: "var(--border-glow)" }}>
            Créez-en une pour rassembler le village !
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rooms.map((r) => (
            <div
              key={r.roomId}
              className="glass glass-hover rounded-xl p-4 flex items-center justify-between"
              style={{ border: "1px solid var(--gold-dim)" }}
            >
              <div>
                <div className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {r.name ?? "Partie sans nom"}
                </div>
                <div className="text-sm" style={{ color: "var(--text-muted)" }}>
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
