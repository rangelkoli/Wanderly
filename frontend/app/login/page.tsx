import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-border/70 bg-background/45 p-5 shadow-[0_24px_80px_rgba(80,55,24,0.15)] backdrop-blur">
        <Link
          className="mb-4 inline-flex text-xs font-bold uppercase tracking-[0.24em] text-accent-foreground/80"
          href="/"
        >
          Wanderly
        </Link>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
