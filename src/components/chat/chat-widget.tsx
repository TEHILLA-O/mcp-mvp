"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";
import { StatChart, seriesFromStatistics } from "@/components/charts/stat-chart";
import { useInspector } from "@/components/inspector/provider";
import type { ChatSeries } from "@/lib/llm/ground";
import type { McpTrace } from "@/lib/mcp/trace";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  series?: ChatSeries | null;
}

interface ChatResponse {
  ok: boolean;
  reply: string;
  provider: "deepseek" | "rules" | "guide";
  configured: boolean;
  traces?: McpTrace[];
  series?: ChatSeries | null;
  suggestions?: Array<{ id: string; name: string }>;
}

export function ChatWidget() {
  const { commit } = useInspector();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: "assistant",
      content: "Ask about a loaded series, such as headline inflation from 2020 to 2025. You can also ask how Gazette and the MCP server work, from hosting to the tools this chat is allowed to call. Figures come from the statistics tools.",
    },
  ]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const next = [...turns, { role: "user" as const, content: question }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.filter((turn) => turn.role === "user" || turn.content).map(({ role, content }) => ({ role, content })) }),
      });
      const body = (await response.json()) as ChatResponse;
      for (const trace of body.traces ?? []) commit(trace);
      setTurns((current) => [...current, { role: "assistant", content: body.reply || "No reply was returned.", series: body.series }]);
    } catch {
      setTurns((current) => [...current, { role: "assistant", content: "The chat request did not finish." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-40">
      {open && (
        <section className="mb-3 flex h-[min(540px,70vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#1f6b45] bg-[#07140f] text-[#e9fff4] shadow-[0_20px_60px_rgba(0,0,0,0.45)]" aria-label="Statistics chat">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Gazette chat</p>
              <p className="text-[11px] text-[#8eab9c]">Grounded in MCP tools</p>
            </div>
            <button type="button" aria-label="Close chat" onClick={() => setOpen(false)} className="rounded-full p-1 text-[#8eab9c]">
              <X className="size-4" />
            </button>
          </header>
          <div className="flex-1 space-y-3 overflow-auto px-3 py-3">
            {turns.map((turn, index) => (
              <article key={`${turn.role}-${index}`} className={turn.role === "user" ? "ml-8 rounded-2xl bg-[#123224] px-3 py-2 text-sm" : "mr-4 text-sm leading-6 text-[#d7efe4]"}>
                <p className="whitespace-pre-wrap">{turn.content}</p>
                {turn.series && turn.series.points.length > 1 && (
                  <div className="mt-2 h-36">
                    <StatChart compact type="area" label={turn.series.label} series={[seriesFromStatistics("chat", turn.series.label, turn.series.unit, turn.series.points)]} />
                  </div>
                )}
              </article>
            ))}
            {busy && <p className="text-xs text-[#3dff9a]">Working on that…</p>}
          </div>
          <form
            className="flex gap-2 border-t border-white/10 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <label htmlFor="chat-question" className="sr-only">
              Question
            </label>
            <input
              id="chat-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Show headline inflation since 2024"
              className="w-full rounded-full border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
            />
            <button type="submit" aria-label="Send question" disabled={busy} className="grid size-10 place-items-center rounded-full bg-[#1f9d4e] text-white disabled:opacity-50">
              <Send className="size-4" />
            </button>
          </form>
        </section>
      )}
      <button type="button" className="inline-flex items-center gap-2 rounded-full bg-[#1f9d4e] px-4 py-3 text-sm font-medium text-white shadow-[0_0_18px_rgba(34,197,94,0.35)]" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <MessageCircle className="size-4" />
        Chat
      </button>
    </div>
  );
}
