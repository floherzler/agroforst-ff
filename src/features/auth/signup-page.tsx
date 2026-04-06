"use client";

import React from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  Loader2,
  UserRoundPlus,
} from "lucide-react";

import { BrandCard } from "@/components/brand/brand-card";
import { AuthFormField } from "@/features/auth/auth-form-field";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const { login, createAccount } = useAuthStore();
  const navigate = useNavigate();
  const searchStr = useLocation({ select: (state) => state.searchStr });
  const params = new URLSearchParams(searchStr);
  const redirectTo = params.get("redirect") || "/konto";
  const prefilledEmail = params.get("email") || "";
  const showQrWelcome = params.get("origin") === "qr";
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
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

    const createAccountResponse = await createAccount(
      name.toString(),
      email.toString(),
      password.toString(),
    );

    if (createAccountResponse.error) {
      setError(
        createAccountResponse.error.message ??
        "Die Registrierung ist fehlgeschlagen.",
      );
      setIsLoading(false);
      return;
    }

    const loginResponse = await login(email.toString(), password.toString());

    if (loginResponse.error) {
      setError(
        loginResponse.error.message ??
        "Automatischer Login nach der Registrierung fehlgeschlagen.",
      );
      setIsLoading(false);
      return;
    }

    void navigate({ to: redirectTo, replace: true });
  }

  if (showQrWelcome) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col px-5 pb-8 pt-6">
        <section className="mt-8 space-y-4">
          <div className="space-y-3">
            <h1 className="max-w-[15ch] font-display text-[2.45rem] leading-[0.92] text-[var(--color-soil-900)]">
              Willkommen im Agroforstbetrieb Frank Fege!
            </h1>
            <p className="max-w-[31ch] text-base leading-7 text-[var(--color-soil-700)]">
              Schön, dass du Interesse hast! Melde dich an, um immer auf dem
              Laufenden zu bleiben.
            </p>
            <p className="max-w-[32ch] text-sm leading-6 text-muted-foreground">
              Schau dir auch unsere Mitgliedschafts-Modelle an: privat mit
              Jahresguthaben oder auf Rechnung für Unternehmen und unterstütze nachhaltige, lokale Landwirtschaft.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center text-base font-semibold text-foreground hover:text-[var(--color-forest-800)]"
          >
            Mehr Info -&gt;
          </Link>
        </section>

        <form
          className="mt-8 space-y-4 border-t border-[color:rgba(39,38,21,0.12)] pt-6"
          onSubmit={handleSubmit}
        >
          {error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive">
              {error}
            </div>
          ) : null}
          <AuthFormField>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Dein Name"
              className="h-12 rounded-2xl bg-white/80"
            />
          </AuthFormField>
          <AuthFormField>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={prefilledEmail}
              placeholder="email@beispiel.de"
              className="h-12 rounded-2xl bg-white/80"
            />
          </AuthFormField>
          <AuthFormField>
            <Label htmlFor="password">Passwort</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mindestens 8 Zeichen"
                className="h-12 rounded-2xl bg-white/80 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </AuthFormField>
          <AuthFormField>
            <Label htmlFor="confirmPassword">Passwort wiederholen</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Passwort wiederholen"
              className="h-12 rounded-2xl bg-white/80"
            />
          </AuthFormField>
          <Button
            type="submit"
            disabled={isLoading}
            className="h-12 w-full rounded-2xl shadow-none"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Konto wird erstellt…
              </span>
            ) : (
              "Jetzt anmelden"
            )}
          </Button>
        </form>

        <p className="mt-5 text-sm text-[var(--color-soil-700)]">
          Schon dabei?{" "}
          <Link
            to="/login"
            search={{ redirect: redirectTo, origin: "qr" }}
            className="font-semibold text-foreground hover:text-[var(--color-forest-800)]"
          >
            Zum Login
          </Link>
        </p>
      </main>
    );
  }

  return (
    <BrandCard tone="strong" className="w-full">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-lilac-200 text-lilac-700 shadow-accent-lilac">
          <UserRoundPlus className="size-6" />
        </div>
        <CardTitle className="text-2xl">Willkommen im Agroforst</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Erstelle dein kostenloses Konto für Newsletter, Feedback und um Teil
          unserer Direktvermarktung zu werden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <AuthFormField>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Dein Name"
            />
          </AuthFormField>
          <AuthFormField>
            <Label htmlFor="email">Email-Adresse</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={prefilledEmail}
              placeholder="email@beispiel.de"
            />
          </AuthFormField>
          <AuthFormField>
            <Label htmlFor="password">Passwort</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mindestens 8 Zeichen"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </AuthFormField>
          <AuthFormField>
            <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Passwort wiederholen"
            />
          </AuthFormField>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full shadow-brand-strong"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Konto wird erstellt…
              </span>
            ) : (
              "Konto erstellen"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-3 text-sm text-foreground">
        <p>
          Schon registriert?{" "}
          <Link
            to="/login"
            search={{ redirect: redirectTo }}
            className="font-semibold text-primary hover:text-lilac-700"
          >
            Zum Login
          </Link>
        </p>
      </CardFooter>
    </BrandCard>
  );
}
