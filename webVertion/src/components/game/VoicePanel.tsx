"use client";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/gameStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types/game";

// Dynamic import for simple-peer (WebRTC)
let SimplePeer: typeof import("simple-peer") | null = null;
if (typeof window !== "undefined") {
  import("simple-peer").then((m) => {
    SimplePeer = m.default;
  });
}

interface Props {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  myId: string;
}

type Peer = import("simple-peer").Instance;

export function VoicePanel({ socket, myId }: Props) {
  const { voiceUsers, room } = useGameStore();
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, Peer>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (!joined) return;

    const handleSignal = (fromId: string, signal: unknown) => {
      if (peersRef.current.has(fromId)) {
        peersRef.current.get(fromId)?.signal(signal as import("simple-peer").SignalData);
      } else {
        createPeer(fromId, false, signal as import("simple-peer").SignalData);
      }
    };

    const handleUserJoined = (userId: string) => {
      if (userId === myId || peersRef.current.has(userId)) return;
      createPeer(userId, true);
    };

    const handleUserLeft = (userId: string) => {
      peersRef.current.get(userId)?.destroy();
      peersRef.current.delete(userId);
      audioRefs.current.get(userId)?.remove();
      audioRefs.current.delete(userId);
    };

    socket.on("voice:signal", handleSignal);
    socket.on("voice:user_joined", handleUserJoined);
    socket.on("voice:user_left", handleUserLeft);

    return () => {
      socket.off("voice:signal", handleSignal);
      socket.off("voice:user_joined", handleUserJoined);
      socket.off("voice:user_left", handleUserLeft);
    };
  }, [joined, socket, myId]);

  const createPeer = (
    targetId: string,
    initiator: boolean,
    incomingSignal?: import("simple-peer").SignalData
  ) => {
    if (!SimplePeer || !streamRef.current) return;
    const peer = new SimplePeer({
      initiator,
      stream: streamRef.current,
      trickle: true,
      config: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      },
    });

    peer.on("signal", (data) => {
      socket.emit("voice:signal", targetId, data);
    });

    peer.on("stream", (remoteStream) => {
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      document.body.appendChild(audio);
      audioRefs.current.set(targetId, audio);
    });

    peer.on("close", () => {
      peersRef.current.delete(targetId);
    });

    if (incomingSignal) peer.signal(incomingSignal);
    peersRef.current.set(targetId, peer);
  };

  const joinVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setJoined(true);
      socket.emit("voice:join");
    } catch {
      alert("Impossible d'accéder au microphone.");
    }
  };

  const leaveVoice = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    peersRef.current.forEach((p) => p.destroy());
    peersRef.current.clear();
    audioRefs.current.forEach((a) => a.remove());
    audioRefs.current.clear();
    setJoined(false);
    socket.emit("voice:leave");
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = muted;
      });
      setMuted((m) => !m);
    }
  };

  const voiceUserList = [...voiceUsers];
  const players = room?.players ?? [];

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-300">🎤 Vocal</span>
        <span className="text-xs text-gray-500">{voiceUserList.length} connecté{voiceUserList.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Voice users */}
      <div className="flex flex-col gap-2 mb-3">
        {voiceUserList.map((uid) => {
          const player = players.find((p) => p.id === uid);
          if (!player) return null;
          return (
            <div key={uid} className="flex items-center gap-2 text-sm">
              <Avatar src={player.avatar} name={player.username} size={24} />
              <span className="text-gray-300">{player.username}</span>
              <span className="ml-auto text-green-400 text-xs">🔊</span>
            </div>
          );
        })}
        {voiceUserList.length === 0 && (
          <p className="text-xs text-gray-600 text-center">Aucun joueur en vocal.</p>
        )}
      </div>

      {/* Controls */}
      {!joined ? (
        <Button variant="outline" size="sm" className="w-full" onClick={joinVoice}>
          🎤 Rejoindre le vocal
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            variant={muted ? "danger" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={toggleMute}
          >
            {muted ? "🔇 Muet" : "🎤 Actif"}
          </Button>
          <Button variant="danger" size="sm" onClick={leaveVoice}>
            ✕
          </Button>
        </div>
      )}
    </div>
  );
}
