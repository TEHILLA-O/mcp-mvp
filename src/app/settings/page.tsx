"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface Health {
  storage: string;
  generatedAt: string;
  observations: number;
  datasets: number;
}

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [health, setHealth] = useState<Health | null>(null);
  const [chat, setChat] = useState<{ configured: boolean; model: string } | null>(null);

  useEffect(() => {
    void fetch("/api/health")
      .then((response) => response.json())
      .then((body: Health) => setHealth(body));
    void fetch("/api/chat")
      .then((response) => response.json())
      .then((body: { configured: boolean; model: string }) => setChat(body));
  }, []);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <p className="text-xs tracking-[0.16em] text-[var(--muted)] uppercase">Settings</p>
        <h1 className="font-serif text-4xl">Paper, storage, motion.</h1>
      </header>
      <section className="surface rounded-3xl p-6">
        <h2 className="font-serif text-2xl">Appearance</h2>
        <div className="mt-3 flex gap-2">
          <button type="button" aria-pressed={resolvedTheme === "light"} className="rounded-full border border-[var(--line)] px-4 py-2" onClick={() => setTheme("light")}>
            Light
          </button>
          <button type="button" aria-pressed={resolvedTheme === "dark"} className="rounded-full border border-[var(--line)] px-4 py-2" onClick={() => setTheme("dark")}>
            Dark
          </button>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">Charts follow the theme. If your system asks for reduced motion, lines and panels settle without a travel animation.</p>
      </section>
      <section className="rounded-3xl border border-[var(--line)] p-6 text-sm leading-6">
        <h2 className="font-serif text-2xl">Library</h2>
        {health ? (
          <p className="mt-3">
            {health.observations.toLocaleString("en-NG")} observations across {health.datasets} datasets. Storage mode: {health.storage}. Snapshot generated {health.generatedAt}.
          </p>
        ) : (
          <p className="mt-3 text-[var(--muted)]">Checking the snapshot.</p>
        )}
        <p className="mt-3 text-[var(--muted)]">Secrets stay on the server. The inspector redacts fields whose names look like tokens or database URLs.</p>
        <p className="mt-3">
          {chat?.configured
            ? "Chat is connected to a model. Numbers still have to come back from an MCP tool."
            : "Chat is using the built-in parser."}
        </p>
      </section>
    </div>
  );
}
