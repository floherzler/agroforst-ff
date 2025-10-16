"use client";

import React from "react";
import { account } from "@/models/client/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type VerificationState = {
  status: "pending" | "success" | "error" | "missing";
  message?: string;
};

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const secret = searchParams.get("secret")!;
  const userId = searchParams.get("userId")!;
  const [verificationState, setVerificationState] = React.useState<VerificationState>({
    status: "pending",
    message: "Wir prüfen Ihre Verifizierung…",
  });

  React.useEffect(() => {
    if (!secret || !userId) {
      setVerificationState({
        status: "missing",
        message: "Die Verifizierungsdaten fehlen oder sind unvollständig.",
      });
      return;
    }

    let cancelled = false;

    async function verifyEmail() {
      setVerificationState({
        status: "pending",
        message: "Wir verifizieren Ihre Email…",
      });
      try {
        await account.updateVerification(userId, secret);
        if (!cancelled) {
          setVerificationState({
            status: "success",
            message: "Ihre Email-Adresse wurde erfolgreich bestätigt.",
          });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Die Email-Verifizierung ist fehlgeschlagen.";
          setVerificationState({
            status: "error",
            message,
          });
        }
      }
    }

    verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [secret, userId]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Email-Verifizierung</CardTitle>
            <CardDescription>
              {verificationState.status === "pending"
                ? "Wir verarbeiten Ihre Anfrage."
                : "Ergebnis Ihrer Verifizierung"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p
              className={
                verificationState.status === "success"
                  ? "text-green-600"
                  : verificationState.status === "error"
                    ? "text-destructive"
                    : verificationState.status === "missing"
                      ? "text-muted-foreground"
                      : "text-muted-foreground"
              }
            >
              {verificationState.message}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="default">
                <Link href="/konto">Zum Konto</Link>
              </Button>
              {(verificationState.status === "error" || verificationState.status === "missing") && (
                <Button asChild variant="outline">
                  <Link href="/auth/login">Zum Login</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
