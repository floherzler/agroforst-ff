"use client";

import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  Euro,
  Filter,
  Package,
  Search as SearchIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  PageHeader,
  PageShell,
  SurfaceSection,
} from "@/components/base/page-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/auth-store";
import { displayValueLabel } from "@/features/zentrale/admin-domain";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  catalogCategories,
  composeMarketplaceOffers,
  filterMarketplaceOffers,
  formatHarvestRange,
  getOfferAvailabilityBadgeVariant,
  getOfferAvailabilityText,
  getOfferPriceSummary,
  getProductImageUrl,
  listMarketplaceSnapshot,
  type CatalogCategory,
  type MarketplaceFilterOption,
  type MarketplaceSortOption,
} from "@/features/catalog/catalog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  subscribeToProdukte,
  subscribeToAngebote,
} from "@/lib/appwrite/appwriteProducts";

export default function MarketplacePage() {
  const session = useAuthStore((state) => state.session);
  const [products, setProducts] = useState<Produkt[]>([]);
  const [offers, setOffers] = useState<Angebot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<MarketplaceSortOption>("availability");
  const [filterBy, setFilterBy] = useState<MarketplaceFilterOption>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedCategory, setSelectedCategory] =
    useState<CatalogCategory>("Obst");
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    let cancelled = false;

    async function loadMarketplace() {
      setLoading(true);
      setLoadError(null);

      try {
        const snapshot = await listMarketplaceSnapshot();

        if (!cancelled) {
          setProducts(snapshot.products);
          setOffers(snapshot.offers);
        }
      } catch (error) {
        console.error("Error loading marketplace offers", error);
        if (!cancelled) {
          setLoadError("Angebote konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMarketplace();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    const unsubscribeOffers = subscribeToAngebote(({ type, record }) => {
      setOffers((current) => applyRealtimeRecord(current, type, record));
    });

    const unsubscribeProducts = subscribeToProdukte(({ type, record }) => {
      setProducts((current) => applyRealtimeRecord(current, type, record));
    });

    return () => {
      unsubscribeOffers();
      unsubscribeProducts();
    };
  }, [session]);

  const marketplaceOffers = useMemo(
    () => composeMarketplaceOffers(products, offers),
    [offers, products],
  );

  const visibleOffers = useMemo(
    () =>
      filterMarketplaceOffers({
        offers: marketplaceOffers,
        category: selectedCategory,
        search: debouncedSearch,
        filterBy,
        sortBy,
        sortOrder,
      }),
    [
      debouncedSearch,
      filterBy,
      marketplaceOffers,
      selectedCategory,
      sortBy,
      sortOrder,
    ],
  );

  return (
    <PageShell>
      <PageHeader
        title="Marktplatz"
        badge="Live-Angebote"
        description="Ein reduzierter Überblick über sofort verfügbare Angebote. Für die komplette Produktauswahl springst du direkt in den Produktkatalog."
      />

      <SurfaceSection className="p-5 sm:p-6">
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {marketplaceOffers.length === 1
                    ? "1 sichtbares Angebot"
                    : `${marketplaceOffers.length} sichtbare Angebote`}
                </Badge>
                <Badge variant="outline">{products.length} Produkte im Katalog</Badge>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Nutze den Marktplatz für schnelle Verfügbarkeitschecks. Wenn du
                nach Produktfamilien, Saisonfenstern oder mehreren Optionen
                suchst, ist die Produktseite der bessere Einstieg.
              </p>
            </div>

            <div className="flex items-center justify-start lg:justify-end">
              <Button asChild variant="outline">
                <Link to="/produkte">Zum vollständigen Produktkatalog</Link>
              </Button>
            </div>
          </div>

          <Tabs
            value={selectedCategory}
            onValueChange={(value) =>
              setSelectedCategory(value as CatalogCategory)
            }
          >
            <TabsList variant="line" className="flex-wrap justify-start">
              {catalogCategories.map((category) => (
                <TabsTrigger key={category} value={category}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Nach Produkt, Sorte oder Kategorie suchen"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <Select
              value={filterBy}
              onValueChange={(value) =>
                setFilterBy(value as MarketplaceFilterOption)
              }
            >
              <SelectTrigger className="min-w-[180px]">
                <Filter className="mr-2 size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Alle Angebote</SelectItem>
                  <SelectItem value="available">Verfügbar</SelectItem>
                  <SelectItem value="low-stock">Wenig Bestand</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value) =>
                setSortBy(value as MarketplaceSortOption)
              }
            >
              <SelectTrigger className="min-w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="availability">Nach Bestand</SelectItem>
                  <SelectItem value="price">Nach Preis</SelectItem>
                  <SelectItem value="name">Nach Name</SelectItem>
                  <SelectItem value="date">Nach Datum</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() =>
                setSortOrder((value) => (value === "asc" ? "desc" : "asc"))
              }
            >
              {sortOrder === "asc" ? "Aufsteigend" : "Absteigend"}
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">
            {loading
              ? "Angebote laden"
              : visibleOffers.length === 1
                ? "1 Angebot"
                : `${visibleOffers.length} Angebote`}
          </Badge>
          <Badge variant="outline">
            {filterBy === "all"
              ? "Alle Bestände"
              : filterBy === "available"
                ? "Nur verfügbare"
                : "Nur wenig Bestand"}
          </Badge>
          {debouncedSearch ? (
            <Badge variant="outline">Suche: {debouncedSearch}</Badge>
          ) : null}
        </div>
      </SurfaceSection>

      <div className="text-sm text-muted-foreground">
        {loadError
          ? loadError
          : loading
          ? "Angebote werden geladen."
          : visibleOffers.length === 1
            ? "1 Angebot gefunden"
            : `${visibleOffers.length} Angebote gefunden`}
      </div>

      {loading ? (
        <MarketplaceSkeletonGrid />
      ) : loadError ? (
        <EmptyState
          title="Marktplatz momentan nicht erreichbar"
          description="Bitte versuche es erneut, sobald die Appwrite-Verbindung wieder steht."
        />
      ) : visibleOffers.length === 0 ? (
        <EmptyState
          title="Keine Angebote gefunden"
          description="Versuche andere Suchbegriffe oder Filter."
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleOffers.map((offer) => {
            const imageUrl = getProductImageUrl(offer.produkt.imageId);

            return (
              <SurfaceSection key={offer.id} className="h-full">
                <CardHeader className="gap-4 border-b">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-12 rounded-xl">
                      {imageUrl ? (
                        <AvatarImage src={imageUrl} alt={offer.produkt.name} />
                      ) : (
                        <AvatarFallback className="bg-secondary text-primary">
                          {offer.produkt.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex flex-col gap-1">
                      <CardTitle className="truncate text-lg">
                        {offer.produkt.name}
                      </CardTitle>
                      <CardDescription>
                        {offer.produkt.sorte
                          ? `${offer.produkt.sorte} · ${displayValueLabel(offer.produkt.unterkategorie) || ""}`
                          : displayValueLabel(offer.produkt.unterkategorie)}
                      </CardDescription>
                    </div>
                  </div>

                  <CardAction>
                    <Badge
                      variant={getOfferAvailabilityBadgeVariant(
                        offer.mengeVerfuegbar,
                      )}
                    >
                      {getOfferAvailabilityText(offer.mengeVerfuegbar)}
                    </Badge>
                  </CardAction>
                </CardHeader>

                <CardContent className="flex flex-col gap-4 pt-4">
                  <div className="grid gap-3">
                    <InfoRow
                      icon={<Package className="size-4" />}
                      label={`${offer.mengeVerfuegbar} ${offer.einheit} verfügbar`}
                    />
                    <InfoRow
                      icon={<Euro className="size-4" />}
                      label={getOfferPriceSummary(offer)}
                    />
                    <InfoRow
                      icon={<Calendar className="size-4" />}
                      label={new Date(offer.saatPflanzDatum).toLocaleDateString("de-DE")}
                    />
                  </div>

                  <Separator />

                  <p className="text-sm text-muted-foreground">
                    Nächste Ernte: {formatHarvestRange(offer.ernteProjektion)}
                  </p>
                </CardContent>

                <CardFooter className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {displayValueLabel(offer.produkt.hauptkategorie)}
                  </p>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link to="/produkte">Zum Produktkatalog</Link>
                    </Button>
                    <Button asChild className="w-full sm:w-auto">
                      <Link to="/angebote/$id" params={{ id: offer.id }}>
                        Angebotsdetails
                      </Link>
                    </Button>
                  </div>
                </CardFooter>
              </SurfaceSection>
            );
          })}
        </section>
      )}
    </PageShell>
  );
}

function applyRealtimeRecord<T extends { id: string }>(
  records: T[],
  type: "create" | "update" | "delete",
  record: T,
): T[] {
  if (type === "delete") {
    return records.filter((entry) => entry.id !== record.id);
  }

  const existingIndex = records.findIndex((entry) => entry.id === record.id);
  if (existingIndex === -1) {
    return [...records, record];
  }

  return records.map((entry) => (entry.id === record.id ? record : entry));
}

function InfoRow({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function MarketplaceSkeletonGrid() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="gap-4 border-b">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-xl" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <CardAction>
              <Skeleton className="h-5 w-24 rounded-full" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            <div className="grid gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </CardFooter>
        </Card>
      ))}
    </section>
  );
}
