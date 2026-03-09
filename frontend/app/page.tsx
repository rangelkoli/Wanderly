import Link from "next/link";

import { AuthStatus } from "@/components/auth-status";

export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-4 py-6 sm:px-8">
      <section className="grid overflow-hidden rounded-[2rem] border border-border/70 bg-card/80 shadow-[0_24px_80px_rgba(80,55,24,0.15)] backdrop-blur md:grid-cols-[1.2fr_0.8fr]">
        <div className="p-8 sm:p-12">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-accent-foreground/80">
            Next.js + Supabase
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.06em] text-balance sm:text-7xl">
            Authentication screens are now part of the frontend.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Wanderly now ships with dedicated login and signup pages backed by
            Supabase Auth on the client.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              href="/signup"
            >
              Create account
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background/75 px-6 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              href="/login"
            >
              Log in
            </Link>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="grid min-h-[280px] grid-cols-2 gap-3 bg-[linear-gradient(135deg,rgba(255,248,238,0.45),rgba(255,255,255,0.08)),linear-gradient(180deg,rgba(28,124,125,0.08),rgba(214,107,45,0.12))] p-5"
        >
          <div />
          <div />
          <div />
          <div />
        </div>
      </section>

      <AuthStatus />
    </main>
  );
}
