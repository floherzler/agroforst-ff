"use client";

import React from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Mail } from "lucide-react";

import { PageHeader, PageShell, SurfaceSection, EmptyState } from "@/components/base/page-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/auth-store";
import { submitFeedbackMessage } from "@/lib/appwrite/appwriteProducts";

export default function FeedbackPage() {
  const { user } = useAuthStore();
  const [text, setText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "success" | "error">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.emailVerification || !text.trim()) {
      return;
    }

    setIsSubmitting(true);
    setStatus("idle");

    try {
      await submitFeedbackMessage({ text: text.trim() });
      setText("");
      setStatus("success");
    } catch (error) {
      console.error("Failed to submit feedback", error);
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Feedback"
        badge="Nur mit bestätigter E-Mail"
        description="Sag uns kurz, was fehlt, was du dir wünschst oder was wir besser machen können."
      />

      {!user ? (
        <EmptyState
          title="Zum Feedback brauchst du ein Konto"
          description="Melde dich an oder registriere dich. Das geht auch über die QR-Karte."
          action={(
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to="/login" search={{ redirect: "/feedback" }}>
                  Zum Login
                </Link>
              </Button>
              <Button asChild>
                <Link to="/signup" search={{ redirect: "/feedback" }}>
                  Konto erstellen
                </Link>
              </Button>
            </div>
          )}
        />
      ) : !user.emailVerification ? (
        <EmptyState
          title="E-Mail noch nicht bestätigt"
          description="Erst nach der Verifizierung kannst du Feedback absenden."
          action={(
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to="/konto">Zum Konto</Link>
              </Button>
              <Button asChild>
                <Link to="/konto">Verifizierung prüfen</Link>
              </Button>
            </div>
          )}
        />
      ) : (
        <SurfaceSection className="border-border/80 p-6 shadow-brand-soft sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800">
                <Mail className="size-4" />
                {user.email}
              </div>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                Nur Feedback mit bestätigter E-Mail landet hier. Wir nutzen das für Wünsche,
                Hinweise und Rückmeldungen zur Seite oder zu unseren Angeboten.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex w-full max-w-3xl flex-col gap-4">
              <Textarea
                rows={8}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Was fehlt dir? Welche Produkte, Infos oder Funktionen wären hilfreich?"
                className="min-h-[14rem] rounded-[1.35rem] border-border/70 bg-background px-4 py-4 text-base shadow-none"
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Kurz reicht. Wir lesen mit und melden uns bei Bedarf über das Konto.
                </p>

                <Button
                  type="submit"
                  disabled={isSubmitting || !text.trim()}
                  className="rounded-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Wird gesendet
                    </>
                  ) : (
                    "Feedback senden"
                  )}
                </Button>
              </div>

              {status === "success" ? (
                <p className="text-sm text-emerald-700">Danke. Das Feedback ist angekommen.</p>
              ) : null}
              {status === "error" ? (
                <p className="text-sm text-destructive">Das Feedback konnte nicht gesendet werden.</p>
              ) : null}
            </form>
          </div>
        </SurfaceSection>
      )}
    </PageShell>
  );
}
