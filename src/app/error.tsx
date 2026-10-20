"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16">
      <h1 className="font-serif text-4xl">The page could not finish loading.</h1>
      <p className="text-sm text-[var(--muted)]">{error.message || "An unexpected error occurred."}</p>
      <button type="button" className="rounded-full bg-[var(--accent)] px-4 py-2 text-white" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
