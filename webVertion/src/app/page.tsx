import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default async function HomePage() {
  const session = await auth();
  if (session) redirect("/lobby");

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10"
            style={{
              width: `${60 + i * 40}px`,
              height: `${60 + i * 40}px`,
              background: i % 2 === 0 ? "#7c3aed" : "#ef4444",
              top: `${10 + i * 14}%`,
              left: `${5 + i * 16}%`,
              filter: "blur(40px)",
              animation: `float ${3 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center max-w-2xl">
        {/* Logo */}
        <div className="text-7xl mb-4 animate-float">🐺</div>

        <h1 className="text-5xl font-black mb-3 glow-text">
          <span className="text-white">Bot</span>
          <span className="text-violet-400">Wolf</span>
        </h1>

        <p className="text-xl text-gray-300 mb-2">
          Loup-Garou de Thiercelieux
        </p>
        <p className="text-gray-500 mb-10 max-w-md mx-auto">
          Jouez avec vos amis directement dans le navigateur. Robes secrètes,
          chat vocal, phases nuit & jour — tout le jeu en ligne.
        </p>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: "🎤", title: "Vocal intégré", desc: "WebRTC P2P" },
            { icon: "🌙", title: "Temps réel", desc: "WebSockets" },
            { icon: "🎭", title: "24 rôles", desc: "Officiels & custom" },
          ].map((f) => (
            <div key={f.title} className="glass p-4 glass-hover rounded-xl">
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="font-semibold text-sm text-gray-200">{f.title}</div>
              <div className="text-xs text-gray-500">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <form
          action={async () => {
            "use server";
            await signIn("discord", { redirectTo: "/lobby" });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-bold transition-all duration-200 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #5865F2, #7c3aed)",
              boxShadow: "0 0 30px rgba(88,101,242,0.4)",
              color: "white",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            Se connecter avec Discord
          </button>
        </form>

        <p className="text-xs text-gray-600 mt-4">
          Seul votre pseudo et avatar Discord sont utilisés.
        </p>
      </div>
    </main>
  );
}
