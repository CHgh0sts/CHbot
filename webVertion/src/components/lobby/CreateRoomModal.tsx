"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { CompositionConfig } from "@/types/game";
import { ROLES } from "@/lib/game/roles";
import { getSocket } from "@/lib/socket";
import {
  COMPOSITION_PRESETS,
  DEFAULT_PRESET_ID,
} from "@/lib/game/compositionPresets";
import {
  countCompositionSlots,
  ensureMinPlayerCountForSlots,
  normalizeCompositionConfig,
} from "@/lib/game/normalizeComposition";

const CUSTOM_PRESET_ID = "custom";
const defaultPreset =
  COMPOSITION_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID) ?? COMPOSITION_PRESETS[0];

interface Props {
  onClose: () => void;
  userId: string;
  username: string;
  avatar: string | null;
}

const CAMP_BORDER: Record<string, string> = {
  wolves:  "#c0392b",
  village: "#c9a84c",
  solo:    "#c9870a",
};

const optionals: { key: keyof CompositionConfig; roleKey: string }[] = [
  { key: "includeSeer",           roleKey: "seer" },
  { key: "includeWitch",          roleKey: "witch" },
  { key: "includeHunter",         roleKey: "hunter" },
  { key: "includeCupid",          roleKey: "cupid" },
  { key: "includeLittleGirl",     roleKey: "little_girl" },
  { key: "includeElder",          roleKey: "elder" },
  { key: "includeScapegoat",      roleKey: "scapegoat" },
  { key: "includeIdiot",          roleKey: "idiot" },
  { key: "includeDoctor",         roleKey: "doctor" },
  { key: "includeGuard",          roleKey: "guard" },
  { key: "includeNecromancer",    roleKey: "necromancer" },
  { key: "includeDevotedServant", roleKey: "devoted_servant" },
  { key: "includeAngel",          roleKey: "angel" },
  { key: "includeBearTamer",      roleKey: "bear_tamer" },
  { key: "includeFox",            roleKey: "fox" },
  { key: "includeRaven",          roleKey: "raven" },
  { key: "includeInfectedWolf",   roleKey: "infected_wolf" },
  { key: "includeWhiteWolf",      roleKey: "white_wolf" },
  { key: "includeDogWolf",        roleKey: "dog_wolf" },
  { key: "includeBigBadWolf",     roleKey: "big_bad_wolf" },
  { key: "includeDictateur",      roleKey: "dictateur" },
  { key: "includeHackeur",        roleKey: "hackeur" },
  { key: "includeActor",          roleKey: "actor" },
  { key: "includeThief",          roleKey: "thief" },
  { key: "includeRedRidingHood",  roleKey: "red_riding_hood" },
  { key: "includePiedPiper",      roleKey: "pied_piper" },
  { key: "includeRustySwordKnight", roleKey: "rusty_sword_knight" },
  { key: "includeWildChild",      roleKey: "wild_child" },
  { key: "includePyromaniac",     roleKey: "pyromaniac" },
  { key: "includeTwoSisters",    roleKey: "two_sisters" },
  { key: "includeThreeBrothers",  roleKey: "three_brothers" },
  { key: "includeSectarian",      roleKey: "sectarian" },
];

export function CreateRoomModal({ onClose, userId, username, avatar }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [presetId, setPresetId] = useState(defaultPreset.id);
  const [config, setConfig] = useState<CompositionConfig>(() =>
    ensureMinPlayerCountForSlots({ ...defaultPreset.config })
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectPreset = (id: string) => {
    if (id === CUSTOM_PRESET_ID) {
      setPresetId(CUSTOM_PRESET_ID);
      return;
    }
    const p = COMPOSITION_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setConfig(ensureMinPlayerCountForSlots({ ...p.config }));
  };

  const markCustom = () => setPresetId(CUSTOM_PRESET_ID);

  const toggle = (key: keyof CompositionConfig) => {
    markCustom();
    setConfig((c) =>
      ensureMinPlayerCountForSlots({ ...c, [key]: !c[key] })
    );
  };

  const reservedSlots = countCompositionSlots(config);
  const minPlayersForComposition = Math.max(4, reservedSlots);
  const compositionOverLimit = reservedSlots > 24;

  const handleCreate = () => {
    setLoading(true);
    setError(null);
    try {
      normalizeCompositionConfig(config);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Composition invalide.");
      return;
    }
    const socket = getSocket(userId, username, avatar);
    const t = window.setTimeout(() => {
      setLoading(false);
      setError("Pas de réponse du serveur. Vérifiez que l’app tourne et que vous êtes connecté.");
    }, 20000);
    socket.emit("room:create", { name: name || undefined, isPublic, config }, (res) => {
      window.clearTimeout(t);
      setLoading(false);
      if (!res?.ok) {
        setError(res?.error ?? "Erreur");
        return;
      }
      router.push("/lobby");
      onClose();
    });
  };

  const selectValue = COMPOSITION_PRESETS.some((p) => p.id === presetId)
    ? presetId
    : CUSTOM_PRESET_ID;
  const presetDescription =
    COMPOSITION_PRESETS.find((p) => p.id === selectValue)?.description ??
    "Tu as modifié les rôles ou les effectifs à la main.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="glass w-full max-w-lg max-h-[92vh] overflow-y-auto scrollbar-hide"
        style={{ border: "1px solid var(--gold-dim)" }}
      >
        <div className="p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div style={{
                width: 32, height: 32, borderRadius: 6, overflow: "hidden",
                border: "2px solid var(--wolf-red)",
                boxShadow: "0 0 10px rgba(192,57,43,0.4)",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/roles/loup_garou.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                Créer une partie
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-2xl leading-none transition-colors hover:text-white"
              style={{ color: "var(--text-muted)" }}
            >
              ×
            </button>
          </div>

          {/* Room Name */}
          <div className="mb-4">
            <label className="text-xs uppercase tracking-widest mb-2 block" style={{ color: "var(--gold)" }}>
              Nom de la salle
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: La Nuit des Loups"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--gold-dim)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {/* Preset (aligné compositions bot / site) */}
          <div className="mb-4">
            <label className="text-xs uppercase tracking-widest mb-2 block" style={{ color: "var(--gold)" }}>
              Preset de composition
            </label>
            <select
              value={selectValue}
              onChange={(e) => selectPreset(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {COMPOSITION_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value={CUSTOM_PRESET_ID}>Personnalisé</option>
            </select>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {presetDescription}
            </p>
          </div>

          {/* Visibility */}
          <div className="mb-4 flex gap-3">
            {([true, false] as const).map((pub) => (
              <button
                key={String(pub)}
                onClick={() => setIsPublic(pub)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  border: `1px solid ${isPublic === pub ? "var(--gold)" : "var(--border)"}`,
                  background: isPublic === pub ? "rgba(201,168,76,0.08)" : "transparent",
                  color: isPublic === pub ? "var(--gold-bright)" : "var(--text-muted)",
                }}
              >
                {pub ? "🌐 Publique" : "🔒 Privée"}
              </button>
            ))}
          </div>

          {/* Counts */}
          <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--gold-bright)" }}>{reservedSlots}</strong> place
            {reservedSlots > 1 ? "s" : ""} réservée
            {reservedSlots > 1 ? "s" : ""} (loups + rôles spéciaux). Il faut au moins{" "}
            <strong style={{ color: "var(--text-primary)" }}>{minPlayersForComposition}</strong>{" "}
            joueur
            {minPlayersForComposition > 1 ? "s" : ""} pour cette composition. Plafond de la salle :{" "}
            <strong style={{ color: "var(--text-primary)" }}>{config.playerCount}</strong> (simples
            villageois en plus des rôles listés).
          </p>
          {compositionOverLimit && (
            <p className="text-xs mb-3" style={{ color: "#f87171" }}>
              Trop de rôles actifs (plus de 24 places). Retire des options pour créer la partie.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="text-xs uppercase tracking-widest mb-2 block" style={{ color: "var(--gold)" }}>
                Joueurs max (salle)
              </label>
              <input
                type="number"
                min={minPlayersForComposition}
                max={24}
                value={config.playerCount}
                onChange={(e) => {
                  markCustom();
                  const raw = parseInt(e.target.value, 10);
                  const lo = minPlayersForComposition;
                  let pc = Number.isFinite(raw) ? raw : lo;
                  pc = Math.max(lo, Math.min(24, pc));
                  const maxW = Math.max(1, Math.floor(pc / 3));
                  setConfig((c) => ({
                    ...c,
                    playerCount: pc,
                    werewolfCount: Math.max(1, Math.min(c.werewolfCount, maxW)),
                  }));
                }}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest mb-2 block" style={{ color: "var(--gold)" }}>
                Loups-Garous
              </label>
              <input
                type="number"
                min={1}
                max={Math.max(1, Math.floor(config.playerCount / 3))}
                value={config.werewolfCount}
                onChange={(e) => {
                  markCustom();
                  const raw = parseInt(e.target.value, 10);
                  const maxW = Math.max(1, Math.floor(config.playerCount / 3));
                  let wc = Number.isFinite(raw) ? raw : 1;
                  wc = Math.max(1, Math.min(maxW, wc));
                  setConfig((c) => ({ ...c, werewolfCount: wc }));
                }}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          {/* Role cards grid */}
          <div className="mb-5">
            <label className="text-xs uppercase tracking-widest mb-3 block" style={{ color: "var(--gold)" }}>
              Rôles spéciaux
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {optionals.map(({ key, roleKey }) => {
                const role = ROLES[roleKey as keyof typeof ROLES];
                if (!role) return null;
                const active = !!config[key];
                const border = CAMP_BORDER[role.camp];
                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className="relative overflow-hidden rounded-lg transition-all"
                    style={{
                      border: `2px solid ${active ? border : "var(--border)"}`,
                      background: active ? `${border}12` : "var(--bg-base)",
                      boxShadow: active ? `0 0 12px ${border}33` : "none",
                      padding: 0,
                      cursor: "pointer",
                    }}
                    title={role.name}
                  >
                    {/* Zone image carrée (largeur de la cellule = hauteur) */}
                    <div style={{ width: "100%", aspectRatio: "1 / 1", overflow: "hidden" }}>
                      {role.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={role.image}
                          alt={role.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "top center",
                            filter: active ? "none" : "grayscale(0.6) brightness(0.7)",
                            transition: "filter 0.2s",
                          }}
                        />
                      ) : (
                        <div style={{
                          width: "100%", height: "100%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 28,
                          background: active ? `${border}20` : "var(--bg-card)",
                        }}>
                          {role.icon}
                        </div>
                      )}
                    </div>
                    {/* Label */}
                    <div
                      style={{
                        padding: "4px 4px 5px",
                        fontSize: 9,
                        fontWeight: 700,
                        color: active ? border : "var(--text-muted)",
                        textAlign: "center",
                        letterSpacing: "0.04em",
                        lineHeight: 1.2,
                        background: active
                          ? `linear-gradient(to top, ${border}22, transparent)`
                          : "transparent",
                      }}
                    >
                      {role.name}
                    </div>
                    {/* Check indicator */}
                    {active && (
                      <div
                        style={{
                          position: "absolute", top: 4, right: 4,
                          width: 14, height: 14, borderRadius: "50%",
                          background: border,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, color: "white", fontWeight: 900,
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-sm mb-3" style={{ color: "#f87171" }}>{error}</p>
          )}

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={loading || compositionOverLimit}
            size="lg"
          >
            {loading ? "Création en cours…" : "Lancer la partie"}
          </Button>
        </div>
      </div>
    </div>
  );
}
