import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

const HERO_CARDS = [
  { image: "/roles/loup_garou.png", name: "Loup-Garou", camp: "wolves", rot: -18 },
  { image: "/roles/voyante.png",    name: "Voyante",    camp: "village", rot: -8 },
  { image: "/roles/sorciere.png",   name: "Sorcière",   camp: "village", rot: 2 },
  { image: "/roles/chasseur.png",   name: "Chasseur",   camp: "village", rot: 12 },
  { image: "/roles/loup_blanc.png", name: "Loup Blanc", camp: "solo",    rot: 22 },
] as const;

const CAMP_BORDER: Record<string, string> = {
  wolves:  "#c0392b",
  village: "#c9a84c",
  solo:    "#c9870a",
};

const CAMP_SHADOW: Record<string, string> = {
  wolves:  "rgba(192,57,43,0.4)",
  village: "rgba(201,168,76,0.3)",
  solo:    "rgba(201,135,10,0.4)",
};

export default async function HomePage() {
  const session = await auth();
  if (session) redirect("/lobby");

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">

      {/* Moonlight atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 55%), " +
            "radial-gradient(ellipse at 50% 100%, rgba(192,57,43,0.1) 0%, transparent 50%)",
        }}
      />

      {/* Moon */}
      <div
        className="absolute pointer-events-none"
        style={{ top: "6%", left: "50%", transform: "translateX(-50%)" }}
      >
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #f5ecd0, #d4b870 60%, #a08030)",
            boxShadow: "0 0 60px rgba(212,184,112,0.35), 0 0 120px rgba(212,184,112,0.15)",
            opacity: 0.9,
          }}
        />
      </div>

      {/* ── Card fan ────────────────────────────────────── */}
      <div
        className="relative flex items-end justify-center mb-6"
        style={{ height: 260, width: "100%", maxWidth: 520 }}
      >
        {HERO_CARDS.map((card, i) => {
          const offset = (i - 2) * 72;
          const zIndex = i === 2 ? 10 : i === 1 || i === 3 ? 8 : 5;
          const border = CAMP_BORDER[card.camp];
          const shadow = CAMP_SHADOW[card.camp];
          return (
            <div
              key={card.name}
              style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                marginLeft: offset - 44,
                width: 88,
                height: 130,
                transform: `rotate(${card.rot}deg)`,
                transformOrigin: "bottom center",
                zIndex,
                transition: "transform 0.3s, box-shadow 0.3s",
              }}
              className="group"
            >
              <div
                className="role-card"
                style={{
                  width: "100%",
                  height: "100%",
                  border: `2px solid ${border}`,
                  boxShadow: `0 0 16px ${shadow}, 0 6px 24px rgba(0,0,0,0.8)`,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Image */}
                <div style={{ flex: 1, overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.image}
                    alt={card.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                  />
                </div>
                {/* Name label */}
                <div
                  style={{
                    padding: "3px 4px",
                    background: `linear-gradient(to top, ${border}55, transparent)`,
                    fontSize: 8,
                    fontWeight: 800,
                    color: border,
                    textAlign: "center",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {card.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Title ───────────────────────────────────────── */}
      <div className="relative z-10 text-center max-w-2xl">
        <h1 className="text-6xl font-black mb-3 tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          <span className="text-white">Bot</span>
          <span style={{ color: "#9d5bff", textShadow: "0 0 40px rgba(157,91,255,0.6)" }}>Wolf</span>
        </h1>

        <p className="text-base mb-1" style={{ color: "var(--gold-bright)" }}>
          Loup-Garou de Thiercelieux
        </p>
        <p className="text-sm mb-10" style={{ color: "var(--text-muted)", maxWidth: 380, margin: "0 auto 40px" }}>
          Rôles secrets, chat vocal, phases nuit & jour — le jeu complet dans votre navigateur.
        </p>

        {/* ── Features ────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { image: "/roles/corbeau.png",   title: "24 rôles",       desc: "Officiels & custom" },
            { image: "/roles/renard.png",    title: "Temps réel",     desc: "WebSockets" },
            { image: "/roles/cupidon.png",   title: "Vocal intégré",  desc: "WebRTC P2P" },
          ].map((f) => (
            <div
              key={f.title}
              className="glass glass-hover rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--gold-dim)" }}
            >
              <div style={{ height: 80, overflow: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.image}
                  alt={f.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                />
              </div>
              <div className="p-3">
                <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{f.title}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Discord CTA ──────────────────────────────── */}
        <form
          action={async () => {
            "use server";
            await signIn("discord", { redirectTo: "/lobby" });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-bold cursor-pointer transition-all duration-200 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #5865F2 0%, #7c3aed 100%)",
              boxShadow: "0 0 40px rgba(88,101,242,0.45), 0 4px 20px rgba(0,0,0,0.4)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            Se connecter avec Discord
          </button>
        </form>

        <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          Seul votre pseudo et avatar Discord sont utilisés.
        </p>
      </div>
    </main>
  );
}
