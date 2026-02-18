import * as React from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Mail, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const { signIn } = useAuthActions();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Card className="w-full max-w-sm border-slate-200/60 shadow-xl shadow-slate-200/50 dark:border-slate-800/60 dark:shadow-slate-950/50">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
            <Lock className="size-5 text-white" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-base">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setIsLoading(true);

            const formData = new FormData(e.currentTarget);
            formData.set("flow", "signIn");

            signIn("password", formData)
              .catch((err) => {
                setError(
                  err instanceof Error ? err.message : "Failed to sign in",
                );
              })
              .finally(() => {
                setIsLoading(false);
              });
          }}
        >
          <CardContent className="space-y-4">
            {error && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
                role="alert"
              >
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full h-10 font-medium" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="size-4" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="size-4" />
                  Sign in
                </>
              )}
            </Button>
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className="font-medium text-blue-600 underline-offset-4 transition-colors hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                onClick={onSwitchToSignup}
              >
                Sign up
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
