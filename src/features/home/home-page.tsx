"use client";

import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Mail,
  MapPin,
  Quote,
  Sprout,
} from "lucide-react";

import { PageShell } from "@/components/base/page-shell";
import { displayValueLabel } from "@/features/zentrale/admin-domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  getProduktImagePreviewUrl,
  listAngebote,
  listProdukte,
  submitFeedbackMessage,
  subscribeToAngebote,
  subscribeToProdukte,
} from "@/lib/appwrite/appwriteProducts";
import type { CarouselApi } from "@/components/ui/carousel";
import { Label } from "@/components/ui/label";
import { InView } from "@/components/motion-primitives/in-view";
import { TextLoop } from "@/components/motion-primitives/text-loop";
import { YearWheelSection } from "@/features/home/year-wheel-section";

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

const permdalCertificatePdfUrl = encodeURI("/img/statut_Permdal_öko.pdf");
const permdalCertificateImageUrl = encodeURI("/img/statut_Permdal_öko.png");
const monthInitials = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const currentMonthIndex = new Date().getMonth();
const liveProductCategories = ["Alle", "Obst", "Gemuese", "Kraeuter"] as const;
type LiveProductCategory = (typeof liveProductCategories)[number];

function isPerennialProduct(product: Produkt) {
  return product.lebensdauer.trim().toLowerCase().includes("mehr");
}

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

function buildProductInfoText(product: Produkt) {
  if (product.notes?.trim()) {
    return product.notes.trim();
  }

  const category = displayValueLabel(product.unterkategorie || product.hauptkategorie) || "Sortiment";
  const lifespan = displayValueLabel(product.lebensdauer);

  if (product.sorte && lifespan) {
    return `${product.sorte} ist als ${category.toLowerCase()} bei uns ${lifespan.toLowerCase()} eingeplant.`;
  }

  if (product.sorte) {
    return `${product.sorte} ist als ${category.toLowerCase()} Teil unseres saisonalen Sortiments.`;
  }

  if (lifespan) {
    return `${category} aus unserem Hofsortiment, ${lifespan.toLowerCase()} kultiviert.`;
  }

  return `${category} aus unserem aktuellen Hofsortiment.`;
}

function formatOfferPreview(offer: Angebot) {
  const amount = Number.isFinite(offer.mengeVerfuegbar) ? offer.mengeVerfuegbar : offer.menge;
  const price = Number.isFinite(offer.euroPreis)
    ? `${offer.euroPreis.toFixed(2).replace(".", ",")} €`
    : null;
  const unit = offer.einheit || "";
  const year = offer.year ? ` · ${offer.year}` : "";

  return {
    headline: `${amount} ${unit} verfügbar${year}`,
    detail: price ? `${price} / ${unit}` : null,
  };
}

function ProductAvatar({
  imageUrl,
  alt,
}: {
  imageUrl?: string;
  alt: string;
}) {
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    setIsLoaded(false);
  }, [imageUrl]);

  return (
    <Avatar className="size-14 shrink-0 ring-4 ring-background/80">
      {imageUrl ? (
        <>
          {!isLoaded ? <Skeleton className="absolute inset-0 rounded-full" /> : null}
          <AvatarImage
            src={imageUrl}
            alt={alt}
            className={isLoaded ? undefined : "opacity-0"}
            onLoad={() => setIsLoaded(true)}
          />
        </>
      ) : null}
      <AvatarFallback className="bg-background/90 text-[var(--color-forest-700)]">
        <Sprout />
      </AvatarFallback>
    </Avatar>
  );
}

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
  const [liveProducts, setLiveProducts] = React.useState<Produkt[]>([]);
  const [liveOffers, setLiveOffers] = React.useState<Angebot[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);
  const [productsError, setProductsError] = React.useState(false);
  const [liveCategory, setLiveCategory] = React.useState<LiveProductCategory>("Alle");

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

    let unsubscribe = () => {};

    try {
      unsubscribe = subscribeToProdukte(({ type, record }) => {
        setLiveProducts((current) => applyRealtimeProducts(current, { type, record }));
      });
    } catch (error) {
      console.error("Failed to subscribe to live products", error);
    }

    let unsubscribeOffers = () => {};

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

  const filteredLiveProducts = React.useMemo(() => {
    if (liveCategory === "Alle") {
      return liveProducts;
    }

    return liveProducts.filter((product) => product.hauptkategorie === liveCategory);
  }, [liveCategory, liveProducts]);

  const liveOfferProductIds = React.useMemo(
    () => new Set(liveOffers.map((offer) => offer.produktId).filter(Boolean)),
    [liveOffers],
  );

  const liveOffersByProductId = React.useMemo(() => {
    const entries = new Map<string, Angebot[]>();

    for (const offer of liveOffers) {
      if (!offer.produktId || offer.mengeVerfuegbar <= 0) {
        continue;
      }

      const existing = entries.get(offer.produktId) ?? [];
      existing.push(offer);
      entries.set(offer.produktId, existing);
    }

    return entries;
  }, [liveOffers]);

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
            <h1 className="text-display-brand text-balance text-white lg:max-w-[11ch]">
              Prignitzer Permakultur Produkte.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
              Frisch geerntet, direkt angeboten und nah am Hof.
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
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-soil-700)]">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-lilac-500)] opacity-60" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-[var(--color-lilac-600)]" />
                </span>
                Sorgfaltig gepflegt
              </div>
              <CardTitle className="font-display text-[2rem] leading-[0.96] tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-[2.6rem]">
                Aktuelle Produkte im Hofsystem.
              </CardTitle>
              <CardDescription className="text-base leading-7 text-[var(--color-soil-700)]">
                Eine kompakte Auswahl der aktuell gepflegten Produkte, direkt im Überblick.
              </CardDescription>
              <div>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link to="/produkte">
                    Alle Produkte
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <Badge variant="outline" className="w-fit">
                {isLoadingProducts ? "Lädt…" : `${filteredLiveProducts.length} Produkte`}
              </Badge>
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
            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="surface-card flex aspect-square flex-col gap-4 rounded-[1.5rem] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="mt-auto grid grid-cols-12 gap-1">
                    {Array.from({ length: 12 }).map((__, monthIndex) => (
                      <Skeleton key={monthIndex} className="h-7 rounded-md" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : productsError ? (
            <div className="px-5 py-8 text-sm text-muted-foreground sm:px-6">
              Die Live-Produkte konnten gerade nicht geladen werden.
            </div>
          ) : filteredLiveProducts.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted-foreground sm:px-6">
              Für diese Kategorie sind aktuell keine Produkte gepflegt.
            </div>
          ) : (
            <div className="px-5 py-5 sm:px-6">
              <Carousel
                opts={{ align: "start", loop: filteredLiveProducts.length > 3 }}
                className="mx-auto w-full max-w-[78rem] px-12 sm:px-14"
              >
                <CarouselContent>
                  {filteredLiveProducts.map((product) => (
                    <CarouselItem
                      key={product.id}
                      className="basis-[88%] sm:basis-1/2 xl:basis-1/3"
                    >
                      {(() => {
                        const productOffers = liveOffersByProductId.get(product.id) ?? [];
                        const hasLiveOffer = liveOfferProductIds.has(product.id) && productOffers.length > 0;
                        const productImageUrl = product.imageId
                          ? getProduktImagePreviewUrl({ imageId: product.imageId, width: 96, height: 96 })
                          : undefined;
                        const metaParts = [
                          product.unterkategorie ? displayValueLabel(product.unterkategorie) : null,
                          isPerennialProduct(product) ? "mehrjährig" : null,
                        ].filter(Boolean);

                        return (
                          <Card
                            tone="strong"
                            className="flex aspect-square flex-col rounded-[1.6rem] border-border/70"
                          >
                            <CardHeader className="gap-2 pb-2">
                              <div className="flex items-start gap-3">
                                <ProductAvatar imageUrl={productImageUrl} alt={product.name} />
                                <div className="min-w-0 flex-1">
                                  {metaParts.length > 0 ? (
                                    <p className="mb-1 text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
                                      {metaParts.join(" · ")}
                                    </p>
                                  ) : null}
                                  <CardTitle className="line-clamp-2 text-[1.02rem] leading-[1.02] text-foreground">
                                    {product.name}
                                  </CardTitle>
                                  {product.sorte ? (
                                    <CardDescription className="mt-0.5 line-clamp-1 text-[0.8rem] leading-5">
                                      {product.sorte}
                                    </CardDescription>
                                  ) : null}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 text-left">
                              <div className="flex items-start gap-3">
                                <Quote className="mt-0.5 shrink-0 text-[var(--color-soil-500)]" />
                                <p className="line-clamp-4 text-left text-sm leading-6 text-foreground/78 italic">
                                  “{buildProductInfoText(product)}”
                                </p>
                              </div>

                              {hasLiveOffer ? (
                                <div
                                  className="group/offer relative text-[0.72rem] text-muted-foreground"
                                  tabIndex={0}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="relative flex size-2 rounded-full bg-[var(--color-permdal-500)]">
                                      <span className="absolute inset-0 rounded-full bg-[var(--color-permdal-500)]/50 animate-[pulse_2.8s_ease-in-out_infinite]" />
                                    </span>
                                    <span>
                                      {productOffers.length} {productOffers.length === 1 ? "Angebot" : "Angebote"} verfügbar
                                    </span>
                                  </div>
                                  <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-60 rounded-[1rem] border border-border/80 bg-background/96 p-3 opacity-0 shadow-brand-soft backdrop-blur transition duration-200 group-hover/offer:translate-y-0 group-hover/offer:opacity-100 group-focus-within/offer:translate-y-0 group-focus-within/offer:opacity-100 translate-y-1">
                                    <p className="mb-2 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                      Aktuelle Angebote
                                    </p>
                                    <div className="flex flex-col gap-2">
                                      {productOffers.slice(0, 3).map((offer) => {
                                        const preview = formatOfferPreview(offer);
                                        return (
                                          <div key={offer.id} className="rounded-[0.85rem] bg-muted/60 px-2.5 py-2">
                                            <div className="text-[0.72rem] font-medium text-foreground">
                                              {preview.headline}
                                            </div>
                                            {preview.detail ? (
                                              <div className="text-[0.68rem] text-muted-foreground">
                                                {preview.detail}
                                              </div>
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-[0.72rem] text-muted-foreground">
                                  <span className="flex size-2 rounded-full bg-border" />
                                  <span>Noch kein aktuelles Angebot</span>
                                </div>
                              )}

                              <div className="mt-auto rounded-[1.1rem] bg-muted/60 p-2.5">
                                <div className="mb-2 flex items-center gap-2">
                                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                    Saison
                                  </p>
                                </div>
                                <div className="grid grid-cols-12 gap-1">
                                  {monthInitials.map((month, monthIndex) => {
                                    const isActive = product.saisonalitaet.includes(monthIndex + 1);
                                    const isCurrentMonth = monthIndex === currentMonthIndex;
                                    return (
                                      <div
                                        key={`${product.id}-${month}-${monthIndex}`}
                                        className={
                                          isActive
                                            ? "relative flex h-5 items-center justify-center rounded-sm bg-accent text-[0.62rem] font-semibold text-accent-foreground"
                                            : "relative flex h-5 items-center justify-center rounded-sm bg-background text-[0.62rem] font-medium text-muted-foreground"
                                        }
                                        aria-label={isCurrentMonth ? `${month} ist der aktuelle Monat` : undefined}
                                      >
                                        {isCurrentMonth ? (
                                          <span className="absolute inset-[-2px] rounded-md border border-[var(--color-harvest-500)]/80 animate-[pulse_3.6s_ease-in-out_infinite]" />
                                        ) : null}
                                        {month}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })()}
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 bg-background/92 shadow-brand-soft backdrop-blur" />
                <CarouselNext className="right-0 top-1/2 z-10 translate-x-1/2 -translate-y-1/2 bg-background/92 shadow-brand-soft backdrop-blur" />
              </Carousel>
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

      <YearWheelSection />

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
