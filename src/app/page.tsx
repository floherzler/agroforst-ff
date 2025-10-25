"use client";

import React from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/Auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BriefcaseBusiness,
  HeartHandshake,
  Leaf,
  PackageCheck,
  UserRoundPlus,
} from "lucide-react";

type AccentTone = "lilac" | "green";

type AudienceCard = {
  title: string;
  message: string;
  subline: string;
  icon: React.ComponentType<{ className?: string }>;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  accent?: AccentTone;
};

const audienceCards: AudienceCard[] = [
  {
    title: "Für Privatmitglieder",
    message: "Reserviere dir saisonale Ernten, erhalte Updates aus dem Feld und finde alle Bestellungen im Konto.",
    subline: "Wir hören zu, passen Sortimente an dein Feedback an und bleiben persönlich erreichbar.",
    icon: Leaf,
    primary: { label: "Mitglied werden", href: "/konto" },
    secondary: { label: "Zum Konto", href: "/konto" },
    accent: "green",
  },
  {
    title: "Für Business-Partner",
    message: "Plane größere Mengen mit uns, nutze Rechnungskauf und sprich jederzeit direkt mit unserem Team.",
    subline: "Gemeinsam entwickeln wir Sortimente, Lieferfenster und Spezialkulturen für deine Kundschaft.",
    icon: BriefcaseBusiness,
    primary: { label: "Termin vereinbaren", href: "/marktplatz" },
    secondary: { label: "Kontakt aufnehmen", href: "/konto" },
    accent: "lilac",
  },
];

const steps = [
  {
    title: "Konto erstellen",
    description: "Registriere dich in unter 2 Minuten und entdecke deinen persönlichen Bereich.",
    icon: UserRoundPlus,
    href: "/konto",
  },
  {
    title: "Wünsche teilen",
    description: "Hinterlege Bedarf, Abholmöglichkeiten oder Lieferwünsche - wir melden uns.",
    icon: HeartHandshake,
    href: "/konto",
  },
  {
    title: "Ernten genießen",
    description: "Sichere dir saisonale Produkte oder plane Großmengen direkt im /konto Bereich.",
    icon: PackageCheck,
    href: "/konto",
  },
];

export default function Home() {
  const { user } = useAuthStore();
  const displayName = user?.name || user?.email || "Permdal-Gast";

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#f7f1e8]">
      <main className="flex w-full flex-1 justify-center">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-12 px-4 py-16 text-center sm:px-6 lg:px-8">
          <Card className="w-full max-w-3xl border-none bg-surface-card-strong shadow-brand-strong backdrop-blur">
            <CardHeader className="space-y-4 text-center">
              <CardTitle className="text-3xl font-semibold sm:text-4xl">
                Werde Teil unserer Agroforst-Gemeinschaft - als <span className="text-primary">Mitglied</span> oder
                <span className="text-lilac-600"> Partnerbetrieb</span>.
              </CardTitle>
              <CardDescription className="mx-auto max-w-2xl text-base text-muted-foreground">
                Wir bauen in Brandenburg vielfältig an, hören aktiv zu und liefern transparent über unseren
                Mitgliederbereich. Dein Konto sammelt Guthaben, Bestellungen und Feedback an einem Ort.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="shadow-brand-strong">
                <Link href="/konto" className="inline-flex items-center gap-2">
                  Zum Mitgliederbereich
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {!user ? (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-permdal-300 bg-white text-[#1f2021] shadow-brand-soft hover:bg-permdal-50"
                >
                  <Link href="/signup" className="inline-flex items-center gap-2">
                    Jetzt registrieren
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <section className="grid w-full gap-6 md:grid-cols-2">
            {audienceCards.map(({ title, message, subline, icon: Icon, primary, secondary, accent = "green" }) => {
              const isLilac = accent === "lilac";
              return (
                <Card
                  key={title}
                  className={cn(
                    "border bg-surface-card transition-all duration-200 hover:-translate-y-1",
                    isLilac
                      ? "border-lilac-soft shadow-accent-lilac hover:shadow-accent-lilac"
                      : "border-surface-outline shadow-brand-soft hover:shadow-brand-strong"
                  )}
                >
                  <CardHeader className="space-y-3 text-center">
                    <div
                      className={cn(
                        "mx-auto flex size-12 items-center justify-center rounded-full",
                        isLilac ? "bg-lilac-200 text-lilac-700" : "bg-permdal-200 text-primary"
                      )}
                    >
                      <Icon className="size-6" />
                    </div>
                    <CardTitle className="text-2xl">{title}</CardTitle>
                    <CardDescription className="text-base text-muted-foreground">{message}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className={cn("text-sm", isLilac ? "text-lilac-700/90" : "text-[#1f2021]/90")}>{subline}</p>
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                      <Button
                        asChild
                        className={cn(
                          "shadow-brand-soft",
                          isLilac && "bg-lilac-500 hover:bg-lilac-600 text-white shadow-accent-lilac"
                        )}
                      >
                        <Link href={primary.href} className="inline-flex items-center gap-2">
                          {primary.label}
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className={cn(
                          "bg-white text-[#1f2021] shadow-brand-soft",
                          isLilac
                            ? "border-lilac-soft hover:bg-lilac-100/60 text-lilac-700"
                            : "border-permdal-300 hover:bg-permdal-50"
                        )}
                      >
                        <Link href={secondary.href} className="inline-flex items-center gap-2">
                          {secondary.label}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="w-full max-w-3xl">
            <Card className="border border-surface-outline bg-surface-card shadow-brand-soft">
              <CardHeader className="space-y-2 text-center">
                <CardTitle className="text-2xl">So einfach geht&apos;s</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  In drei Schritten bist du im Mitgliederbereich und erhältst Zugang zu saisonalen Angeboten und
                  persönlichem Austausch.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                {steps.map(({ title, description, icon: Icon }) => (
                  <div
                    key={title}
                    className="flex h-full flex-col items-center gap-3 rounded-2xl border border-dashed p-5 text-center shadow-inner border-lilac-soft bg-surface-lilac"
                  >
                    <div className="flex size-10 items-center justify-center rounded-full shadow-brand-soft bg-lilac-200 text-lilac-700 shadow-accent-lilac">
                      <Icon className="size-5" />
                    </div>
                    <p className="text-sm font-semibold text-lilac-700">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
