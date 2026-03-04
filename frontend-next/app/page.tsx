import { AuthButton } from "@/components/auth-button";
import { Hero } from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import { EnvVarWarning } from "@/components/env-var-warning";
import Link from "next/link";
import { Suspense } from "react";
import { MapPin } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col">
      {/* Navigation */}
      <nav className="w-full border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 h-14">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <MapPin className="size-5 text-primary" />
            Wanderly
          </Link>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <Hero />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 text-xs text-muted-foreground">
          <p>&copy; 2026 Wanderly. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
