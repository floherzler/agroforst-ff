"use client";

import React from "react";
import Link from "next/link";
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
import { Loader2, UserRoundPlus } from "lucide-react";

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
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");

    if (!name || !email || !password) {
      setError("Bitte fülle alle Felder aus.");
      return;
    }

    setIsLoading(true);
    setError("");

    const response = await createAccount(name.toString(), email.toString(), password.toString());

    if (response.error) {
      setError(response.error.message ?? "Die Registrierung ist fehlgeschlagen.");
    } else {
      const loginResponse = await login(email.toString(), password.toString());
      if (loginResponse.error) {
        setError(loginResponse.error.message ?? "Automatischer Login nach der Registrierung fehlgeschlagen.");
      }
    }

    setIsLoading(false);
  };

  return (
    <Card className="w-full border border-surface-outline bg-surface-card-strong shadow-brand-strong backdrop-blur">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-lilac-200 text-lilac-700 shadow-accent-lilac">
          <UserRoundPlus className="size-6" />
        </div>
        <CardTitle className="text-2xl">Willkommen bei Permdal</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Leg dein Profil an, damit wir dich mit saisonalen Angeboten und maßgeschneiderten Mitgliedschaften begleiten
          können.
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
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className="border border-permdal-300 bg-surface-card text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-ring/40 focus-visible:ring-offset-background"
            />
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
