"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import ExploreGrid from "../components/ExploreGrid/ExploreGrid";

export default function ExplorePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  const handleCreate = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = prompt.trim();
    router.push(q ? `/design?prompt=${encodeURIComponent(q)}` : "/design");
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[var(--background)]">
      <nav className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-8 py-3">
        <Link
          href="/design"
          className="text-sm font-semibold tracking-[0.18em] uppercase text-[var(--foreground)]"
        >
          agad
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/design"
            className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            Design
          </Link>
          <Link
            href="/explore"
            className="font-medium text-[var(--foreground)]"
          >
            Explore
          </Link>
        </div>
      </nav>
      <header
        className="flex shrink-0 items-center border-b border-[var(--border)] px-8"
        style={{ height: "20%" }}
      >
        <form
          onSubmit={handleCreate}
          className="flex w-full max-w-3xl mx-auto items-center gap-3"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What do you want to make?"
            className="h-10 flex-1 border border-[var(--border)] bg-[var(--panel)] px-4 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
          />
          <button
            type="submit"
            className="h-10 shrink-0 border border-[var(--foreground)] bg-[var(--foreground)] px-5 text-sm font-medium text-[var(--background)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)]"
          >
            Create
          </button>
        </form>
      </header>

      <div className="flex-1 min-h-0">
        <ExploreGrid />
      </div>
    </div>
  );
}
