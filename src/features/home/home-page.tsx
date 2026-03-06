"use client";

import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Loader2,
  Mail,
  MessageSquare,
  ShoppingBasket,
  Sprout,
  Users,
} from "lucide-react";

import {
  PageHeader,
  PageShell,
  SurfaceSection,
} from "@/components/base/page-shell";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/auth-store";
import { submitFeedbackMessage } from "@/lib/appwrite/appwriteProducts";

const steps = [
  {
    title: "Agroforst",
    description:
      "Wir bauen saisonal an und teilen transparent, was gerade wächst und wann etwas verfügbar wird.",
    icon: Sprout,
  },
  {
    title: "Konto & Austausch",
    description:
      "Mit einem kostenlosen Konto bekommst du Updates, kannst Feedback geben und später einfacher bestellen.",
    icon: Users,
  },
  {
    title: "Angebote & Bestellung",
    description:
      "Sobald Produkte verfügbar sind, findest du sie im Marktplatz und kannst direkt anfragen.",
    icon: ShoppingBasket,
  },
];

const membershipCards = [
  {
    badge: "Privat",
    title: "Für Haushalte",
    description:
      "Saisonale Produkte, einfache Abholung und ein direkter Draht zum Betrieb.",
    bullets: [
      "Kisten, Erntefenster und Produktupdates",
      "Kostenloser Einstieg ohne Abo",
      "Später ausbaubar für feste Mitgliedschaften",
    ],
  },
  {
    badge: "Business",
    title: "Für Betriebe",
    description:
      "Für Gastronomie, Läden und Weiterverarbeitung mit planbaren Mengen und klarer Kommunikation.",
    bullets: [
      "Anfrage von größeren Mengen",
      "B2B-orientierte Angebotsübersicht",
      "Perspektivisch mit Rechnung und Planung",
    ],
  },
];

export default function HomePage() {
  const { user } = useAuthStore();
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  async function handleFeedbackSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!user || !feedbackText.trim()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      await submitFeedbackMessage({
        text: feedbackText.trim(),
        userId: user.id,
      });
      setFeedbackText("");
      setSubmitStatus("success");
      setTimeout(() => setSubmitStatus("idle"), 3000);
    } catch (error) {
      console.error("Failed to submit feedback", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell containerClassName="gap-10 py-10 sm:py-14">
      <PageHeader
        centered
        badge="Im Aufbau"
        title="Direktvermarktung aus dem Agroforst"
        description="Ein reduzierter Einstieg für Produkte, Angebote und Mitgliedschaft. Erst klar und funktional, dann weiter ausbauen."
        actions={
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            {user ? (
              <Button asChild size="lg">
                <Link to="/konto">Zum Mitgliederbereich</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link to="/signup" search={{ redirect: "/" }}>
                    Kostenloses Konto erstellen
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/marktplatz">Zum Marktplatz</Link>
                </Button>
              </>
            )}
          </div>
        }
      />

      <SurfaceSection className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-border/70 p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="space-y-3">
              <Badge variant="secondary">So funktioniert es</Badge>
              <h2 className="text-2xl font-semibold">Einfacher Kreislauf</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Der Fokus liegt zuerst auf Verständlichkeit: Produkte sichtbar
                machen, Verfügbarkeit erklären und Kommunikation direkt halten.
              </p>
            </div>
            <div className="mt-6 rounded-2xl border border-border/70 bg-secondary/40 p-4">
              <img
                src="/schema.svg"
                alt="AFF Kreislauf: Vom Agroforst über Produkte und Kunden zur Bestellung"
                className="h-auto w-full"
              />
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:p-6">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <Card key={step.title} className="shadow-none">
                  <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{step.title}</CardTitle>
                      <CardDescription>{step.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </SurfaceSection>

      <section className="grid gap-6 lg:grid-cols-2">
        {membershipCards.map((card) => (
          <SurfaceSection key={card.title}>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">
                {card.badge}
              </Badge>
              <CardTitle>{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {card.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <span className="mt-1 size-2 rounded-full bg-primary" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </SurfaceSection>
        ))}
      </section>

      <SurfaceSection>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <CardTitle>Feedback zum Aufbau</CardTitle>
              <CardDescription>
                Was fehlt dir im Marktplatz oder im Mitgliederbereich?
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="feedback-email">E-Mail</Label>
                <Input
                  id="feedback-email"
                  type="email"
                  disabled={!user}
                  defaultValue={user?.email || ""}
                  readOnly
                />
              </div>
              <div className="flex items-end">
                {!user ? (
                  <p className="text-sm text-muted-foreground">
                    Feedback wird nach dem Login direkt deinem Konto
                    zugeordnet.
                  </p>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
                    <Mail className="size-4" />
                    Eingeloggt als {user.email}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">Nachricht</Label>
              <Textarea
                id="feedback-message"
                rows={5}
                disabled={!user || isSubmitting}
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                placeholder="Welche Funktion fehlt dir? Was sollte einfacher werden?"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {user ? (
                <Button
                  type="submit"
                  disabled={isSubmitting || !feedbackText.trim()}
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
              ) : (
                <Button asChild>
                  <Link to="/signup" search={{ redirect: "/" }}>
                    Konto erstellen
                  </Link>
                </Button>
              )}

              <div className="text-sm text-muted-foreground">
                {submitStatus === "success"
                  ? "Danke, dein Feedback wurde gespeichert."
                  : null}
                {submitStatus === "error"
                  ? "Das Feedback konnte gerade nicht gesendet werden."
                  : null}
                {!user ? (
                  <Link
                    to="/login"
                    search={{ redirect: "/" }}
                    className="font-medium"
                  >
                    Bereits registriert? Zum Login
                  </Link>
                ) : null}
              </div>
            </div>
          </form>
        </CardContent>
      </SurfaceSection>
    </PageShell>
  );
}
