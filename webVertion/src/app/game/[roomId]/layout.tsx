import { auth } from "@/lib/auth";
import { SessionProvider } from "next-auth/react";
import { SocketProvider } from "@/components/SocketProvider";

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <SocketProvider session={session}>
        {children}
      </SocketProvider>
    </SessionProvider>
  );
}
