"use client";
import { useEffect, useRef } from "react";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useGameStore } from "@/lib/gameStore";
import type { Session } from "next-auth";

interface Props {
  session: Session | null;
  children: React.ReactNode;
}

export function SocketProvider({ session, children }: Props) {
  const initialized = useRef(false);
  const {
    setRoom,
    setMyInfo,
    addAnnouncement,
    addChatMessage,
    setMyTurn,
    setVotes,
    setGameOver,
    addVoiceUser,
    removeVoiceUser,
    setNightPhase,
  } = useGameStore();

  useEffect(() => {
    if (!session?.user?.id || !session.user.id || initialized.current) return;
    initialized.current = true;

    const user = session.user;
    const socket = getSocket(
      user.id as string,
      user.name ?? "Joueur",
      user.image ?? null
    );

    socket.on("room:state", setRoom);
    socket.on("game:private_info", setMyInfo);
    socket.on("game:announcement", addAnnouncement);
    socket.on("chat:message", addChatMessage);
    socket.on("game:your_turn", (phase, timeout) => setMyTurn(phase, timeout));
    socket.on("game:vote_update", setVotes);
    socket.on("game:over", (winner, winnerIds) => setGameOver({ winner, winnerIds }));
    socket.on("voice:user_joined", addVoiceUser);
    socket.on("voice:user_left", removeVoiceUser);
    socket.on("game:night_phase", (info) =>
      setNightPhase(info.subPhase, info.actorIds)
    );
    socket.on("room:player_joined", (player) => {
      setRoom(useGameStore.getState().room!);
    });

    return () => {
      disconnectSocket();
      initialized.current = false;
    };
  }, [session]);

  return <>{children}</>;
}
