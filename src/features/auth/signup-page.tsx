"use client";

import React from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, UserRoundPlus } from "lucide-react";

import { AuthFormField } from "@/features/auth/auth-form-field";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import {
  Card,
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
              Erstelle dir ein kostenloses Konto, um von unseren neuen Angeboten
              zu erfahren.
            </p>
          </div>
        ) : null}
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
              className="border border-permdal-300 bg-surface-card text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-ring/40 focus-visible:ring-offset-background"
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
              className="border border-permdal-300 bg-surface-card text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-ring/40 focus-visible:ring-offset-background"
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
                className="border border-permdal-300 bg-surface-card pr-11 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-ring/40 focus-visible:ring-offset-background"
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
              className="border border-permdal-300 bg-surface-card text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-ring/40 focus-visible:ring-offset-background"
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
      <CardFooter className="flex flex-col items-center gap-3 text-sm text-[#1f2021]">
        <p>
          Schon registriert?{" "}
          <Link
            to="/login"
            search={{ redirect: redirectTo }}
            className="font-semibold text-primary hover:text-lilac-600"
          >
            Zum Login
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
