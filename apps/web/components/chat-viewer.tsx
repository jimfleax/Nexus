/**
 * @file chat-viewer.tsx
 * @description Viewer for chat-transcript resources: parses JSON or labeled plain-text messages and renders them as a conversation with per-message and full-transcript copy.
 * @architecture Client component; prefers JSON transcripts, falls back to line parsing for "Role: text" plain text.
 */
"use client";

import { useState } from "react";
import { Check, Copy, ChatText, Sparkle, User } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type Message = { role: string; content: string; timestamp?: string };

/**
 * @desc    Parse transcript content into messages, preferring JSON and falling back to labeled-line parsing
 * @param   {string} content - Raw transcript
 * @returns {Message[]} Normalized message list
 */
function parseMessages(content?: string): Message[] {
  if (!content) return [];
  try {
    const parsed: unknown = JSON.parse(content);
    if (
      Array.isArray(parsed) &&
      parsed.every((m) => typeof m === "object" && m !== null && "content" in m)
    ) {
      return parsed.map((m) => ({
        role: typeof m.role === "string" ? m.role : "assistant",
        content: String(m.content),
        timestamp: typeof m.timestamp === "string" ? m.timestamp : undefined,
      }));
    }
  } catch {
    /* Plain-text transcript parsing fallback */
  }

  return content
    .split(/\n(?=(?:User|Assistant|System|Human|AI):\s*)/i)
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(User|Assistant|System|Human|AI):\s*/i);
      const rawRole = match?.[1]?.toLowerCase() || "assistant";
      const normalizedRole =
        rawRole === "human" ? "user" : rawRole === "ai" ? "assistant" : rawRole;
      return {
        role: normalizedRole,
        content: line.slice(match?.[0].length || 0).trim(),
      };
    });
}

/**
 * @desc    Render a chat transcript as a conversation with copy actions
 * @param   {{title: string; content?: string}} props - Title and raw transcript
 * @returns {JSX.Element} The chat viewer
 */
export function ChatViewer({
  title,
  content,
}: {
  title: string;
  content?: string;
}) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messages = parseMessages(content);

  if (!content) {
    return (
      <section className="rounded-2xl border border-dashed border-[#d2b7e5] bg-[#f8f4fb] px-6 py-16 text-center">
        <ChatText className="mx-auto size-10 text-[#6247aa]" />
        <h2 className="mt-3 font-serif text-xl text-[#6247aa]">{title}</h2>
        <p className="mt-2 text-sm text-[#6247aa]">
          This conversation transcript has no messages recorded.
        </p>
      </section>
    );
  }

  const handleCopyAll = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleCopyMessage = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <section aria-label={`${title} conversation`} className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#dec9e9] pb-3 text-xs text-[#6247aa]">
        <span>{messages.length} messages in conversation</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyAll}
          className="h-7 gap-1.5 px-2 text-xs text-[#6247aa] hover:text-[#6247aa]"
        >
          {copiedAll ? (
            <>
              <Check className="size-3.5 text-[#6247aa]" />
              <span className="text-[#6247aa]">Transcript copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy transcript</span>
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4 pt-1">
        {messages.map((message, index) => {
          const isUser = message.role.toLowerCase() === "user";
          const isCopied = copiedIndex === index;

          return (
            <article
              key={`${message.role}-${index}`}
              className={`group relative max-w-[88%] rounded-2xl p-4.5 transition-shadow ${
                isUser
                  ? "ml-auto bg-[#6247aa] text-white shadow-xs"
                  : "bg-white border border-[#dec9e9] text-[#6247aa] shadow-xs"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {isUser ? (
                    <User className="size-3.5 text-white/70" />
                  ) : (
                    <Sparkle className="size-3.5 text-[#6247aa]" />
                  )}
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wider ${
                      isUser ? "text-white/80" : "text-[#6247aa]"
                    }`}
                  >
                    {message.role}
                  </span>
                  {message.timestamp && (
                    <span
                      className={`text-[10px] ${isUser ? "text-white/60" : "text-[#815ac0]"}`}
                    >
                      · {formatDate(message.timestamp)}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyMessage(message.content, index)}
                  className={`opacity-0 transition group-hover:opacity-100 p-1 rounded ${
                    isUser
                      ? "hover:bg-white/20 text-white/80"
                      : "hover:bg-[#dec9e9] text-[#6247aa]"
                  }`}
                  title="Copy message"
                >
                  {isCopied ? (
                    <Check className="size-3" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
