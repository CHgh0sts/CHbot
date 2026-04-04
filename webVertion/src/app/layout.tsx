import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BotWolf — Loup-Garou en ligne",
  description: "Jouez au Loup-Garou de Thiercelieux directement dans votre navigateur.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
