"use client";

import React, { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Info, Loader2, Mail, MapPin } from "lucide-react";

import { PageShell } from "@/components/base/page-shell";
import { displayValueLabel } from "@/features/zentrale/admin-domain";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  listAngebote,
  listProdukte,
  submitFeedbackMessage,
  subscribeToAngebote,
  subscribeToProdukte,
} from "@/lib/appwrite/appwriteProducts";
import type { CarouselApi } from "@/components/ui/carousel";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { InView } from "@/components/motion-primitives/in-view";
import { TextLoop } from "@/components/motion-primitives/text-loop";
// import { YearWheelSection } from "@/features/home/year-wheel-section";
import {
  formatHarvestRange,
  getOfferDisplayUnitPrice,
  getOfferPriceSummary,
  getProductImageUrl,
} from "@/features/catalog/catalog";

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

const heroVideoUrl = "/media/garten-1-schwenk-pingpong.mp4";

const permdalCertificatePdfUrl = encodeURI("/img/statut_Permdal_öko.pdf");
const permdalCertificateImageUrl = encodeURI("/img/statut_Permdal_öko.png");
const liveProductCategories = ["Alle", "Obst", "Gemuese", "Kraeuter"] as const;
type LiveProductCategory = (typeof liveProductCategories)[number];

function applyRealtimeProducts(
  current: Produkt[],
  change: { type: "create" | "update" | "delete"; record: Produkt },
) {
  if (change.type === "delete") {
    return current.filter((entry) => entry.id !== change.record.id);
  }

  if (change.type === "create") {
    return [...current, change.record].sort((left, right) =>
      left.name.localeCompare(right.name, "de"),
    );
  }

  return current
    .map((entry) => (entry.id === change.record.id ? change.record : entry))
    .sort((left, right) => left.name.localeCompare(right.name, "de"));
}

function applyRealtimeOffers(
  current: Angebot[],
  change: { type: "create" | "update" | "delete"; record: Angebot },
) {
  if (change.type === "delete") {
    return current.filter((entry) => entry.id !== change.record.id);
  }

  if (change.type === "create") {
    return [change.record, ...current.filter((entry) => entry.id !== change.record.id)];
  }

  return current.map((entry) => (entry.id === change.record.id ? change.record : entry));
}

function formatAvailability(offer: Angebot) {
  return `${offer.mengeVerfuegbar} ${offer.einheit}`;
}

function getAvailabilityPercentage(offer: Angebot) {
  if (offer.menge <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (offer.mengeVerfuegbar / offer.menge) * 100));
}

function getAvailabilityIndicatorClass(value: number) {
  if (value <= 25) {
    return "bg-rose-300/80";
  }

  if (value <= 50) {
    return "bg-amber-300/80";
  }

  return "bg-emerald-300/85";
}

function getCompactOfferPriceSummary(offer: Angebot) {
  return getOfferPriceSummary(offer).replace(/^ab\s+/i, "");
}

function HeaderInfo({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={title}
          className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
        >
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" side="top" className="w-64">
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription>{description}</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

export default function HomePage() {
  const { user, createAccount, login } = useAuthStore();
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [liveProducts, setLiveProducts] = React.useState<Produkt[]>([]);
  const [liveOffers, setLiveOffers] = React.useState<Angebot[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);
  const [productsError, setProductsError] = React.useState(false);
  const [liveCategory, setLiveCategory] = React.useState<LiveProductCategory>("Alle");

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) {
      return;
    }

    const restart = () => {
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise) {
        void playPromise.catch(() => {});
      }
    };

    const ensurePlaying = () => {
      if (!video.paused || video.ended) {
        return;
      }
      const playPromise = video.play();
      if (playPromise) {
        void playPromise.catch(() => {});
      }
    };

    video.addEventListener("ended", restart);
    video.addEventListener("canplay", ensurePlaying);

    return () => {
      video.removeEventListener("ended", restart);
      video.removeEventListener("canplay", ensurePlaying);
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadLiveProducts() {
      try {
        setIsLoadingProducts(true);
        setProductsError(false);
        const [products, offers] = await Promise.all([
          listProdukte({ limit: 16 }),
          listAngebote({ limit: 200 }),
        ]);
        if (!cancelled) {
          setLiveProducts(products);
          setLiveOffers(offers);
        }
      } catch (error) {
        console.error("Failed to load live products", error);
        if (!cancelled) {
          setProductsError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProducts(false);
        }
      }
    }

    void loadLiveProducts();

    let unsubscribe = () => { };

    try {
      unsubscribe = subscribeToProdukte(({ type, record }) => {
        setLiveProducts((current) => applyRealtimeProducts(current, { type, record }));
      });
    } catch (error) {
      console.error("Failed to subscribe to live products", error);
    }

    let unsubscribeOffers = () => { };

    try {
      unsubscribeOffers = subscribeToAngebote(({ type, record }) => {
        setLiveOffers((current) => applyRealtimeOffers(current, { type, record }));
      });
    } catch (error) {
      console.error("Failed to subscribe to live offers", error);
    }

    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeOffers();
    };
  }, []);

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

  const liveProductsById = React.useMemo(() => {
    return new Map(liveProducts.map((product) => [product.id, product] as const));
  }, [liveProducts]);

  const filteredLiveOffers = React.useMemo(() => {
    return liveOffers
      .filter((offer) => offer.produktId && offer.mengeVerfuegbar > 0)
      .map((offer) => ({
        offer,
        product: liveProductsById.get(offer.produktId),
      }))
      .filter(({ product }) => {
        if (!product) {
          return liveCategory === "Alle";
        }

        if (liveCategory === "Alle") {
          return true;
        }

        return product.hauptkategorie === liveCategory;
      })
      .sort((left, right) => {
        const productCompare = (left.product?.name || "ZZZ").localeCompare(
          right.product?.name || "ZZZ",
          "de",
        );

        if (productCompare !== 0) {
          return productCompare;
        }

        return (right.offer.year ?? 0) - (left.offer.year ?? 0);
      });
  }, [liveCategory, liveOffers, liveProductsById]);

  const featuredLiveOffers = React.useMemo(() => {
    return [...filteredLiveOffers]
      .sort((left, right) => {
        const availabilityCompare =
          right.offer.mengeVerfuegbar - left.offer.mengeVerfuegbar;
        if (availabilityCompare !== 0) {
          return availabilityCompare;
        }

        const priceCompare =
          getOfferDisplayUnitPrice(left.offer) - getOfferDisplayUnitPrice(right.offer);
        if (priceCompare !== 0) {
          return priceCompare;
        }

        return (right.offer.year ?? 0) - (left.offer.year ?? 0);
      })
      .slice(0, 6);
  }, [filteredLiveOffers]);

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
        className="brand-top-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem]"
      />

      <section className="landing-reveal home-hero relative overflow-hidden rounded-[2rem] px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="home-hero-media" aria-hidden="true">
          <img
            src="/img/herbst.jpeg"
            alt=""
            className="home-hero-image h-full w-full object-cover"
          />
          <video
            ref={heroVideoRef}
            className="home-hero-video h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/img/herbst.jpeg"
          >
            <source src={heroVideoUrl} type="video/mp4" />
          </video>
        </div>

        <div className="relative flex flex-col items-center gap-8 text-center">
          <div className="flex max-w-4xl flex-col items-center gap-5 lg:max-w-[56rem]">
            <h1 className="text-display-brand text-balance text-white lg:max-w-[11ch]">
              Landwirtschaft mit Weitblick
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
              Natürlich ökologisch.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button
              type="button"
              size="lg"
              variant="secondary"
              disabled
              className="home-hero-downcue rounded-full px-6"
            >
              Produkte entdecken
              <ArrowDown data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </section>

      <Card tone="strong" className="home-live-products-panel overflow-hidden rounded-[2rem]">
        <CardHeader className="gap-3 border-b border-border/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex max-w-2xl flex-col gap-2">
              <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-display text-[2rem] leading-[0.96] tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-[2.6rem]">
                  Aktuelle Angebote
                </span>
                <Button asChild size="sm" variant="outline" className="rounded-full w-fit">
                  <Link to="/produkte">
                    Alle ansehen
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </CardTitle>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <Tabs
                value={liveCategory}
                onValueChange={(value) => setLiveCategory(value as LiveProductCategory)}
                className="w-full sm:w-auto"
              >
                <TabsList variant="pill" className="grid w-full grid-cols-4 p-1 sm:w-auto">
                  {liveProductCategories.map((category) => (
                    <TabsTrigger key={category} value={category} className="px-3 text-xs sm:text-sm">
                      {displayValueLabel(category) || category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingProducts ? (
            <div className="px-5 py-5 sm:px-6">
              <div className="grid gap-3 md:hidden">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[1.35rem] border border-border/70 bg-background/80 px-4 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Skeleton className="h-12 rounded-xl" />
                      <Skeleton className="h-12 rounded-xl" />
                    </div>
                    <Skeleton className="mt-4 h-10 w-full rounded-full" />
                  </div>
                ))}
              </div>
              <div className="hidden overflow-hidden rounded-[1.5rem] border border-border/70 md:block">
                <div className="grid gap-0">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1.75fr_1fr_1fr_auto] gap-3 border-b border-border/70 px-4 py-4 last:border-b-0"
                    >
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-9 w-24 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : productsError ? (
            <div className="px-5 py-8 text-sm text-muted-foreground sm:px-6">
              Die Live-Angebote konnten gerade nicht geladen werden.
            </div>
          ) : featuredLiveOffers.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted-foreground sm:px-6">
              Für diese Kategorie sind aktuell keine verfügbaren Angebote gepflegt.
            </div>
          ) : (
            <div className="px-5 py-5 sm:px-6">
              <div className="grid gap-3 md:hidden">
                {featuredLiveOffers.map(({ offer, product }) => {
                  const imageUrl = getProductImageUrl(product?.imageId);
                  const categoryLabel =
                    displayValueLabel(product?.unterkategorie || product?.hauptkategorie || "") ||
                    "Offen";
                  const availabilityPercentage = getAvailabilityPercentage(offer);
                  const availabilityIndicatorClass =
                    getAvailabilityIndicatorClass(availabilityPercentage);

                  return (
                    <article
                      key={offer.id}
                      className="rounded-[1.35rem] border border-border/70 bg-background/85 px-4 py-4"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="size-12 rounded-xl border border-border/60">
                          {imageUrl ? (
                            <AvatarImage
                              src={imageUrl}
                              alt={product?.name || "Produktbild"}
                              className="object-cover"
                            />
                          ) : (
                            <AvatarFallback className="rounded-xl bg-secondary text-primary">
                              {(product?.name || "??").substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-stretch justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Link
                                  to="/angebote/$id"
                                  params={{ id: offer.id }}
                                  className="w-fit truncate text-base font-medium transition hover:text-primary"
                                >
                                  {product?.name || "Unbekanntes Produkt"}
                                </Link>
                                <HeaderInfo title="Kategorie" description={categoryLabel} />
                              </div>
                              {product?.sorte ? (
                                <p className="mt-1 text-sm text-muted-foreground">{product.sorte}</p>
                              ) : null}
                            </div>

                            <div className="flex w-1/2 shrink-0 flex-col justify-between px-1 py-0.5">
                              <p className="text-sm font-medium text-foreground">
                                noch {formatAvailability(offer)}
                              </p>
                              <Progress
                                value={availabilityPercentage}
                                className="gap-0"
                                trackClassName="h-1.5 bg-muted/70"
                                indicatorClassName={availabilityIndicatorClass}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-3">
                        <div className="min-w-0 space-y-2">
                          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            Preis ab
                          </p>
                          <p className="truncate text-sm font-medium text-foreground">
                            {getCompactOfferPriceSummary(offer)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Nächste Ernte: {formatHarvestRange(offer.ernteProjektion)}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline" className="shrink-0 rounded-full">
                          <Link to="/angebote/$id" params={{ id: offer.id }}>
                            Angebot öffnen
                            <ArrowRight data-icon="inline-end" />
                          </Link>
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="hidden overflow-hidden rounded-[1.5rem] border border-border/70 bg-background/80 md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>Produkt</TableHead>
                      <TableHead>Verfügbar</TableHead>
                      <TableHead>
                        <span className="inline-flex items-center gap-1.5">
                          Preis
                          <HeaderInfo
                            title="Preis ab"
                            description='Das "ab" zeigt den günstigsten Preis pro Einheit aus den verfügbaren Teilungen.'
                          />
                        </span>
                      </TableHead>
                      <TableHead>Ernte</TableHead>
                      <TableHead className="text-right">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          Details
                          <HeaderInfo
                            title="Angebot öffnen"
                            description="Auf der Angebotsseite wählst du deine gewünschte Menge als Kombination aus den verfügbaren Paketgrößen und kaufst dort weiter."
                          />
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {featuredLiveOffers.map(({ offer, product }) => {
                      const imageUrl = getProductImageUrl(product?.imageId);
                      const categoryLabel =
                        displayValueLabel(product?.unterkategorie || product?.hauptkategorie || "") ||
                        "Offen";
                      const availabilityPercentage = getAvailabilityPercentage(offer);
                      const availabilityIndicatorClass =
                        getAvailabilityIndicatorClass(availabilityPercentage);

                      return (
                        <TableRow key={offer.id}>
                          <TableCell className="font-medium whitespace-normal">
                            <div className="flex items-center gap-3">
                              <Avatar className="size-11 rounded-xl border border-border/60">
                                {imageUrl ? (
                                  <AvatarImage
                                    src={imageUrl}
                                    alt={product?.name || "Produktbild"}
                                    className="object-cover"
                                  />
                                ) : (
                                  <AvatarFallback className="rounded-xl bg-secondary text-primary">
                                    {(product?.name || "??").substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <Link
                                    to="/angebote/$id"
                                    params={{ id: offer.id }}
                                    className="w-fit transition hover:text-primary"
                                  >
                                    {product?.name || "Unbekanntes Produkt"}
                                  </Link>
                                  <HeaderInfo title="Kategorie" description={categoryLabel} />
                                </div>
                                {product?.sorte ? (
                                  <span className="text-xs text-muted-foreground">{product.sorte}</span>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex min-w-[12rem] max-w-[14rem] flex-col gap-2">
                              <p className="text-sm font-medium text-foreground">
                                noch {formatAvailability(offer)}
                              </p>
                              <Progress
                                value={availabilityPercentage}
                                className="gap-0"
                                trackClassName="h-1.5 bg-muted/70"
                                indicatorClassName={availabilityIndicatorClass}
                              />
                            </div>
                          </TableCell>
                          <TableCell>{getOfferPriceSummary(offer)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatHarvestRange(offer.ernteProjektion)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline" className="rounded-full">
                              <Link to="/angebote/$id" params={{ id: offer.id }}>
                                Angebot öffnen
                                <ArrowRight data-icon="inline-end" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="home-process-shell overflow-hidden rounded-[2rem] px-5 py-3 sm:px-8 sm:py-4">
        {processSteps.map((step, index) => {
          const stepContent = (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-end sm:justify-center sm:gap-4">
                <span className="font-display text-4xl leading-none tracking-[-0.05em] text-[var(--color-harvest-600)] sm:text-5xl">
                  {step.number}
                </span>
                <h2 className="home-process-title max-w-4xl">
                  {step.title}
                </h2>
              </div>
              <p className="home-process-copy max-w-2xl text-base leading-7 sm:text-lg">
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

      <InView
        as="section"
        once
        viewOptions={{ margin: "0px 0px -20% 0px" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        variants={{
          hidden: { opacity: 0, y: 22, scale: 0.96 },
          visible: { opacity: 1, y: 0, scale: 1 },
        }}
        className="home-logo-buffer"
      >
        <div className="home-logo-buffer-mark" aria-hidden="true">
          <img
            src="/img/agroforst_ff_icon_bg.png"
            alt=""
            className="home-logo-buffer-image"
          />
        </div>
      </InView>

      <section className="landing-reveal home-vision-panel relative overflow-hidden rounded-[2.2rem] px-5 py-8 sm:px-8 sm:py-10 lg:-mx-6 lg:px-10 xl:-mx-10 xl:px-12">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10">
          <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-soil-700)]">
              Kreislauf
            </span>
            <h2 className="font-display text-[2.1rem] leading-[0.95] tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-[2.8rem]">
              Gemeinsam wollen wir lokale Landwirtschaft zirkulärer gestalten.
            </h2>
            <p className="max-w-xl text-base leading-7 text-[var(--color-soil-700)] sm:text-lg">
              Der Hof soll nicht nur Produkte liefern, sondern Beziehungen zwischen
              Anbau, Angebot, Mitgliedschaft und Bestellung sichtbar machen. Das
              Schema zeigt, wie diese Teile zusammenhängen.
            </p>
          </div>

          <div className="home-schema-wrap mx-auto w-full max-w-3xl">
            <img
              src="/schema.svg"
              alt="Handgezeichnete Skizze des Kreislaufs zwischen Agroforst, Produkten, Angeboten, Mitgliedschaft und Bestellung"
              className="home-schema-image w-full bg-white object-contain"
            />
          </div>
        </div>
      </section>

      <section className="landing-reveal home-vision-panel relative overflow-hidden rounded-[2.2rem] px-5 py-8 sm:px-8 sm:py-10 lg:-mx-6 lg:px-10 xl:-mx-10 xl:px-12">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <div className="flex max-w-3xl flex-col items-center gap-3 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-soil-700)]">
              Grundlagen
            </span>
            <h2 className="font-display text-[2.2rem] leading-[0.94] tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-[3rem]">
              Was ist ein Agroforst?
            </h2>
            <p className="max-w-2xl text-base leading-7 text-[var(--color-soil-700)] sm:text-lg">
              Ein Agroforst verbindet Ackerbau, Gartenbau oder Tierhaltung mit Bäumen
              und Sträuchern auf derselben Fläche. Statt alles strikt zu trennen,
              arbeiten verschiedene Pflanzenebenen zusammen.
            </p>
          </div>

          <div className="rounded-[1.8rem] border border-[var(--color-soil-900)]/10 bg-white/70 p-6 backdrop-blur-sm sm:p-7">
            <div className="flex flex-col items-center gap-6 text-center">
              <article>
                <h3 className="font-display text-[1.55rem] leading-[0.98] tracking-[-0.03em] text-[var(--color-soil-900)]">
                  Bäume, Sträucher und Kulturen zusammen denken
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--color-soil-700)] sm:text-base">
                  In einem Agroforst stehen Gehölze nicht nur am Rand, sondern werden
                  bewusst in die landwirtschaftliche Fläche integriert. Zwischen oder
                  unter ihnen wachsen weitere Kulturen, die davon profitieren können.
                </p>
              </article>

              <article>
                <h3 className="font-display text-[1.55rem] leading-[0.98] tracking-[-0.03em] text-[var(--color-soil-900)]">
                  Ein System mit mehreren Ebenen
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--color-soil-700)] sm:text-base">
                  Unterschiedliche Wuchshöhen und Wurzeltiefen nutzen Licht, Wasser
                  und Boden auf verschiedene Weise. Dadurch entsteht mehr Vielfalt
                  und oft auch mehr Stabilität im Jahresverlauf.
                </p>
              </article>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-[var(--color-soil-900)]/10 bg-[var(--color-sand-100)]/85 p-5 sm:p-6">
            <div className="text-center">
              <h3 className="font-display text-[1.7rem] leading-[0.98] tracking-[-0.03em] text-[var(--color-soil-900)]">
                Warum Agroforst sinnvoll ist
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--color-soil-700)] sm:text-base">
                Agroforst kann Wind abbremsen, Wasser besser in der Fläche halten und
                Lebensräume für Insekten, Vögel und Bodenleben schaffen. Gleichzeitig
                bleibt die Fläche produktiv und entwickelt sich über Jahre zu einem
                widerstandsfähigeren Anbausystem.
              </p>
            </div>

            <Accordion
              type="multiple"
              className="mx-auto mt-6 w-full max-w-xl px-2 sm:px-4"
            >
              <AccordionItem
                value="mikroklima"
                className="border-b border-[var(--color-soil-900)]/10"
              >
                <AccordionTrigger className="py-4 text-left text-base font-medium text-[var(--color-soil-900)] hover:no-underline">
                  Mikroklima und Schutz
                </AccordionTrigger>
                <AccordionContent className="text-left text-sm leading-6 text-[var(--color-soil-700)] sm:text-base">
                  Gehölze schaffen Windschutz, Schatten und ein ausgeglicheneres
                  Mikroklima. Das kann Pflanzen und Boden in heißen oder trockenen
                  Phasen entlasten.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="boden"
                className="border-b border-[var(--color-soil-900)]/10"
              >
                <AccordionTrigger className="py-4 text-left text-base font-medium text-[var(--color-soil-900)] hover:no-underline">
                  Boden und Wasser
                </AccordionTrigger>
                <AccordionContent className="text-left text-sm leading-6 text-[var(--color-soil-700)] sm:text-base">
                  Wurzeln helfen, den Boden zu stabilisieren, Humus aufzubauen und
                  Wasser länger in der Fläche zu halten. So wird das System robuster.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="vielfalt"
                className="border-b border-[var(--color-soil-900)]/10"
              >
                <AccordionTrigger className="py-4 text-left text-base font-medium text-[var(--color-soil-900)] hover:no-underline">
                  Vielfalt statt Monokultur
                </AccordionTrigger>
                <AccordionContent className="text-left text-sm leading-6 text-[var(--color-soil-700)] sm:text-base">
                  Verschiedene Arten auf einer Fläche fördern Biodiversität und
                  machen die Bewirtschaftung langfristiger planbar. Mit jeder Saison
                  wird das System lesbarer und oft widerstandsfähiger.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* <YearWheelSection /> */}

      <section className="landing-reveal home-promise-panel px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
        <div className="home-promise-shell flex flex-col items-center gap-6 text-center">
          <h2 className="max-w-4xl font-display text-[2.3rem] leading-[0.94] tracking-[-0.05em] text-[var(--color-soil-900)] sm:text-[3rem] lg:text-[3.8rem]">
            Was zwischen Hof und Gemeinschaft wachsen soll.
          </h2>

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

      <InView
        as="section"
        once
        viewOptions={{ margin: "0px 0px -20% 0px" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        variants={{
          hidden: { opacity: 0, y: 22, scale: 0.96 },
          visible: { opacity: 1, y: 0, scale: 1 },
        }}
        className="home-logo-buffer"
      >
        <div className="home-logo-buffer-mark" aria-hidden="true">
          <img
            src="/img/agroforst_ff_icon_bg.png"
            alt=""
            className="home-logo-buffer-image"
          />
        </div>
      </InView>

      <section className="home-gallery-shell landing-reveal overflow-hidden rounded-[2rem] px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6">
          <div className="max-w-4xl self-center px-1 text-center">
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
                  <figure className="mx-auto flex max-w-5xl flex-col gap-4">
                    <div className="overflow-hidden rounded-[1.8rem] bg-[var(--color-surface-plain)]/70">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="h-[18rem] w-full object-cover sm:h-[23rem] lg:h-[28rem]"
                      />
                    </div>
                    <figcaption className="flex flex-col items-center justify-center gap-2 px-2 text-center">
                      <span className="text-sm font-medium text-[var(--color-soil-700)] sm:text-base">
                        {image.label}
                      </span>
                      <span className="font-accent text-[0.72rem] uppercase tracking-[0.22em] text-[var(--color-soil-500)]">
                        {currentSlide + 1} / {galleryImages.length}
                      </span>
                    </figcaption>
                  </figure>
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselPrevious
              aria-label="Vorheriges Bild"
              variant="outline"
              size="icon"
              className="left-4 top-[46%] z-20 size-12 -translate-y-1/2 rounded-full border-0 bg-[rgba(247,241,231,0.92)] text-[var(--color-soil-900)] shadow-[0_18px_34px_-20px_rgba(35,22,15,0.45)] backdrop-blur transition hover:bg-white disabled:opacity-40"
            />

            <CarouselNext
              aria-label="Nächstes Bild"
              variant="outline"
              size="icon"
              className="right-4 top-[46%] z-20 size-12 -translate-y-1/2 rounded-full border-0 bg-[rgba(247,241,231,0.92)] text-[var(--color-soil-900)] shadow-[0_18px_34px_-20px_rgba(35,22,15,0.45)] backdrop-blur transition hover:bg-white disabled:opacity-40"
            />
          </Carousel>
        </div>
      </section>

      <section className="landing-reveal home-feedback-panel rounded-[2rem] px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6">
          <div className="max-w-4xl self-center text-center">
            <h2 className="mt-3 flex flex-col items-center gap-2 font-display text-4xl leading-[0.96] tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-[3.3rem]">
              <span>
                Sag uns, was <span className="text-[var(--color-harvest-600)]">du</span>
              </span>
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
                      className="h-12 rounded-full bg-primary px-6 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-primary-foreground hover:bg-primary/90"
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
                  <MapPin className="size-4 shrink-0 text-[var(--color-lilac-700)]" />
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
                  className="min-h-[12rem] rounded-[1.5rem] border-[var(--color-soil-900)]/10 bg-white px-5 py-4 text-base shadow-none placeholder:text-center"
                />

                <div className="flex flex-col items-center gap-3">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!user || isSubmitting || !feedbackText.trim()}
                    className="h-12 rounded-full bg-[var(--color-lilac-400)] px-6 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-earth-700)] hover:bg-[var(--color-lilac-300)] disabled:opacity-50"
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

      <InView
        as="section"
        once
        viewOptions={{ margin: "0px 0px -20% 0px" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        variants={{
          hidden: { opacity: 0, y: 22, scale: 0.96 },
          visible: { opacity: 1, y: 0, scale: 1 },
        }}
        className="home-logo-buffer"
      >
        <div className="home-logo-buffer-mark" aria-hidden="true">
          <img
            src="/img/agroforst_ff_icon_bg.png"
            alt=""
            className="home-logo-buffer-image"
          />
        </div>
      </InView>

      <section className="landing-reveal home-team-panel overflow-hidden rounded-[2rem] px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
          <h2 className="font-display text-4xl leading-[0.94] tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-[3.5rem]">
            Frank & Family
          </h2>

          <p className="max-w-3xl font-display text-[1.7rem] leading-[1.02] tracking-[-0.035em] text-[var(--color-soil-900)] sm:text-[2.25rem]">
            Familienbetrieb auf dem Feld und im Shop.
          </p>

          <p className="max-w-3xl text-base leading-7 text-[var(--color-soil-700)] sm:text-lg">
            Bald kommen auch <span className="home-team-script">Biete/Suche</span> und{" "}
            <span className="home-team-script">Blog</span> dazu!
          </p>
        </div>
      </section>

      <InView
        as="section"
        once
        viewOptions={{ margin: "0px 0px -12% 0px" }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        variants={{
          hidden: { opacity: 0, y: 42, filter: "blur(10px)" },
          visible: { opacity: 1, y: 0, filter: "blur(0px)" },
        }}
        className="home-permdal-panel overflow-hidden rounded-[2rem] px-5 py-8 sm:px-8 sm:py-10"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-[var(--color-soil-900)]/10 bg-white/72 px-3 py-2 shadow-[0_16px_34px_-24px_rgba(35,22,15,0.28)]">
              <img
                src="/img/permdal-logo.png"
                alt="Permdal"
                className="h-7 w-auto object-contain"
              />
            </div>
            <h2 className="max-w-3xl font-display text-[2.4rem] leading-[0.94] tracking-[-0.05em] text-[var(--color-soil-900)] sm:text-[3.2rem]">
              Permdal-Produkte sind unsere Philosophie des Wachsens.
            </h2>
            <p className="max-w-2xl text-base leading-7 text-[var(--color-soil-700)] sm:text-lg">
              Für uns bedeutet Permdal nicht nur ein Zertifikat, sondern eine klare
              Haltung: vielfältig anbauen, langfristig Boden aufbauen und Produkte so
              wachsen lassen, dass Hof, Landschaft und Gemeinschaft zusammen stärker
              werden.
            </p>
            <p className="max-w-2xl text-base leading-7 text-[var(--color-soil-700)] sm:text-lg">
              Das Statut beschreibt genau diesen Rahmen. Wer verstehen will, wie wir
              unsere Produkte denken, findet darin die Grundlage unserer Arbeit.
            </p>
          </div>

          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4">
            <img
              src={permdalCertificateImageUrl}
              alt="Permdal-Statut"
              className="home-permdal-certificate-image"
            />

            <a
              href={permdalCertificatePdfUrl}
              target="_blank"
              rel="noreferrer"
              className="font-accent text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-harvest-600)] underline underline-offset-4"
            >
              PDF separat öffnen
            </a>
          </div>
        </div>
      </InView>
    </PageShell>
  );
}
