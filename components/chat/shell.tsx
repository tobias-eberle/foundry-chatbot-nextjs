"use client";

import { useEffect, useRef, useState } from "react";
import { useActiveChat } from "@/hooks/use-active-chat";
import type { ChatMessage } from "@/lib/types";
import { ChatHeader } from "./chat-header";
import { submitEditedMessage } from "./message-editor";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";

export function ChatShell() {
  const {
    chatId,
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    input,
    setInput,
    currentModelId,
    setCurrentModelId,
  } = useActiveChat();

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
    null
  );

  const stopRef = useRef(stop);
  stopRef.current = stop;

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      stopRef.current();
      setEditingMessage(null);
    }
  }, [chatId]);

  return (
    <div className="flex h-dvh w-full flex-row overflow-hidden">
      <div className="flex w-full min-w-0 flex-col bg-sidebar">
        <ChatHeader />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:rounded-tl-[12px] md:border-t md:border-l md:border-border/40">
          <Messages
            chatId={chatId}
            isLoading={false}
            messages={messages}
            onEditMessage={(msg) => {
              const text = msg.parts
                ?.filter((p) => p.type === "text")
                .map((p) => p.text)
                .join("");
              setInput(text ?? "");
              setEditingMessage(msg);
            }}
            regenerate={regenerate}
            setMessages={setMessages}
            status={status}
          />

          <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
            <MultimodalInput
              chatId={chatId}
              editingMessage={editingMessage}
              input={input}
              messages={messages}
              onCancelEdit={() => {
                setEditingMessage(null);
                setInput("");
              }}
              onModelChange={setCurrentModelId}
              selectedModelId={currentModelId}
              sendMessage={
                editingMessage
                  ? async () => {
                      const msg = editingMessage;
                      setEditingMessage(null);
                      submitEditedMessage({
                        message: msg,
                        text: input,
                        setMessages,
                        regenerate,
                      });
                      setInput("");
                    }
                  : sendMessage
              }
              setInput={setInput}
              setMessages={setMessages}
              status={status}
              stop={stop}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
