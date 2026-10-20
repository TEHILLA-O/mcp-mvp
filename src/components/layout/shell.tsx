"use client";

import { GitCompare, Library, LineChart, Map, Menu, Moon, Search, Settings, SunMedium, Terminal, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { ChatWidget } from "@/components/chat/chat-widget";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LineChart },
  { href: "/explore", label: "Explorer", icon: Search },
  { href: "/explore?category=economy", label: "Indicators", icon: LineChart },
  { href: "/geography", label: "States", icon: Map },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/inspector", label: "MCP inspector", icon: Terminal },
  { href: "/sources", label: "Sources", icon: Library },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { resolvedTheme, setTheme } = useTheme();
  const inspector = pathname === "/inspector";

  if (inspector) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-[#d7e2f1]">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:bg-[#121a2b] focus:px-3 focus:py-2">
          Skip to content
        </a>
        <main id="main">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] lg:grid lg:grid-cols-[228px_minmax(0,1fr)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:bg-[var(--paper-2)] focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 lg:hidden">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Gazette
        </Link>
        <button type="button" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((value) => !value)}>
          {open ? <X /> : <Menu />}
        </button>
      </header>
      <aside className={cn("border-[var(--line)] bg-[#06110d] text-[#d7efe4] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-white/5", open ? "block" : "hidden lg:flex")}>
        <div className="hidden px-4 pt-5 lg:block">
          <p className="text-[10px] tracking-[0.22em] text-[#6f8f80] uppercase">Nigeria</p>
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Gazette
          </Link>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const path = item.href.split("?")[0] ?? item.href;
            const active = item.href === "/" ? pathname === "/" : pathname === path && !item.href.includes("?");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                  active ? "bg-[#1f9d4e] text-white shadow-[0_0_18px_rgba(34,197,94,0.35)]" : "text-[#9fb5a8] hover:bg-white/5",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 pb-5">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm text-[#8eab9c]"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? <SunMedium className="size-4" /> : <Moon className="size-4" />}
            {resolvedTheme === "dark" ? "Light paper" : "Dark paper"}
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-[#07110e]/90 px-4 py-3 backdrop-blur sm:px-6">
          <form
            className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2"
            onSubmit={(event) => {
              event.preventDefault();
              const next = query.trim();
              router.push(next ? `/explore?q=${encodeURIComponent(next)}` : "/explore");
            }}
          >
            <Search className="size-4 text-[#6f8f80]" aria-hidden />
            <label htmlFor="global-search" className="sr-only">
              Search statistics
            </label>
            <input
              id="global-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search inflation, GDP, states…"
              className="w-full bg-transparent text-sm text-[#e9fff4] outline-none placeholder:text-[#6f8f80]"
            />
          </form>
        </div>
        <main id="main" className="min-w-0 px-3 py-4 sm:px-5 lg:px-6">
          {children}
        </main>
      </div>
      <ChatWidget />
    </div>
  );
}
