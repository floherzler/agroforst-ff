"use client";

import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Mail, Sparkles, Sprout, Users } from "lucide-react";

import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/features/auth/auth-store";
import { submitFeedbackMessage } from "@/lib/appwrite/appwriteProducts";

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

      setSubmitStatus("success");
      setFeedbackText("");

      setTimeout(() => setSubmitStatus("idle"), 3000);
    } catch (error) {
      console.error("Failed to submit feedback", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f1e8] to-[#ede5d9] text-[#1f2021] selection:bg-permdal-200">
      <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 md:pb-20 md:pt-32">
        <div className="mb-12 space-y-6 text-center">
          <Badge
            variant="outline"
            className="border-permdal-400 bg-permdal-50/80 text-permdal-800 backdrop-blur"
          >
            🌱 Wir sind im Wachstum
          </Badge>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#2c3e2d] md:text-6xl lg:text-7xl">
            Vom Agroforst <br />
            <span className="font-serif italic text-permdal-600">
              direkt zu dir!
            </span>
          </h1>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-[#5a5a5a] md:text-xl">
            Willkommen in unserem Agroforst! Wir bauen gerade unsere
            Direktvermarktung auf und möchten dich von Anfang an dabei haben.
            Wir stehen für echte Beziehungen zwischen Feld und Küche.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            {!user ? (
              <>
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-[#2c3e2d] px-8 text-white shadow-lg hover:bg-[#3a523b]"
                >
                  <Link to="/signup" search={{ redirect: "/" }}>
                    Kostenloses Konto erstellen
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="text-[#5a5a5a] hover:text-[#2c3e2d]"
                >
                  <a href="#wie-es-funktioniert">Wie funktioniert&apos;s?</a>
                </Button>
              </>
            ) : (
              <Button asChild size="lg" className="rounded-full px-8 shadow-lg">
                <Link to="/konto">Zum Mitgliederbereich</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section
        id="wie-es-funktioniert"
        className="bg-white/60 px-6 py-16 backdrop-blur-sm"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-[#2c3e2d] md:text-4xl">
              Unser Kreislauf
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[#5a5a5a]">
              So einfach verbinden wir dich mit frischen Produkten aus unserem
              Agroforst
            </p>
          </div>

          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="order-2 md:order-1">
              <div className="relative rounded-3xl border-2 border-permdal-100 bg-white p-8 shadow-lg transition-all duration-300 hover:scale-105 hover:border-permdal-200">
                <img
                  src="/schema.svg"
                  alt="AFF Kreislauf: Vom Agroforst über Produkte und Kunden zur Bestellung"
                  className="h-auto w-full"
                />
              </div>
            </div>

            <div className="order-1 space-y-8 md:order-2">
              <FeatureStep
                icon={<Sprout className="h-6 w-6" />}
                title="1. Agroforst"
                body="Alles beginnt auf unserem Feld. Wir teilen regelmäßig Updates über unseren Newsletter mit dir."
                className="bg-permdal-100 text-permdal-700"
              />
              <FeatureStep
                icon={<Users className="h-6 w-6" />}
                title="2. Kunde & Mitgliedschaft"
                body="Du sagst uns, was du brauchst. Ob privat oder geschäftlich - dein kostenloses Konto ist der Start."
                className="bg-lilac-100 text-lilac-700"
              />
              <FeatureStep
                icon={<Mail className="h-6 w-6" />}
                title="3. Angebot & Bestellung"
                body="Wir erstellen passende Angebote. Du bestellst transparent und direkt über dein Konto."
                className="bg-orange-100 text-orange-700"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <Badge className="mb-4 border-none bg-permdal-200 text-permdal-800 hover:bg-permdal-300">
            Bald verfügbar
          </Badge>
          <h2 className="mb-4 text-3xl font-bold text-[#2c3e2d] md:text-4xl">
            Dein Weg wächst mit uns
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-[#5a5a5a]">
            Heute startest du mit einem kostenlosen Basiskonto. Morgen kannst du
            upgraden:
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <MembershipTeaser
            badge="Privat"
            title="Genießer & Unterstützer"
            icon={<Sprout className="h-8 w-8 text-permdal-600" />}
            className="border-permdal-200 bg-gradient-to-br from-permdal-50/80 to-white opacity-75 hover:border-permdal-300"
            bullets={[
              "Saisonale Angebote: Kisten & Ernteboxen",
              "Flexible Abholstationen",
              "Rezepte, Berichte & Feldeinblicke",
            ]}
            body="Für alle, die frische Produkte für zuhause suchen. Das geplante Jahresabo sichert dir deinen Anteil an der Ernte und unterstützt aktiv den Aufbau."
            statusBadge="Bald verfügbar"
            statusClassName="bg-orange-100 text-orange-800 hover:bg-orange-200"
          />
          <MembershipTeaser
            badge="Business"
            title="Betriebe & Handel"
            icon={<Users className="h-8 w-8 text-lilac-600" />}
            className="border-lilac-200 bg-gradient-to-br from-lilac-50/80 to-white hover:border-lilac-300"
            bullets={[
              "B2B Konditionen & Rechnungskauf",
              "Planbare Lieferoptionen",
              "Anbau nach Absprache",
            ]}
            body="Für Restaurants, Cafés und Läden. Das Geschäftskonto ermöglicht Kauf auf Rechnung, Großmengen und individuelle Anbauplanung."
          />
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#2c3e2d] to-[#3a523b] px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 space-y-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Gemeinsam aufbauen</span>
            </div>
            <h2 className="text-3xl font-bold md:text-4xl">
              Gestalte den Agroforst mit
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/80">
              Wir bauen diese Plattform für dich. Was fehlt dir? Was wünschst du
              dir? Dein Feedback fließt direkt in unseren Entwicklungsprozess
              ein.
            </p>
          </div>

          <Card className="mx-auto max-w-2xl border-white/20 bg-white/10 shadow-2xl backdrop-blur-lg">
            <CardContent className="space-y-6 p-8">
              <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="feedback-email"
                    className="text-base text-white"
                  >
                    Deine E-Mail{" "}
                    {!user ? (
                      <span className="text-white/60">
                        (Login erforderlich)
                      </span>
                    ) : null}
                  </Label>
                  <Input
                    id="feedback-email"
                    type="email"
                    placeholder="deine@email.com"
                    className="h-12 border-white/20 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-permdal-400 focus-visible:ring-permdal-400"
                    disabled={!user}
                    defaultValue={user?.email || ""}
                    readOnly
                  />
                </div>
                <div className="space-y-3">
                  <Label
                    htmlFor="feedback-message"
                    className="text-base text-white"
                  >
                    Deine Nachricht
                  </Label>
                  <textarea
                    id="feedback-message"
                    rows={5}
                    disabled={!user || isSubmitting}
                    value={feedbackText}
                    onChange={(event) => setFeedbackText(event.target.value)}
                    className="flex w-full resize-none rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-permdal-400 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Ich wünsche mir... / Ich fände es toll, wenn... / Habt ihr auch...?"
                  />
                </div>
                {user ? (
                  <Button
                    type="submit"
                    disabled={isSubmitting || !feedbackText.trim()}
                    className="h-12 w-full border-none bg-permdal-500 text-base font-semibold text-white shadow-lg hover:bg-permdal-400 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Wird gesendet...
                      </>
                    ) : submitStatus === "success" ? (
                      "✓ Gesendet!"
                    ) : (
                      "Feedback absenden"
                    )}
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="h-12 w-full border-none bg-permdal-500 text-base font-semibold text-white shadow-lg hover:bg-permdal-400"
                  >
                    <Link to="/signup" search={{ redirect: "/" }}>
                      Jetzt Konto erstellen für Feedback
                    </Link>
                  </Button>
                )}

                {submitStatus === "error" ? (
                  <p className="text-center text-sm text-red-300">
                    ❌ Fehler beim Senden. Bitte versuche es erneut.
                  </p>
                ) : null}
                {submitStatus === "success" ? (
                  <p className="text-center text-sm text-green-300">
                    🎉 Vielen Dank für dein Feedback!
                  </p>
                ) : null}
                {!user ? (
                  <p className="text-center text-sm text-white/80">
                    💡 Mit einem kostenlosen Account können wir dein Feedback
                    direkt speichern und dich über Updates informieren.
                    <br />
                    <Link
                      to="/login"
                      search={{ redirect: "/" }}
                      className="font-semibold underline hover:text-white"
                    >
                      Bereits registriert? Zum Login
                    </Link>
                  </p>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeatureStep({
  icon,
  title,
  body,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  className: string;
}) {
  return (
    <div className="flex gap-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${className}`}
      >
        {icon}
      </div>
      <div>
        <h3 className="mb-2 text-xl font-bold text-[#2c3e2d]">{title}</h3>
        <p className="leading-relaxed text-[#5a5a5a]">{body}</p>
      </div>
    </div>
  );
}

function MembershipTeaser({
  badge,
  title,
  icon,
  body,
  bullets,
  className,
  statusBadge,
  statusClassName,
}: {
  badge: string;
  title: string;
  icon: React.ReactNode;
  body: string;
  bullets: string[];
  className: string;
  statusBadge?: string;
  statusClassName?: string;
}) {
  return (
    <Card
      className={`border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${className}`}
    >
      <CardContent className="space-y-6 p-8">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="mb-4 flex items-center gap-3">
              {icon}
              <div>
                <Badge className="mb-2 border-none bg-permdal-200 text-permdal-800 hover:bg-permdal-300">
                  {badge}
                </Badge>
                <h3 className="text-2xl font-bold text-[#2c3e2d]">{title}</h3>
              </div>
            </div>
          </div>
          {statusBadge ? (
            <Badge
              className={`whitespace-nowrap border-none text-xs font-semibold ${statusClassName}`}
            >
              {statusBadge}
            </Badge>
          ) : null}
        </div>
        <p className="leading-relaxed text-[#5a5a5a]">{body}</p>
        <ul className="space-y-3 text-[#5a5a5a]">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-permdal-100 text-sm">
                ✓
              </span>
              {bullet}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
