"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getSocket } from "@/lib/socket";

interface Props {
  onClose: () => void;
  userId: string;
  username: string;
  avatar: string | null;
}

export function JoinRoomModal({ onClose, userId, username, avatar }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      setError("Code invalide.");
      return;
    }
    setLoading(true);
    setError(null);
    const socket = getSocket(userId, username, avatar);
    socket.emit("room:join", trimmed, (res) => {
      setLoading(false);
      if (!res.ok) {
        setError(res.error ?? "Erreur");
        return;
      }
      router.push(`/game/${res.roomId}`);
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
    >
      <div className="glass w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Rejoindre une partie</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none">
            ×
          </button>
        </div>

        <label className="text-sm text-gray-400 mb-1 block">Code de la salle</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="ABC123"
          maxLength={6}
          className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-3 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-violet-500 mb-4"
        />

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <Button className="w-full" onClick={handleJoin} disabled={loading || code.length < 4} size="lg">
          {loading ? "Connexion…" : "Rejoindre"}
        </Button>
      </div>
    </div>
  );
}
