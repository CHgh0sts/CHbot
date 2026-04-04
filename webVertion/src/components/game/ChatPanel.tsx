"use client";
import { useState, useRef, useEffect } from "react";
import { useGameStore } from "@/lib/gameStore";
import { Avatar } from "@/components/ui/Avatar";

interface Props {
  sendMessage: (text: string) => void;
  myId: string;
}

export function ChatPanel({ sendMessage, myId }: Props) {
  const { chatMessages, myInfo } = useGameStore();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    sendMessage(t);
    setText("");
  };

  const canChat = myInfo?.isAlive !== false;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-3">
        {chatMessages.map((msg) => {
          const isMe = msg.playerId === myId;
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              <Avatar src={msg.avatar} name={msg.username} size={28} className="flex-shrink-0 mt-0.5" />
              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                {!isMe && (
                  <span className="text-xs text-gray-500 mb-0.5 ml-1">{msg.username}</span>
                )}
                <div
                  className={`px-3 py-1.5 rounded-2xl text-sm ${
                    isMe
                      ? "bg-violet-700 text-white rounded-tr-sm"
                      : "bg-[var(--bg-hover)] text-gray-200 rounded-tl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        {chatMessages.length === 0 && (
          <p className="text-gray-600 text-sm text-center mt-4">Aucun message.</p>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-[var(--border)] p-3">
        {canChat ? (
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Message…"
              maxLength={500}
              className="flex-1 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="px-3 py-2 bg-violet-700 rounded-lg text-sm hover:bg-violet-600 transition-colors disabled:opacity-40"
            >
              ➤
            </button>
          </div>
        ) : (
          <p className="text-center text-xs text-gray-600">Les morts ne peuvent pas parler.</p>
        )}
      </div>
    </div>
  );
}
