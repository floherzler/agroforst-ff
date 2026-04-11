"use client";

import React, { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Info } from "lucide-react";

import { PageShell } from "@/components/base/page-shell";
import { displayValueLabel } from "@/features/zentrale/admin-domain";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
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
import { listAngebote, listProdukte, subscribeToAngebote, subscribeToProdukte } from "@/lib/appwrite/appwriteProducts";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { InView } from "@/components/motion-primitives/in-view";
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

const homeInfoCards = [
  {
    title: "Über uns",
    text: "Team, Hof und die Idee hinter unserer Arbeit in kurz.",
    href: "/ueber-aff",
    cta: "Mehr erfahren",
  },
  {
    title: "Permdal",
    text: "Was das Statut bedeutet und warum wir es zeigen.",
    href: "/permdal",
    cta: "Zum Statut",
  },
  {
    title: "Feedback",
    text: "Wünsche, Hinweise und neue Ideen. Nur mit bestätigter E-Mail.",
    href: "/feedback",
    cta: "Feedback senden",
  },
];

const galleryImages = [
  {
    src: "/img/herbst.jpeg",
    alt: "Herbstlicher Blick auf den Agroforst",
    label: "Herbst im Agroforst",
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
  {
    src: "/img/hummel-lavendel.JPG",
    alt: "Hummel auf Lavendelblüten im Agroforst",
    label: "Bestäuber im Sommer",
  },
  {
    src: "/img/lupine-feld.jpg",
    alt: "Lupinen am Feldrand des Agroforsts",
    label: "Blüte am Ackerrand",
  },
];

const heroVideoUrl = "/media/garten-1-schwenk-pingpong.mp4";
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

function hasSpecialOfferTag(offer: Angebot) {
  return offer.tags.some((tag) => tag.trim().toLowerCase() === "sonderangebot");
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
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
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
        void playPromise.catch(() => { });
      }
    };

    const ensurePlaying = () => {
      if (!video.paused || video.ended) {
        return;
      }
      const playPromise = video.play();
      if (playPromise) {
        void playPromise.catch(() => { });
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
      .filter(({ offer }) => hasSpecialOfferTag(offer))
      .sort((left, right) => {
        const availabilityCompare =
          getAvailabilityPercentage(left.offer) - getAvailabilityPercentage(right.offer);
        if (availabilityCompare !== 0) {
          return availabilityCompare;
        }

        return (right.offer.year ?? 0) - (left.offer.year ?? 0);
      });
  }, [filteredLiveOffers]);

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
          <div className="flex max-w-3xl flex-col items-center gap-3 lg:max-w-[48rem]">
            <h1 className="text-display-brand text-balance text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.32)] lg:max-w-[11ch]">
              Landwirtschaft mit Weitblick
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/84 drop-shadow-[0_1px_6px_rgba(0,0,0,0.24)] sm:text-lg">
              Aus der Ostprignitz.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button asChild size="lg" variant="secondary" className="home-hero-downcue rounded-full px-6">
              <a href="#sonderangebote">
                Produkte entdecken
                <ArrowDown data-icon="inline-end" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <Card
        id="sonderangebote"
        tone="strong"
        className="home-live-products-panel overflow-hidden rounded-[2rem] scroll-mt-8 sm:scroll-mt-12"
      >
        <CardHeader className="gap-3 border-b border-border/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex max-w-2xl flex-col gap-2">
              <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-display text-[2rem] leading-[0.96] tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-[2.6rem]">
                  Sonderangebote
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
                                {offer.tags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {offer.tags.map((tag) => (
                                      <Badge
                                        key={tag}
                                        variant={tag.trim().toLowerCase() === "sonderangebot" ? "default" : "outline"}
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
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
      <section className="landing-reveal rounded-[2rem] px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="max-w-3xl">
            <h2 className="font-display text-[2.2rem] leading-[0.95] tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-[3rem]">
              Mehr über Hof, Permdal und Feedback
            </h2>
            <p className="mt-3 text-base leading-7 text-[var(--color-soil-700)] sm:text-lg">
              Wenn du tiefer einsteigen willst, sind das die drei kurzen Wege.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {homeInfoCards.map((card) => (
              <Card
                key={card.title}
                className="flex h-full flex-col overflow-hidden rounded-[1.6rem] border-border/70 bg-background/90 shadow-brand-soft"
              >
                <CardHeader className="gap-2">
                  <CardTitle className="text-2xl leading-tight tracking-tight text-foreground">
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pt-0 text-sm leading-7 text-muted-foreground sm:text-base">
                  {card.text}
                </CardContent>
                <CardFooter className="pt-0">
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to={card.href}>
                      {card.cta}
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="home-gallery-shell landing-reveal px-1 py-6 sm:px-2 sm:py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="mt-3 font-display text-[2.7rem] leading-[0.94] tracking-[-0.05em] text-[var(--color-soil-900)] sm:text-[3.6rem]">
                Bilder aus und um den Agroforst
              </h2>
            </div>
          </div>

          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent>
              {galleryImages.map((image) => (
                <CarouselItem key={image.src} className="basis-full">
                  <figure className="home-gallery-frame">
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="home-gallery-image"
                    />
                    <figcaption className="home-gallery-caption">
                      <span className="home-gallery-caption-label">{image.label}</span>
                      <span className="home-gallery-caption-copy">{image.alt}</span>
                    </figcaption>
                  </figure>
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselPrevious
              aria-label="Vorheriges Bild"
              variant="outline"
              size="icon"
              className="home-gallery-nav left-4 top-[44%] !translate-y-0 active:!translate-y-0 sm:left-6"
            />

            <CarouselNext
              aria-label="Nächstes Bild"
              variant="outline"
              size="icon"
              className="home-gallery-nav right-4 top-[44%] !translate-y-0 active:!translate-y-0 sm:right-6"
            />
          </Carousel>
        </div>
      </section>
    </PageShell>
  );
}
