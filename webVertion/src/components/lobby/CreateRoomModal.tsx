"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { CompositionConfig } from "@/types/game";
import { DEFAULT_CONFIG } from "@/types/game";
import { getSocket } from "@/lib/socket";

interface Props {
  onClose: () => void;
  userId: string;
  username: string;
  avatar: string | null;
}

export function CreateRoomModal({ onClose, userId, username, avatar }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [config, setConfig] = useState<CompositionConfig>({
    ...DEFAULT_CONFIG,
    playerCount: 8,
    werewolfCount: 2,
    includeSeer: true,
    includeWitch: true,
    includeHunter: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: keyof CompositionConfig) => {
    setConfig((c) => ({ ...c, [key]: !c[key] }));
  };

  const handleCreate = () => {
    setLoading(true);
    setError(null);
    const socket = getSocket(userId, username, avatar);
    socket.emit("room:create", { name: name || undefined, isPublic, config }, (res) => {
      setLoading(false);
      if (!res.ok) {
        setError(res.error ?? "Erreur");
        return;
      }
      // Room created — redirect to lobby room
      // The room state will be received via socket event
      router.push("/lobby");
      onClose();
    });
  };

  const optionals: { key: keyof CompositionConfig; label: string; icon: string }[] = [
    { key: "includeSeer", label: "Voyante", icon: "🔮" },
    { key: "includeWitch", label: "Sorcière", icon: "🧙‍♀️" },
    { key: "includeHunter", label: "Chasseur", icon: "🏹" },
    { key: "includeCupid", label: "Cupidon", icon: "💘" },
    { key: "includeLittleGirl", label: "Petite Fille", icon: "👧" },
    { key: "includeElder", label: "Ancien", icon: "👴" },
    { key: "includeScapegoat", label: "Bouc Émissaire", icon: "🐐" },
    { key: "includeIdiot", label: "Idiot du Village", icon: "🤪" },
    { key: "includeDoctor", label: "Docteur", icon: "⚕️" },
    { key: "includeGuard", label: "Garde du Corps", icon: "🛡️" },
    { key: "includeNecromancer", label: "Nécromancien", icon: "💀" },
    { key: "includeDevotedServant", label: "Servante Dévouée", icon: "🫅" },
    { key: "includeAngel", label: "Ange", icon: "😇" },
    { key: "includeBearTamer", label: "Montreur d'Ours", icon: "🐻" },
    { key: "includeFox", label: "Renard", icon: "🦊" },
    { key: "includeRaven", label: "Corbeau", icon: "🐦‍⬛" },
    { key: "includeInfectedWolf", label: "Infect Père des Loups", icon: "🧟" },
    { key: "includeWhiteWolf", label: "Loup Blanc", icon: "🤍" },
    { key: "includeDogWolf", label: "Chien-Loup", icon: "🐕" },
    { key: "includeDictateur", label: "Dictateur", icon: "👑" },
    { key: "includeHackeur", label: "Hackeur", icon: "💻" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <div className="glass w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Créer une partie</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
          </div>

          {/* Room Name */}
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-1 block">Nom de la salle (optionnel)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: La Nuit des Loups"
              className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Visibility */}
          <div className="mb-4 flex gap-3">
            {[true, false].map((pub) => (
              <button
                key={String(pub)}
                onClick={() => setIsPublic(pub)}
                className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                  isPublic === pub
                    ? "border-violet-500 bg-violet-500/10 text-violet-300"
                    : "border-[var(--border)] text-gray-400"
                }`}
              >
                {pub ? "🌐 Publique" : "🔒 Privée"}
              </button>
            ))}
          </div>

          {/* Player count & wolves */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Joueurs max</label>
              <input
                type="number"
                min={4}
                max={24}
                value={config.playerCount}
                onChange={(e) => setConfig((c) => ({ ...c, playerCount: +e.target.value }))}
                className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Loups-Garous</label>
              <input
                type="number"
                min={1}
                max={Math.floor(config.playerCount / 3)}
                value={config.werewolfCount}
                onChange={(e) => setConfig((c) => ({ ...c, werewolfCount: +e.target.value }))}
                className="w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Roles */}
          <div className="mb-5">
            <label className="text-sm text-gray-400 mb-2 block">Rôles spéciaux</label>
            <div className="grid grid-cols-2 gap-2">
              {optionals.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all text-left ${
                    config[key]
                      ? "border-violet-500 bg-violet-500/10 text-violet-200"
                      : "border-[var(--border)] text-gray-400"
                  }`}
                >
                  <span>{icon}</span>
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <Button className="w-full" onClick={handleCreate} disabled={loading} size="lg">
            {loading ? "Création…" : "🐺 Créer la partie"}
          </Button>
        </div>
      </div>
    </div>
  );
}
