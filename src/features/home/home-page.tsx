"use client";

import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Loader2, Mail, MapPin } from "lucide-react";

import { PageShell } from "@/components/base/page-shell";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/auth-store";
import { submitFeedbackMessage } from "@/lib/appwrite/appwriteProducts";
import type { CarouselApi } from "@/components/ui/carousel";
import { Label } from "@/components/ui/label";
import { InView } from "@/components/motion-primitives/in-view";
import { TextLoop } from "@/components/motion-primitives/text-loop";

const processSteps = [
  {
    number: "01",
    title: "Produkte ansehen",
    text: "Schau, was wann wächst und angeboten wird.",
  },
  {
    number: "02",
    title: "Erntepost bekommen",
    text: "Mit einem kostenlosen Konto erfährst du zuerst, was wir für euch anbauen.",
  },
  {
    number: "03",
    title: "Bestellen oder anfragen",
    text: "Bei Interesse kommst du schnell mit uns ins Gespräch und direkt zur Bestellung.",
  },
];

const corePromises = [
  "Prignitzer Produkte.",
  "Direkter Draht.",
  "Gemeinsamer Genuss.",
];

const feedbackOptions = [
  "denkst.",
  "suchst.",
  "brauchst.",
  "willst.",
  "vermisst.",
  "bietest.",
  "dir wünschst.",
];

const galleryImages = [
  {
    src: "/img/herbst.jpeg",
    alt: "Herbstlicher Blick auf den Agroforst",
    label: "Herbst im Agroforst",
  },
  {
    src: "/img/kartoffel-hänger.jpeg",
    alt: "Frisch geerntete Kartoffeln auf dem Anhänger",
    label: "Ernte direkt vom Feld",
  },
  {
    src: "/img/erdbeer-körbe.jpeg",
    alt: "Frisch geerntete Erdbeeren in Holzkörben",
    label: "Saisonale Früchte",
  },
  {
    src: "/img/garten-nebel.jpeg",
    alt: "Nebel über dem Feld in der Prignitz",
    label: "Morgens im Agroforst",
  },
];

export default function HomePage() {
  const { user, createAccount, login } = useAuthStore();
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = React.useState(0);

  React.useEffect(() => {
    if (!carouselApi) {
      return;
    }

    setCurrentSlide(carouselApi.selectedScrollSnap());

    const handleSelect = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    };

    carouselApi.on("select", handleSelect);

    return () => {
      carouselApi.off("select", handleSelect);
    };
  }, [carouselApi]);

  async function handleInlineSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (!name || !email || !password || !confirmPassword) {
      setSignupError("Bitte fülle alle Felder aus.");
      setSignupSuccess("");
      return;
    }

    if (password.toString() !== confirmPassword.toString()) {
      setSignupError("Die Passwörter stimmen nicht überein.");
      setSignupSuccess("");
      return;
    }

    setIsSigningUp(true);
    setSignupError("");
    setSignupSuccess("");

    const createAccountResponse = await createAccount(
      name.toString(),
      email.toString(),
      password.toString(),
    );

    if (!createAccountResponse.success) {
      setSignupError(
        createAccountResponse.error?.message ??
        "Die Registrierung ist fehlgeschlagen.",
      );
      setIsSigningUp(false);
      return;
    }

    const loginResponse = await login(email.toString(), password.toString());

    if (!loginResponse.success) {
      setSignupError(
        loginResponse.error?.message ??
        "Der Login nach der Registrierung ist fehlgeschlagen.",
      );
      setIsSigningUp(false);
      return;
    }

    event.currentTarget.reset();
    setSignupSuccess("Konto erstellt. Du kannst jetzt direkt eine Nachricht senden.");
    setIsSigningUp(false);
  }

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
    <PageShell
      className="relative overflow-hidden"
      containerClassName="gap-10 px-4 pb-16 pt-6 sm:gap-14 sm:px-6 sm:pt-8 lg:px-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(240,91,40,0.20),transparent_40%),radial-gradient(circle_at_18%_18%,rgba(217,166,37,0.18),transparent_26%),linear-gradient(180deg,#f8efe1_0%,#f6f1e6_45%,#f4efe6_100%)]"
      />

      <section className="landing-reveal home-hero relative overflow-hidden rounded-[2rem] px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="home-hero-image-wrap home-hero-image-wrap-left" aria-hidden="true">
          <img
            src="/img/schnee-feld.jpeg"
            alt=""
            className="home-hero-image h-full w-full object-cover"
          />
        </div>

        <div className="home-hero-image-wrap" aria-hidden="true">
          <img
            src="/img/herbst.jpeg"
            alt=""
            className="home-hero-image h-full w-full object-cover"
          />
        </div>

        <div className="relative flex flex-col items-center gap-8 text-center">
          <div className="flex max-w-4xl flex-col items-center gap-5 lg:max-w-[56rem]">
            <h1 className="font-display text-[3rem] leading-[0.92] tracking-[-0.04em] text-balance text-white sm:text-[4.4rem] lg:max-w-[11ch] lg:text-[5.6rem]">
              Prignitzer Permakultur Produkte.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
              Frisch geerntet, direkt angeboten und nah am Hof.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full border border-white/20 bg-[rgba(234,220,190,0.92)] px-6 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-soil-900)] shadow-[0_18px_38px_-22px_rgba(16,29,23,0.45)] hover:bg-[rgba(244,233,209,0.96)]"
            >
              <Link to="/produkte">
                Produkte entdecken
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-white/18 bg-[rgba(255,248,239,0.08)] px-6 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-white/92 hover:bg-[rgba(255,248,239,0.14)] hover:text-white"
            >
              <Link to="/signup" search={{ redirect: "/" }}>
                Erntepost erhalten
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-[var(--color-soil-900)]/8 bg-white/42 px-5 py-3 shadow-[0_26px_60px_-50px_rgba(35,22,15,0.22)] backdrop-blur-[10px] sm:px-8 sm:py-4">
        {processSteps.map((step, index) => {
          const stepContent = (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-end sm:justify-center sm:gap-4">
                <span className="font-display text-4xl leading-none tracking-[-0.05em] text-[var(--color-harvest-600)] sm:text-5xl">
                  {step.number}
                </span>
                <h2 className="max-w-4xl font-display text-3xl leading-[1.02] tracking-[-0.03em] text-[var(--color-soil-900)] sm:text-[2.6rem]">
                  {step.title}
                </h2>
              </div>
              <p className="max-w-2xl text-base leading-7 text-[var(--color-soil-700)] sm:text-lg">
                {step.text}
              </p>
            </div>
          );

          if (index === 0) {
            return (
              <article
                key={step.number}
                className="home-step border-b border-[var(--color-soil-900)]/8 px-2 py-7 sm:px-3 sm:py-9"
              >
                {stepContent}
              </article>
            );
          }

          return (
            <InView
              key={step.number}
              as="article"
              once
              viewOptions={{ margin: "0px 0px -10% 0px" }}
              transition={{ duration: 1.05, delay: (index - 1) * 0.14, ease: [0.22, 1, 0.36, 1] }}
              variants={{
                hidden: { opacity: 0, y: 42, filter: "blur(12px)" },
                visible: { opacity: 1, y: 0, filter: "blur(0px)" },
              }}
              className="home-step border-b border-[var(--color-soil-900)]/8 px-2 py-7 last:border-b-0 sm:px-3 sm:py-9"
            >
              {stepContent}
            </InView>
          );
        })}
      </section>

      <section className="landing-reveal home-vision-panel relative overflow-hidden rounded-[2.2rem] px-5 py-8 sm:px-8 sm:py-10 lg:-mx-6 lg:px-10 xl:-mx-10 xl:px-12">
        <div className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr] lg:items-center">
          <div className="home-schema-wrap">
            <img
              src="/schema.svg"
              alt="Handgezeichnete Skizze des Kreislaufs zwischen Agroforst, Produkten, Angeboten, Mitgliedschaft und Bestellung"
              className="home-schema-image w-full bg-white object-contain"
            />
          </div>

          <div className="home-vision-copy flex flex-col gap-5 text-center lg:text-left">
            <div className="home-vision-copy-line">
              <p className="max-w-xl font-display text-[2rem] leading-[0.98] tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-[2.6rem]">
                Gemeinsam wollen wir Landwirtschaft zirkulärer und lokaler gestalten.
              </p>
            </div>
            <div className="home-vision-copy-line">
              <p className="max-w-xl font-display text-[2rem] leading-[0.98] tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-[2.6rem]">
                Mit den Jahreszeiten entstehen neue Produkte, neue Wünsche und neue Möglichkeiten für die Gemeinschaft.
              </p>
            </div>
            <div className="home-vision-copy-line">
              <p className="max-w-xl font-display text-[2rem] leading-[0.98] tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-[2.6rem]">
                Aus Anbau, Angebot, Austausch und Bestellung soll ein Kreislauf wachsen, der Hof, Region und Menschen stärker verbindet.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-reveal home-promise-panel px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
        <div className="home-promise-shell flex flex-col items-center gap-6 text-center">
          <div className="home-promise-heading flex max-w-3xl flex-col items-center gap-4">
            <p className="font-accent text-[0.78rem] uppercase tracking-[0.28em] text-[var(--color-harvest-600)]">
              Unsere Versprechen
            </p>
            <h2 className="max-w-4xl font-display text-[2.3rem] leading-[0.94] tracking-[-0.05em] text-[var(--color-soil-900)] sm:text-[3rem] lg:text-[3.8rem]">
              Was zwischen Hof und Gemeinschaft wachsen soll.
            </h2>
            <p className="max-w-2xl text-base leading-7 text-[var(--color-soil-700)] sm:text-lg">
              Klar im Angebot, nah im Kontakt und spürbar im Genuss.
            </p>
          </div>

          <div className="home-promise-stage">
            <div className="home-promise-stage-glow" aria-hidden="true" />
            <TextLoop
              className="home-promise-loop"
              interval={3.6}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              variants={{
                initial: { opacity: 0, y: 34, scale: 0.92, filter: "blur(10px)" },
                animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
                exit: { opacity: 0, y: -28, scale: 1.03, filter: "blur(8px)" },
              }}
            >
              {corePromises.map((promise) => (
                <span key={promise} className="home-promise-loop-item">
                  {promise}
                </span>
              ))}
            </TextLoop>
          </div>
        </div>
      </section>

      <section className="landing-reveal overflow-hidden rounded-[2rem] border border-[var(--color-soil-900)]/8 bg-white/58 px-5 py-6 shadow-[0_30px_70px_-52px_rgba(35,22,15,0.36)] sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6">
          <div className="max-w-4xl px-1 text-center">
            <h2 className="font-display text-4xl leading-[0.96] tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-[3.6rem]">
              Ein Blick auf den Hof.
            </h2>
          </div>

          <div className="max-w-3xl px-1 text-center self-center">
            <p className="text-base leading-7 text-[var(--color-soil-700)] sm:text-lg">
              Ein paar erste Aufnahmen aus dem Aufbau des Agroforst!
            </p>
          </div>

          <Carousel
            setApi={setCarouselApi}
            opts={{ align: "start", loop: true }}
            className="w-full"
          >
            <CarouselContent>
              {galleryImages.map((image) => (
                <CarouselItem key={image.src} className="basis-full">
                  <figure className="overflow-hidden rounded-[1.9rem] border border-[var(--color-soil-900)]/8 bg-white/70">
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="h-[18rem] w-full object-cover sm:h-[23rem] lg:h-[28rem]"
                    />
                    <figcaption className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-[var(--color-soil-700)] sm:px-5">
                      <span>{image.label}</span>
                      <span className="font-accent text-[0.72rem] uppercase tracking-[0.18em] text-[var(--color-soil-500)]">
                        {currentSlide + 1}/{galleryImages.length}
                      </span>
                    </figcaption>
                  </figure>
                </CarouselItem>
              ))}
            </CarouselContent>

            <button
              type="button"
              aria-label="Vorheriges Bild"
              onClick={() => carouselApi?.scrollPrev()}
              className="absolute left-4 top-[58%] z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-soil-900)]/12 bg-[rgba(247,241,231,0.96)] text-[var(--color-soil-900)] shadow-[0_18px_34px_-20px_rgba(35,22,15,0.55)] backdrop-blur transition hover:bg-white"
            >
              <ArrowLeft className="size-5" />
            </button>

            <button
              type="button"
              aria-label="Nächstes Bild"
              onClick={() => carouselApi?.scrollNext()}
              className="absolute right-4 top-[58%] z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-soil-900)]/12 bg-[rgba(247,241,231,0.96)] text-[var(--color-soil-900)] shadow-[0_18px_34px_-20px_rgba(35,22,15,0.55)] backdrop-blur transition hover:bg-white"
            >
              <ArrowRight className="size-5" />
            </button>
          </Carousel>
        </div>
      </section>

      <section className="landing-reveal home-feedback-panel rounded-[2rem] px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6">
          <div className="max-w-4xl self-center text-center">
            <p className="font-accent text-[0.72rem] uppercase tracking-[0.22em] text-[var(--color-harvest-600)]">
              Erntepost & Nachricht
            </p>
            <h2 className="mt-3 font-display text-4xl leading-[0.96] tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-[3.3rem]">
              Sag uns, was du{" "}
              <TextLoop
                className="home-word-rotator"
                interval={2.6}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {feedbackOptions.map((option) => (
                  <span key={option} className="home-word-rotator-option">
                    {option}
                  </span>
                ))}
              </TextLoop>
            </h2>
          </div>

          <div className="flex flex-col gap-8">
            {!user ? (
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 border-b border-[var(--color-soil-900)]/8 pb-8">
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="font-accent text-[0.72rem] uppercase tracking-[0.22em] text-[var(--color-harvest-600)]">
                    Konto erstellen
                  </span>
                  <h3 className="font-display text-3xl leading-[0.98] tracking-[-0.03em] text-[var(--color-soil-900)] sm:text-[2.3rem]">
                    Erntepost
                  </h3>
                </div>

                <form onSubmit={handleInlineSignup} className="grid w-full gap-4 lg:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="landing-signup-name">Name</Label>
                    <Input
                      id="landing-signup-name"
                      name="name"
                      autoComplete="name"
                      placeholder="Dein Name"
                      className="h-12 rounded-[1rem] border-[var(--color-soil-900)]/10 bg-white px-4"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="landing-signup-email">E-Mail</Label>
                    <Input
                      id="landing-signup-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="email@beispiel.de"
                      className="h-12 rounded-[1rem] border-[var(--color-soil-900)]/10 bg-white px-4"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="landing-signup-password">Passwort</Label>
                    <Input
                      id="landing-signup-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Mindestens 8 Zeichen"
                      className="h-12 rounded-[1rem] border-[var(--color-soil-900)]/10 bg-white px-4"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="landing-signup-confirm">Passwort wiederholen</Label>
                    <Input
                      id="landing-signup-confirm"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Passwort bestätigen"
                      className="h-12 rounded-[1rem] border-[var(--color-soil-900)]/10 bg-white px-4"
                    />
                  </div>

                  <div className="lg:col-span-2 flex justify-center pt-1">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSigningUp}
                      className="h-12 rounded-full bg-[var(--color-forest-700)] px-6 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-white hover:bg-[var(--color-forest-800)]"
                    >
                      {isSigningUp ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Konto wird erstellt
                        </>
                      ) : (
                        <>
                          Kostenlos anmelden
                          <ArrowRight data-icon="inline-end" />
                        </>
                      )}
                    </Button>
                  </div>

                  {signupError ? (
                    <p className="lg:col-span-2 text-center text-sm text-destructive">{signupError}</p>
                  ) : null}
                  {signupSuccess ? (
                    <p className="lg:col-span-2 text-center text-sm text-[var(--color-forest-800)]">{signupSuccess}</p>
                  ) : null}
                </form>
              </div>
            ) : null}

            <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 text-center">
              {user ? (
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-forest-700)]/14 bg-[var(--color-forest-50)] px-3 py-1.5 text-sm text-[var(--color-forest-800)]">
                  <Mail className="size-4" />
                  Eingeloggt als {user.email}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-[1.2rem] border border-[var(--color-soil-900)]/10 bg-white/80 px-4 py-3 text-sm text-[var(--color-soil-700)]">
                  <MapPin className="size-4 shrink-0 text-[var(--color-harvest-600)]" />
                  Erst anmelden, dann senden.
                </div>
              )}

              <form onSubmit={handleFeedbackSubmit} className="flex w-full flex-col gap-4">
                <Textarea
                  id="feedback-message"
                  rows={7}
                  disabled={!user || isSubmitting}
                  value={feedbackText}
                  onChange={(event) => setFeedbackText(event.target.value)}
                  placeholder="Wonach hältst du Ausschau? Welche Produkte oder Informationen wären für dich besonders interessant?"
                  className="min-h-[12rem] rounded-[1.5rem] border-[var(--color-soil-900)]/10 bg-white px-5 py-4 text-base shadow-none"
                />

                <div className="flex flex-col items-center gap-3">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!user || isSubmitting || !feedbackText.trim()}
                    className="h-12 rounded-full bg-[var(--color-harvest-500)] px-6 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#2b1608] hover:bg-[var(--color-harvest-400)] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Nachricht wird gesendet
                      </>
                    ) : (
                      "Nachricht senden"
                    )}
                  </Button>

                  {submitStatus === "success" ? (
                    <p className="text-sm text-[var(--color-forest-800)]">
                      Danke. Die Nachricht ist angekommen.
                    </p>
                  ) : null}
                  {submitStatus === "error" ? (
                    <p className="text-sm text-destructive">
                      Die Nachricht konnte nicht gesendet werden.
                    </p>
                  ) : null}
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-reveal home-team-panel overflow-hidden rounded-[2rem] px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
          <h2 className="font-display text-4xl leading-[0.94] tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-[3.5rem]">
            Frank & Family.
          </h2>

          <p className="max-w-3xl font-display text-[1.7rem] leading-[1.02] tracking-[-0.035em] text-[var(--color-soil-900)] sm:text-[2.25rem]">
            Ein kleiner Familienbetrieb, auf dem Feld und hinter dem Shop.
          </p>

          <p className="max-w-3xl text-base leading-7 text-[var(--color-soil-700)] sm:text-lg">
            Bald kommen auch <span className="home-team-script">Newsletter</span>,{" "}
            <span className="home-team-script">Blog</span> und{" "}
            <span className="home-team-script">Rezepte</span> dazu.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
