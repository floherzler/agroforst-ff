"use client";

import React from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Loader2, LockKeyhole } from "lucide-react";

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

export default function LoginPage() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const searchStr = useLocation({ select: (state) => state.searchStr });
  const redirectTo = new URLSearchParams(searchStr).get("redirect") || "/konto";
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    if (!email || !password) {
      setError("Bitte fülle alle Felder aus.");
      return;
    }

    setIsLoading(true);
    setError("");

    const loginResponse = await login(email.toString(), password.toString());

    if (loginResponse.error) {
      setError(loginResponse.error.message ?? "Der Login ist fehlgeschlagen.");
      setIsLoading(false);
      return;
    }

    void navigate({ to: redirectTo, replace: true });
  }

  return (
    <Card className="w-full border border-surface-outline bg-surface-card-strong shadow-brand-strong backdrop-blur">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-lilac-200 text-lilac-700 shadow-accent-lilac">
          <LockKeyhole className="size-6" />
        </div>
        <CardTitle className="text-2xl">Willkommen zurück</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Melde dich an, um Feedback zu geben, deine Bestellungen zu verwalten
          und deinen Mitgliederbereich zu nutzen.
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
            <Label htmlFor="email">Email-Adresse</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="email@beispiel.de"
              className="border border-permdal-300 bg-surface-card text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-ring/40 focus-visible:ring-offset-background"
            />
          </AuthFormField>
          <AuthFormField>
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
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
                Wird eingeloggt…
              </span>
            ) : (
              "Anmelden"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-3 text-sm text-[#1f2021]">
        <p>
          Noch kein Profil?{" "}
          <Link
            to="/signup"
            search={{ redirect: redirectTo }}
            className="font-semibold text-primary hover:text-lilac-600"
          >
            Jetzt registrieren
          </Link>
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Wir schützen deine Daten und nutzen sie nur, um dir saisonale Updates
          zu schicken, wenn du zustimmst.
        </p>
      </CardFooter>
    </Card>
  );
}
