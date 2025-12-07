"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/Auth";
import { Eye, EyeOff, Loader2, UserRoundPlus } from "lucide-react";

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <div className={cn("flex w-full flex-col space-y-2", className)}>{children}</div>;
};

export default function SignUp() {
  const { login, createAccount } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const showQrWelcome = searchParams.get("origin") === "qr";
  const redirectTo = searchParams.get("redirect") || "/konto";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (!name || !email || !password || !confirmPassword) {
      setError("Bitte fülle alle Felder aus.");
      return;
    }

    if (password.toString() !== confirmPassword.toString()) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsLoading(true);
    setError("");

    const response = await createAccount(name.toString(), email.toString(), password.toString());

    if (response.error) {
      setError(response.error.message ?? "Die Registrierung ist fehlgeschlagen.");
      setIsLoading(false);
    } else {
      const loginResponse = await login(email.toString(), password.toString());
      if (loginResponse.error) {
        setError(loginResponse.error.message ?? "Automatischer Login nach der Registrierung fehlgeschlagen.");
        setIsLoading(false);
      } else {
        // Successful signup and login - redirect
        router.push(redirectTo);
      }
    }
  };

  return (
    <Card className="w-full border border-surface-outline bg-surface-card-strong shadow-brand-strong backdrop-blur">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-lilac-200 text-lilac-700 shadow-accent-lilac">
          <UserRoundPlus className="size-6" />
        </div>
        <CardTitle className="text-2xl">Willkommen im Agroforst</CardTitle>
        {showQrWelcome ? (
          <div className="rounded-lg border border-lilac-200/60 bg-lilac-50 px-4 py-3 text-sm text-lilac-800 shadow-inner">
            <p className="font-semibold">Schön, dass du Interesse hast!</p>
            <p className="mt-1 text-xs text-lilac-900/80">
              Erstelle dir ein kostenloses Konto, um von unseren neuen Angeboten zu erfahren.
            </p>
          </div>
        ) : null}
        <CardDescription className="text-base text-muted-foreground">
          Erstelle dein kostenloses Konto für Newsletter, Feedback und um Teil unserer Direktvermarktung zu werden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <LabelInputContainer>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Vor- und Nachname"
              className="border border-permdal-300 bg-surface-card text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-ring/40 focus-visible:ring-offset-background"
            />
          </LabelInputContainer>
          <LabelInputContainer>
            <Label htmlFor="email">Email-Adresse</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="email@beispiel.de"
              className="border border-permdal-300 bg-surface-card text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-ring/40 focus-visible:ring-offset-background"
            />
          </LabelInputContainer>
          <LabelInputContainer>
            <Label htmlFor="password">Passwort</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                className="border border-permdal-300 bg-surface-card pr-10 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-ring/40 focus-visible:ring-offset-background"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                <span className="sr-only">{showPassword ? "Passwort verbergen" : "Passwort anzeigen"}</span>
              </Button>
            </div>
          </LabelInputContainer>

          <LabelInputContainer>
            <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                className="border border-permdal-300 bg-surface-card pr-10 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-ring/40 focus-visible:ring-offset-background"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                <span className="sr-only">{showPassword ? "Passwort verbergen" : "Passwort anzeigen"}</span>
              </Button>
            </div>
          </LabelInputContainer>

          <Button type="submit" disabled={isLoading} className="w-full shadow-brand-strong">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Wird erstellt…
              </span>
            ) : (
              "Registrieren"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-3 text-sm text-[#1f2021]">
        <p>
          Du hast bereits ein Profil?{" "}
          <Link href="/login" className="font-semibold text-primary hover:text-lilac-600">
            Zum Login
          </Link>
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Nach der Registrierung kannst du im /konto Bereich direkt Feedback geben und deine Mitgliedschaft steuern.
        </p>
      </CardFooter>
    </Card>
  );
}
