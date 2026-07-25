"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
};

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === "sign-up";
  const heading = isSignUp ? "Create your account" : "Sign in";
  const cta = isSignUp ? "Create account" : "Sign in";
  const altPrompt = isSignUp ? "Already have an account?" : "New here?";
  const altLink = isSignUp ? "/auth/sign-in" : "/auth/sign-up";
  const altLabel = isSignUp ? "Sign in" : "Create an account";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/design");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--background)] px-6">
      <div className="w-full max-w-sm">
        <Link
          href="/explore"
          className="mb-10 block text-center font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          agad
        </Link>

        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          {heading}
        </h1>
        <p className="mb-8 text-sm text-[var(--muted-foreground)]">
          {isSignUp
            ? "Start generating landing pages from plain text."
            : "Welcome back. Continue your workspace."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="h-10 border border-[var(--border)] bg-[var(--panel)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="h-10 border border-[var(--border)] bg-[var(--panel)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="border border-[var(--destructive)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--destructive)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="h-10 w-full border border-[var(--foreground)] bg-[var(--foreground)] text-sm font-medium text-[var(--background)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            {submitting ? "Working…" : cta}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          {altPrompt}{" "}
          <Link
            href={altLink}
            className="text-[var(--foreground)] underline-offset-4 hover:underline"
          >
            {altLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
