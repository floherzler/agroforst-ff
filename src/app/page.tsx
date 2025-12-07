"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/Auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Footer from "@/components/Footer";
import { Sprout, Users, Mail, Sparkles, Loader2 } from "lucide-react";
import { databases } from "@/models/client/config";
import env from "@/app/env";
import { ID } from "appwrite";

export default function Home() {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] || "du";
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !feedbackText.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      await databases.createDocument(
        env.appwrite.db,
        env.appwrite.nachrichten_collection_id,
        ID.unique(),
        {
          text: feedbackText.trim(),
          userID: user.$id,
        }
      );

      setSubmitStatus("success");
      setFeedbackText("");

      setTimeout(() => setSubmitStatus("idle"), 3000);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f1e8] to-[#ede5d9] text-[#1f2021] selection:bg-permdal-200">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 md:pt-32 md:pb-20 max-w-6xl mx-auto">
        <div className="text-center space-y-6 mb-12">
          <Badge variant="outline" className="border-permdal-400 text-permdal-800 bg-permdal-50/80 backdrop-blur">
            🌱 Wir sind im Wachstum
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#2c3e2d] leading-tight">
            Vom Agroforst <br />
            <span className="text-permdal-600 font-serif italic">direkt zu dir!</span>
          </h1>
          <p className="text-lg md:text-xl text-[#5a5a5a] max-w-3xl mx-auto leading-relaxed">
            Willkommen in unserem Agroforst! Wir bauen gerade unsere Direktvermarktung auf und möchten
            dich von Anfang an dabei haben. Wir stehen für echte Beziehungen zwischen Feld und Küche.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            {!user ? (
              <>
                <Button asChild size="lg" className="rounded-full px-8 shadow-lg bg-[#2c3e2d] hover:bg-[#3a523b] text-white">
                  <Link href="/signup?redirect=/">Kostenloses Konto erstellen</Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="text-[#5a5a5a] hover:text-[#2c3e2d]">
                  <Link href="#wie-es-funktioniert">Wie funktioniert&apos;s?</Link>
                </Button>
              </>
            ) : (
              <Button asChild size="lg" className="rounded-full px-8 shadow-lg">
                <Link href="/konto">Zum Mitgliederbereich</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Schema Section */}
      <section id="wie-es-funktioniert" className="py-16 px-6 bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#2c3e2d] mb-4">
              Unser Kreislauf
            </h2>
            <p className="text-lg text-[#5a5a5a] max-w-2xl mx-auto">
              So einfach verbinden wir dich mit frischen Produkten aus unserem Agroforst
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Schema SVG */}
            <div className="order-2 md:order-1">
              <div className="relative bg-white p-8 rounded-3xl shadow-lg border-2 border-permdal-100 hover:border-permdal-200 transition-all duration-300 hover:scale-105">
                <Image
                  src="/schema.svg"
                  alt="AFF Kreislauf: Vom Agroforst über Produkte und Kunden zur Bestellung"
                  width={600}
                  height={700}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>

            {/* Explanation */}
            <div className="order-1 md:order-2 space-y-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-permdal-100 flex items-center justify-center shrink-0 text-permdal-700">
                  <Sprout className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-[#2c3e2d]">1. Agroforst</h3>
                  <p className="text-[#5a5a5a] leading-relaxed">
                    Alles beginnt auf unserem Feld. Wir teilen regelmäßig Updates über unseren Newsletter mit dir.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-lilac-100 flex items-center justify-center shrink-0 text-lilac-700">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-[#2c3e2d]">2. Kunde & Mitgliedschaft</h3>
                  <p className="text-[#5a5a5a] leading-relaxed">
                    Du sagst uns, was du brauchst. Ob privat oder geschäftlich - dein kostenloses Konto ist der Start.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 text-orange-700">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-[#2c3e2d]">3. Angebot & Bestellung</h3>
                  <p className="text-[#5a5a5a] leading-relaxed">
                    Wir erstellen passende Angebote. Du bestellst transparent und direkt über dein Konto.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Future Paths */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-permdal-200 text-permdal-800 hover:bg-permdal-300 border-none">
            Bald verfügbar
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#2c3e2d]">
            Dein Weg wächst mit uns
          </h2>
          <p className="text-lg text-[#5a5a5a] max-w-2xl mx-auto">
            Heute startest du mit einem kostenlosen Basiskonto. Morgen kannst du upgraden:
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Private Card */}
          <Card className="border-2 border-permdal-200 bg-gradient-to-br from-permdal-50/80 to-white hover:border-permdal-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 opacity-75">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Sprout className="w-8 h-8 text-permdal-600" />
                    <div>
                      <Badge className="mb-2 bg-permdal-200 text-permdal-800 hover:bg-permdal-300 border-none">
                        Privat
                      </Badge>
                      <h3 className="text-2xl font-bold text-[#2c3e2d]">Genießer & Unterstützer</h3>
                    </div>
                  </div>
                </div>
                <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-none text-xs font-semibold whitespace-nowrap">
                  Bald verfügbar
                </Badge>
              </div>
              <p className="text-[#5a5a5a] leading-relaxed">
                Für alle, die frische Produkte für zuhause suchen. Das geplante <strong>Jahresabo</strong> sichert
                dir deinen Anteil an der Ernte und unterstützt aktiv den Aufbau.
              </p>
              <ul className="space-y-3 text-[#5a5a5a]">
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-permdal-100 flex items-center justify-center text-sm">✓</span>
                  Saisonale Angebote: Kisten & Ernteboxen
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-permdal-100 flex items-center justify-center text-sm">✓</span>
                  Flexible Abholstationen
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-permdal-100 flex items-center justify-center text-sm">✓</span>
                  Rezepte, Berichte & Feldeinblicke
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Business Card */}
          <Card className="border-2 border-lilac-200 bg-gradient-to-br from-lilac-50/80 to-white hover:border-lilac-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-lilac-600" />
                <div>
                  <Badge className="mb-2 bg-lilac-200 text-lilac-800 hover:bg-lilac-300 border-none">
                    Business
                  </Badge>
                  <h3 className="text-2xl font-bold text-[#2c3e2d]">Betriebe & Handel</h3>
                </div>
              </div>
              <p className="text-[#5a5a5a] leading-relaxed">
                Für Restaurants, Cafés und Läden. Das <strong>Geschäftskonto</strong> ermöglicht Kauf auf Rechnung,
                Großmengen und individuelle Anbauplanung.
              </p>
              <ul className="space-y-3 text-[#2c3e2d]">
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-lilac-100 flex items-center justify-center text-sm">✓</span>
                  B2B Konditionen & Rechnungskauf
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-lilac-100 flex items-center justify-center text-sm">✓</span>
                  Planbare Lieferoptionen
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-lilac-100 flex items-center justify-center text-sm">✓</span>
                  Anbau nach Absprache
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Feedback Form */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#2c3e2d] to-[#3a523b] text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-6 mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Gemeinsam aufbauen</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">
              Gestalte den Agroforst mit
            </h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
              Wir bauen diese Plattform für dich. Was fehlt dir? Was wünschst du dir?
              Dein Feedback fließt direkt in unseren Entwicklungsprozess ein.
            </p>
          </div>

          <Card className="bg-white/10 border-white/20 backdrop-blur-lg shadow-2xl max-w-2xl mx-auto">
            <CardContent className="p-8 space-y-6">
              <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="feedback-email" className="text-white text-base">
                    Deine E-Mail {!user && <span className="text-white/60">(Login erforderlich)</span>}
                  </Label>
                  <Input
                    id="feedback-email"
                    type="email"
                    placeholder="deine@email.com"
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-permdal-400 focus-visible:border-permdal-400 h-12"
                    disabled={!user}
                    defaultValue={user?.email || ""}
                    readOnly
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="feedback-msg" className="text-white text-base">
                    Deine Nachricht
                  </Label>
                  <textarea
                    id="feedback-msg"
                    rows={5}
                    disabled={!user || isSubmitting}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="flex w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-permdal-400 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    placeholder="Ich wünsche mir... / Ich fände es toll, wenn... / Habt ihr auch...?"
                  />
                </div>
                {user ? (
                  <Button
                    type="submit"
                    disabled={isSubmitting || !feedbackText.trim()}
                    className="w-full bg-permdal-500 hover:bg-permdal-400 text-white border-none h-12 text-base font-semibold shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
                    className="w-full bg-permdal-500 hover:bg-permdal-400 text-white border-none h-12 text-base font-semibold shadow-lg"
                  >
                    <Link href="/signup?redirect=/">Jetzt Konto erstellen für Feedback</Link>
                  </Button>
                )}
                {submitStatus === "error" && (
                  <p className="text-sm text-center text-red-300">
                    ❌ Fehler beim Senden. Bitte versuche es erneut.
                  </p>
                )}
                {submitStatus === "success" && (
                  <p className="text-sm text-center text-green-300">
                    🎉 Vielen Dank für dein Feedback!
                  </p>
                )}
                {!user && (
                  <p className="text-sm text-center text-white/80">
                    💡 Mit einem kostenlosen Account können wir dein Feedback direkt speichern und dich über Updates informieren.
                    <br />
                    <Link href="/login?redirect=/" className="underline font-semibold hover:text-white">
                      Bereits registriert? Zum Login
                    </Link>
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
