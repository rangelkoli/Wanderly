"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

const FORM_COPY: Record<
  AuthMode,
  {
    eyebrow: string;
    title: string;
    description: string;
    button: string;
    pending: string;
    alternateLabel: string;
    alternateHref: string;
    alternateCta: string;
  }
> = {
  login: {
    eyebrow: "Welcome back",
    title: "Log in to Wanderly",
    description: "Use your Supabase account to continue into the app.",
    button: "Log in",
    pending: "Signing you in...",
    alternateLabel: "Need an account?",
    alternateHref: "/signup",
    alternateCta: "Create one",
  },
  signup: {
    eyebrow: "New account",
    title: "Create your Wanderly account",
    description: "Sign up with Supabase and start a new session.",
    button: "Create account",
    pending: "Creating account...",
    alternateLabel: "Already have an account?",
    alternateHref: "/login",
    alternateCta: "Log in",
  },
};

export function AuthForm({ mode }: AuthFormProps) {
  const copy = FORM_COPY[mode];
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (isSubmitting) {
      return false;
    }

    if (!email.trim() || !password.trim()) {
      return false;
    }

    if (mode === "signup" && password !== confirmPassword) {
      return false;
    }

    return true;
  }, [confirmPassword, email, isSubmitting, mode, password]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === "signup" && password !== confirmPassword) {
      setErrorMessage("Passwords must match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        router.push("/");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        setSuccessMessage("Account created. You are signed in.");
        router.push("/");
        router.refresh();
        return;
      }

      setSuccessMessage(
        "Account created. Check your email to confirm your address, then log in.",
      );
      router.push("/login?message=check-email");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[0.95fr_1.05fr]">
      <section className="flex flex-col justify-between rounded-3xl border border-border/70 bg-card/60 p-8 shadow-[0_24px_80px_rgba(80,55,24,0.12)]">
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent-foreground/80">
            {copy.eyebrow}
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
            {copy.title}
          </h1>
          <p className="max-w-md text-base leading-7 text-muted-foreground">
            {copy.description}
          </p>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{mode === "login" ? "Authentication" : "Create your account"}</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Enter your email and password to access Wanderly."
              : "Supabase will store the account and handle the session lifecycle."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor={`${mode}-email`}>Email</Label>
              <Input
                id={`${mode}-email`}
                autoComplete="email"
                inputMode="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`${mode}-password`}>Password</Label>
              <Input
                id={`${mode}-password`}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={8}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                required
                type="password"
                value={password}
              />
            </div>

            {mode === "signup" ? (
              <div className="grid gap-2">
                <Label htmlFor="signup-confirm-password">Confirm password</Label>
                <Input
                  id="signup-confirm-password"
                  autoComplete="new-password"
                  minLength={8}
                  name="confirmPassword"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                  required
                  type="password"
                  value={confirmPassword}
                />
              </div>
            ) : null}

            {errorMessage ? (
              <p className="text-sm font-medium text-red-700">{errorMessage}</p>
            ) : null}
            {successMessage ? (
              <p className="text-sm font-medium text-emerald-700">{successMessage}</p>
            ) : null}

            <Button className="h-12 rounded-2xl" disabled={!canSubmit} type="submit">
              {isSubmitting ? copy.pending : copy.button}
            </Button>

            <p className="text-sm text-muted-foreground">
              {copy.alternateLabel}{" "}
              <Link className="font-semibold text-primary" href={copy.alternateHref}>
                {copy.alternateCta}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
