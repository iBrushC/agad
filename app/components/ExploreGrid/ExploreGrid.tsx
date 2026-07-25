"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type ExplorePage = {
  id: string;
  title: string;
  author: string;
  tag: string;
  href: string;
};

export const EXPLORE_PAGES: ExplorePage[] = [
  { id: "p1", title: "Bloomline Studio", author: "ada", tag: "agency", href: "/design?prompt=Bloomline%20Studio" },
  { id: "p2", title: "Quiet Lake Coffee", author: "theo", tag: "restaurant", href: "/design?prompt=Quiet%20Lake%20Coffee" },
  { id: "p3", title: "Northwind Notes", author: "mira", tag: "blog", href: "/design?prompt=Northwind%20Notes" },
  { id: "p4", title: "Halcyon Maps", author: "jules", tag: "product", href: "/design?prompt=Halcyon%20Maps" },
  { id: "p5", title: "Tinder Books", author: "ren", tag: "shop", href: "/design?prompt=Tinder%20Books" },
  { id: "p6", title: "Pebble & Pine", author: "sora", tag: "shop", href: "/design?prompt=Pebble%20and%20Pine" },
  { id: "p7", title: "Foxglove Bakery", author: "iona", tag: "restaurant", href: "/design?prompt=Foxglove%20Bakery" },
  { id: "p8", title: "Driftwood Gym", author: "kit", tag: "fitness", href: "/design?prompt=Driftwood%20Gym" },
  { id: "p9", title: "Lumen Festival", author: "ari", tag: "event", href: "/design?prompt=Lumen%20Festival" },
];

export default function ExploreGrid() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EXPLORE_PAGES;
    return EXPLORE_PAGES.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.tag.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-8 py-4">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Browse
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, or tag"
          className="h-8 w-72 border border-[var(--border)] bg-[var(--panel)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
        />
      </div>

      <div className="flex-1 overflow-auto px-8 py-8">
        <div className="grid grid-cols-3 gap-6">
          {filtered.map((page) => (
            <Link
              key={page.id}
              href={page.href}
              className="group flex flex-col border border-[var(--border)] bg-[var(--panel)] transition-colors hover:bg-[var(--accent)]"
            >
              <div className="flex aspect-[4/3] items-center justify-center border-b border-[var(--border)] bg-[var(--background)]">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  {page.tag}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[var(--foreground)]">
                    {page.title}
                  </div>
                  <div className="truncate text-xs text-[var(--muted-foreground)]">
                    by {page.author}
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 py-16 text-center text-sm text-[var(--muted-foreground)]">
              No pages match &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
