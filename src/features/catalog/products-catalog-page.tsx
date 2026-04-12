"use client";

import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowRightLeft,
  Filter,
  Mail,
  PackageSearch,
  Search as SearchIcon,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyState,
  PageHeader,
  PageShell,
  SurfaceSection,
} from "@/components/base/page-shell";
import {
  formatHarvestRange,
  getOfferDisplayUnitPrice,
  getOfferPriceSummary,
  getProductImageUrl,
} from "@/features/catalog/catalog";
import { unifiedCardSurfaceStyle } from "@/lib/card-surface";
import { displayValueLabel } from "@/features/zentrale/admin-domain";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  listAlleProdukte,
  listAngebote,
  subscribeToAngebote,
  subscribeToProdukte,
} from "@/lib/appwrite/appwriteProducts";
import { cn } from "@/lib/utils";

type ViewMode = "angebote" | "produkte";

type CatalogOfferRow = {
  id: string;
  product: Produkt;
  offer: Angebot;
  offerCount: number;
};

const CONTACT_EMAIL = "team@agroforst-ff.de";
const SPECIAL_OFFER_TAG = "sonderangebot";

export default function ProductsCatalogPage() {
  const [products, setProducts] = useState<Produkt[]>([]);
  const [offers, setOffers] = useState<Angebot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("angebote");
  const [selectedTag, setSelectedTag] = useState<string>("alle");
  const debouncedSearch = useDebouncedValue(search, 250);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setLoading(true);
      setLoadError(null);

      try {
        const [productsResponse, offersResponse] = await Promise.all([
          listAlleProdukte(),
          listAngebote({ limit: 500 }),
        ]);

        if (!cancelled) {
          setProducts(productsResponse);
          setOffers(offersResponse);
        }
      } catch (error) {
        console.error("Error loading product catalog", error);
        if (!cancelled) {
          setLoadError("Produkte und Angebote konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let unsubscribeProducts = () => {};
    let unsubscribeOffers = () => {};

    try {
      unsubscribeProducts = subscribeToProdukte(({ type, record }) => {
        setProducts((current) => applyRealtimeRecord(current, type, record));
      });
      unsubscribeOffers = subscribeToAngebote(({ type, record }) => {
        setOffers((current) => applyRealtimeRecord(current, type, record));
      });
    } catch (error) {
      console.error("Failed to subscribe to product realtime updates", error);
    }

    return () => {
      unsubscribeProducts();
      unsubscribeOffers();
    };
  }, []);

  useEffect(() => {
    if (viewMode === "produkte") {
      setSelectedTag("alle");
    }
  }, [viewMode]);

  const offerCountByProduct = useMemo(() => {
    return offers.reduce<Record<string, number>>((result, offer) => {
      if (!offer.produktId) {
        return result;
      }

      result[offer.produktId] = (result[offer.produktId] ?? 0) + 1;
      return result;
    }, {});
  }, [offers]);

  const availableTags = useMemo(
    () =>
      Array.from(
        new Set(offers.flatMap((offer) => offer.tags.map((tag) => tag.trim()).filter(Boolean))),
      ).sort((left, right) => left.localeCompare(right, "de")),
    [offers],
  );

  const offerRows = useMemo(() => {
    const productsById = new Map(products.map((product) => [product.id, product] as const));

    return offers
      .map((offer) => {
        const product = productsById.get(offer.produktId);
        if (!product) {
          return null;
        }

        return {
          id: offer.id,
          product,
          offer,
          offerCount: offerCountByProduct[product.id] ?? 0,
        } satisfies CatalogOfferRow;
      })
      .filter((row): row is CatalogOfferRow => row !== null)
      .sort((left, right) => {
        const urgentCompare =
          Number(
            right.offer.tags.some((tag) => isSpecialOfferTag(tag)),
          ) - Number(left.offer.tags.some((tag) => isSpecialOfferTag(tag)));
        if (urgentCompare !== 0) {
          return urgentCompare;
        }

        const availabilityCompare = right.offer.mengeVerfuegbar - left.offer.mengeVerfuegbar;
        if (availabilityCompare !== 0) {
          return availabilityCompare;
        }

        const priceCompare = getOfferDisplayUnitPrice(left.offer) - getOfferDisplayUnitPrice(right.offer);
        if (priceCompare !== 0) {
          return priceCompare;
        }

        const nameCompare = left.product.name.localeCompare(right.product.name, "de");
        if (nameCompare !== 0) {
          return nameCompare;
        }

        return (right.offer.year ?? 0) - (left.offer.year ?? 0);
      });
  }, [offerCountByProduct, offers, products]);

  const productRows = useMemo(() => {
    return products
      .map((product) => ({
        id: product.id,
        product,
        offerCount: offerCountByProduct[product.id] ?? 0,
      }))
      .sort((left, right) => {
        const countCompare = right.offerCount - left.offerCount;
        if (countCompare !== 0) {
          return countCompare;
        }

        const categoryCompare = displayValueLabel(left.product.hauptkategorie).localeCompare(
          displayValueLabel(right.product.hauptkategorie),
          "de",
        );
        if (categoryCompare !== 0) {
          return categoryCompare;
        }

        return left.product.name.localeCompare(right.product.name, "de");
      });
  }, [offerCountByProduct, products]);

  const visibleOfferRows = useMemo(() => {
    const searchValue = debouncedSearch.trim().toLowerCase();

    return offerRows.filter((row) => {
      if (selectedTag !== "alle") {
        const tagMatch = row.offer.tags.some(
          (tag) => tag.trim().toLowerCase() === selectedTag.toLowerCase(),
        );
        if (!tagMatch) {
          return false;
        }
      }

      if (!searchValue) {
        return true;
      }

      return [
        row.product.name,
        row.product.hauptkategorie,
        row.product.unterkategorie ?? "",
        row.offer.beschreibung ?? "",
        row.offer.einheit,
        String(row.offer.mengeVerfuegbar),
        getOfferPriceSummary(row.offer),
        row.offer.tags.join(" "),
        row.offer.year ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchValue);
    });
  }, [debouncedSearch, offerRows, selectedTag]);

  const visibleProductRows = useMemo(() => {
    const searchValue = debouncedSearch.trim().toLowerCase();

    return productRows.filter((row) => {
      if (!searchValue) {
        return true;
      }

      return [
        row.product.name,
        row.product.hauptkategorie,
        row.product.unterkategorie ?? "",
        row.product.saisonalitaet.join(" "),
        String(row.offerCount),
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchValue);
    });
  }, [debouncedSearch, productRows]);

  const activeOfferCount = offerRows.filter((row) => row.offer.mengeVerfuegbar > 0).length;
  const specialOfferCount = offerRows.filter((row) =>
    row.offer.tags.some((tag) => isSpecialOfferTag(tag)),
  ).length;
  const productsWithOffersCount = productRows.filter((row) => row.offerCount > 0).length;
  const productsWithoutOffersCount = productRows.length - productsWithOffersCount;

  return (
    <PageShell>
      <PageHeader
        title="Produkte"
        description="Aktive Angebote und gesamter Bestand in einer Ansicht. Wechsel zwischen Angebot und Produkt, suche direkt und filter nach Schlagworten."
      />

      <SurfaceSection
        className={cn(
          "border-border/70 p-4 sm:p-5",
          viewMode === "angebote" ? "bg-muted/20" : "bg-primary/5",
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)]">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {viewMode === "angebote" ? (
                  <>
                    <Badge variant="secondary">{loading ? "Lädt..." : `${visibleOfferRows.length}/${offerRows.length} Angebote`}</Badge>
                    <Badge variant="outline">{loading ? "Abgleich läuft" : `${activeOfferCount} verfügbar`}</Badge>
                    <Badge variant="outline">{loading ? "Abgleich läuft" : `${specialOfferCount} Sonderangebote`}</Badge>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary">{loading ? "Lädt..." : `${visibleProductRows.length}/${productRows.length} Produkte`}</Badge>
                    <Badge variant="outline">{loading ? "Abgleich läuft" : `${productsWithOffersCount} mit Angebot`}</Badge>
                    <Badge variant="outline">{loading ? "Abgleich läuft" : `${productsWithoutOffersCount} ohne Angebot`}</Badge>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Tabs
                value={viewMode}
                onValueChange={(value) => setViewMode(value as ViewMode)}
                className="w-full"
              >
                <TabsList variant="pill" className="grid w-full grid-cols-2">
                  <TabsTrigger value="angebote" className="gap-2">
                    <ArrowRightLeft />
                    Angebote
                  </TabsTrigger>
                  <TabsTrigger value="produkte" className="gap-2">
                    <PackageSearch />
                    Produkte
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    viewMode === "angebote"
                      ? "Angebot, Menge, Tag, Hinweis"
                      : "Produkt, Sorte, Kategorie, Saison"
                  }
                  aria-label={
                    viewMode === "angebote"
                      ? "Angebote durchsuchen"
                      : "Produkte durchsuchen"
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {viewMode === "angebote" ? (
              <>
                <div className="flex items-center gap-2 md:hidden">
                  <Badge variant="outline" className="shrink-0">
                    <Filter />
                    Schlagworte
                  </Badge>
                  <Select
                    value={selectedTag}
                    onValueChange={(value) => setSelectedTag(value ?? "alle")}
                  >
                    <SelectTrigger className="min-w-0 flex-1">
                      <SelectValue placeholder="Schlagwort wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="alle">Alle Schlagworte</SelectItem>
                        {availableTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="hidden w-full md:block">
                  <div className="flex w-max items-center gap-2 pb-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTag("alle")}
                      className={cn(
                        "rounded-full border px-3 py-2 text-sm transition",
                        selectedTag === "alle"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 bg-background hover:bg-muted",
                      )}
                    >
                      Alle Schlagworte
                    </button>
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTag(tag)}
                        className={cn(
                          "rounded-full border px-3 py-2 text-sm transition",
                          selectedTag === tag
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/70 bg-background hover:bg-muted",
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Kontakt über Footer-Mail</Badge>
                <Button asChild variant="outline" size="sm">
                  <a href={`mailto:${CONTACT_EMAIL}`}>
                    <Mail data-icon="inline-start" />
                    Anfragen per Mail
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </SurfaceSection>

      {loading && offerRows.length === 0 && productRows.length === 0 ? (
        viewMode === "angebote" ? (
          <>
            <div className="grid gap-4 lg:hidden">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-64 rounded-[1.75rem]" />
              ))}
            </div>
            <div className="hidden lg:block">
              <CatalogTableSkeleton />
            </div>
          </>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-72 rounded-[1.75rem]" />
            ))}
          </div>
        )
      ) : loadError ? (
        <EmptyState
          title="Produktseite momentan nicht erreichbar"
          description={loadError}
        />
      ) : viewMode === "angebote" ? (
        visibleOfferRows.length === 0 ? (
          <EmptyState
            title="Keine Treffer"
            description="Passe Suche oder Schlagworte an, um passende Angebote wieder einzublenden."
          />
        ) : (
          <>
            <div className="grid gap-4 lg:hidden">
              {visibleOfferRows.map((row) => (
                <OfferCard key={row.id} row={row} />
              ))}
            </div>

            <SurfaceSection className="overflow-hidden hidden lg:block">
              <Table className="min-w-[1040px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Produkt</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Verfügbar</TableHead>
                    <TableHead>Preis</TableHead>
                    <TableHead>Ernte</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleOfferRows.map((row) => {
                    const imageUrl = getProductImageUrl(row.product.imageId);
                    const productLabel = buildProductLabel(row.product);

                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Badge variant={row.offer.mengeVerfuegbar > 0 ? "secondary" : "outline"}>
                            {row.offer.mengeVerfuegbar > 0 ? "Angebot" : "Ausverkauft"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-12 rounded-xl border border-border/60">
                              {imageUrl ? (
                                <AvatarImage
                                  src={imageUrl}
                                  alt={productLabel}
                                  className="object-cover"
                                />
                              ) : (
                                <AvatarFallback className="rounded-xl bg-muted text-muted-foreground">
                                  <PackageSearch className="size-4" />
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex flex-col gap-1">
                              <span>{productLabel}</span>
                              <span className="text-xs text-muted-foreground">
                                {row.offerCount === 1
                                  ? "1 laufendes Angebot"
                                  : `${row.offerCount} laufende Angebote`}
                              </span>
                              {row.offer.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {row.offer.tags.map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant={isSpecialOfferTag(tag) ? "default" : "outline"}
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div>{displayValueLabel(row.product.hauptkategorie)}</div>
                          <div className="text-xs">
                            {displayValueLabel(row.product.unterkategorie) || "–"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.offer.mengeVerfuegbar} {row.offer.einheit}
                        </TableCell>
                        <TableCell>{getOfferPriceSummary(row.offer)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatHarvestRange(row.offer.ernteProjektion)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link to="/angebote/$id" params={{ id: row.offer.id }}>
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
            </SurfaceSection>
          </>
        )
      ) : visibleProductRows.length === 0 ? (
        <EmptyState
          title="Keine Produkte gefunden"
          description="Passe Suche an oder wechsel zurück zu Angeboten, wenn du direkt verfügbare Einträge suchst."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleProductRows.map((row) => {
            const imageUrl = getProductImageUrl(row.product.imageId);
            const productLabel = buildProductLabel(row.product);
            const hasOffers = row.offerCount > 0;

            return (
              <Card
                key={row.id}
                tone="plain"
                style={unifiedCardSurfaceStyle}
                className={cn(
                  "border-permdal-200/70 shadow-brand-soft",
                  hasOffers ? "ring-1 ring-inset ring-permdal-200/70" : "ring-1 ring-inset ring-border/40",
                )}
              >
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-2">
                      <Badge variant={hasOffers ? "secondary" : "outline"}>
                        {hasOffers ? `${row.offerCount} Angebote` : "Ohne Angebot"}
                      </Badge>
                      <CardTitle className="text-xl">{productLabel}</CardTitle>
                    </div>
                    <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
                      <PackageSearch className="size-5" />
                    </div>
                  </div>
                  <CardDescription>
                    {displayValueLabel(row.product.hauptkategorie)}
                    {row.product.unterkategorie
                      ? ` · ${displayValueLabel(row.product.unterkategorie)}`
                      : ""}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-12 rounded-xl border border-border/60">
                      {imageUrl ? (
                        <AvatarImage
                          src={imageUrl}
                          alt={productLabel}
                          className="object-cover"
                        />
                      ) : (
                        <AvatarFallback className="rounded-xl bg-muted text-muted-foreground">
                          <PackageSearch className="size-4" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-foreground">
                        {hasOffers ? "Aktiv im Sortiment" : "Noch kein Angebot"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {hasOffers
                          ? `Produkt hat ${row.offerCount} laufende Angebote`
                          : "Produkt zeigt Lücke im Bestand"}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-muted-foreground">
                    {row.product.saisonalitaet.length > 0 ? (
                      <>
                        Saison:{" "}
                        {renderSeasonMonths(row.product.saisonalitaet)}
                      </>
                    ) : (
                      "Keine Saisonangabe hinterlegt."
                    )}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={hasOffers ? "secondary" : "outline"}>
                      {hasOffers ? "Angebote vorhanden" : "Per Mail anfragen"}
                    </Badge>
                    {hasOffers ? <Badge variant="outline">{row.offerCount} laufende Angebote</Badge> : null}
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2 px-6 pb-6">
                  {hasOffers ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setViewMode("angebote")}
                    >
                      Zu Angeboten wechseln
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full">
                      <a href={`mailto:${CONTACT_EMAIL}`}>
                        <Mail data-icon="inline-start" />
                        Anfragen per Mail
                      </a>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function OfferCard({ row }: { row: CatalogOfferRow }) {
  const imageUrl = getProductImageUrl(row.product.imageId);
  const productLabel = buildProductLabel(row.product);
  const offerAvailable = row.offer.mengeVerfuegbar > 0;

  return (
    <Card
      tone="plain"
      style={unifiedCardSurfaceStyle}
      className="border-permdal-200/70 shadow-brand-soft"
    >
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Badge variant={offerAvailable ? "secondary" : "outline"}>
              {offerAvailable ? "Verfügbar" : "Ausverkauft"}
            </Badge>
            <CardTitle className="text-xl">{productLabel}</CardTitle>
          </div>
          <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
            <ArrowRightLeft className="size-5" />
          </div>
        </div>
        <CardDescription>
          {displayValueLabel(row.product.hauptkategorie)}
          {row.product.unterkategorie
            ? ` · ${displayValueLabel(row.product.unterkategorie)}`
            : ""}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 rounded-xl border border-border/60">
              {imageUrl ? (
                <AvatarImage src={imageUrl} alt={productLabel} className="object-cover" />
              ) : (
              <AvatarFallback className="rounded-xl bg-muted text-muted-foreground">
                <PackageSearch className="size-4" />
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              {row.offerCount === 1
                ? "1 laufendes Angebot"
                : `${row.offerCount} laufende Angebote`}
            </span>
            <span className="text-sm text-muted-foreground">
              {row.offer.beschreibung?.trim() || "Ohne zusätzlichen Hinweis"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Verfügbar
            </div>
            <div className="mt-1 text-base font-semibold">
              {row.offer.mengeVerfuegbar} {row.offer.einheit}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Preis
            </div>
            <div className="mt-1 text-base font-semibold">
              {getOfferPriceSummary(row.offer)}
            </div>
          </div>
        </div>

        <p className="text-sm leading-6 text-muted-foreground">
          {formatHarvestRange(row.offer.ernteProjektion)}
        </p>

        {row.offer.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {row.offer.tags.map((tag) => (
              <Badge key={tag} variant={isSpecialOfferTag(tag) ? "default" : "outline"}>
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="px-6 pb-6">
        <Button asChild className="w-full">
          <Link to="/angebote/$id" params={{ id: row.offer.id }}>
            Angebot öffnen
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function CatalogTableSkeleton() {
  return (
    <SurfaceSection className="overflow-hidden">
      <div className="grid gap-0">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[0.8fr_1.6fr_1.2fr_1fr_1fr_1fr_auto] gap-3 border-b border-border/70 px-4 py-4 last:border-b-0"
          >
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        ))}
      </div>
    </SurfaceSection>
  );
}

function applyRealtimeRecord<T extends { id: string }>(
  current: T[],
  type: "create" | "update" | "delete",
  record: T,
) {
  if (type === "delete") {
    return current.filter((entry) => entry.id !== record.id);
  }

  if (type === "create") {
    return [record, ...current.filter((entry) => entry.id !== record.id)];
  }

  return current.map((entry) => (entry.id === record.id ? record : entry));
}

function buildProductLabel(product: Produkt) {
  return product.name;
}

function isSpecialOfferTag(tag: string) {
  return tag.trim().toLowerCase() === SPECIAL_OFFER_TAG;
}

function renderSeasonMonths(months: number[]) {
  const sortedMonths = months
    .filter((month) => month >= 1 && month <= 12)
    .sort((left, right) => left - right);

  if (sortedMonths.length === 0) {
    return null;
  }

  const ranges: Array<[number, number]> = [];
  let rangeStart = sortedMonths[0]!;
  let rangeEnd = sortedMonths[0]!;

  for (let index = 1; index < sortedMonths.length; index += 1) {
    const month = sortedMonths[index]!;
    if (month === rangeEnd + 1) {
      rangeEnd = month;
      continue;
    }

    ranges.push([rangeStart, rangeEnd]);
    rangeStart = month;
    rangeEnd = month;
  }

  ranges.push([rangeStart, rangeEnd]);

  return (
    <span className="inline-flex flex-wrap gap-x-1">
      {ranges.map(([start, end], index) => {
        const startAbbrev = monthLabels[start - 1]?.abbrev ?? String(start);
        const endAbbrev = monthLabels[end - 1]?.abbrev ?? String(end);
        const startFull = monthLabels[start - 1]?.full ?? String(start);
        const endFull = monthLabels[end - 1]?.full ?? String(end);
        const separator = index < ranges.length - 1 ? ", " : "";

        return (
          <Fragment key={`${start}-${end}`}>
            <span className="sm:hidden">
              {start === end ? startAbbrev : `${startAbbrev}–${endAbbrev}`}
            </span>
            <span className="hidden sm:inline">
              {start === end ? startFull : `${startFull}–${endFull}`}
            </span>
            {separator}
          </Fragment>
        );
      })}
    </span>
  );
}

const monthLabels = [
  { abbrev: "Jan", full: "Januar" },
  { abbrev: "Feb", full: "Februar" },
  { abbrev: "Mär", full: "März" },
  { abbrev: "Apr", full: "April" },
  { abbrev: "Mai", full: "Mai" },
  { abbrev: "Jun", full: "Juni" },
  { abbrev: "Jul", full: "Juli" },
  { abbrev: "Aug", full: "August" },
  { abbrev: "Sep", full: "September" },
  { abbrev: "Okt", full: "Oktober" },
  { abbrev: "Nov", full: "November" },
  { abbrev: "Dez", full: "Dezember" },
];
