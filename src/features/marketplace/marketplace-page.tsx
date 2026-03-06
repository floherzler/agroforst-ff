"use client";

import { Link } from "@tanstack/react-router";
import {
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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  catalogCategories,
  filterMarketplaceOffers,
  formatHarvestRange,
  formatPricePerUnit,
  getOfferAvailabilityClassName,
  getOfferAvailabilityText,
  getProductImageUrl,
  listMarketplaceOffers,
  type CatalogCategory,
  type MarketplaceFilterOption,
  type MarketplaceSortOption,
  type ProductOffer,
} from "@/features/catalog/catalog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export default function MarketplacePage() {
  const [offers, setOffers] = useState<ProductOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<MarketplaceSortOption>("date");
  const [filterBy, setFilterBy] = useState<MarketplaceFilterOption>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedCategory, setSelectedCategory] =
    useState<CatalogCategory>("Obst");
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    let cancelled = false;

    async function loadOffers() {
      setLoading(true);

      try {
        const nextOffers = await listMarketplaceOffers();

        if (!cancelled) {
          setOffers(nextOffers);
        }
      } catch (error) {
        console.error("Error loading marketplace offers", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOffers();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleOffers = useMemo(
    () =>
      filterMarketplaceOffers({
        offers,
        category: selectedCategory,
        search: debouncedSearch,
        filterBy,
        sortBy,
        sortOrder,
      }),
    [debouncedSearch, filterBy, offers, selectedCategory, sortBy, sortOrder],
  );

  return (
    <PageShell>
      <PageHeader
        title="Marktplatz"
        description="Aktuelle Angebote, reduziert auf Suche, Filter und Verfügbarkeit."
        actions={
          <Button asChild variant="outline">
            <Link to="/produkte">Alle Produkte</Link>
          </Button>
        }
      />

      <SurfaceSection className="p-5 sm:p-6">
        <div className="grid gap-4">
          <Tabs
            value={selectedCategory}
            onValueChange={(value) =>
              setSelectedCategory(value as CatalogCategory)
            }
          >
            <TabsList>
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
                <SelectItem value="all">Alle Angebote</SelectItem>
                <SelectItem value="available">Verfügbar</SelectItem>
                <SelectItem value="low-stock">Wenig Bestand</SelectItem>
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
                <SelectItem value="date">Nach Datum</SelectItem>
                <SelectItem value="price">Nach Preis</SelectItem>
                <SelectItem value="name">Nach Name</SelectItem>
                <SelectItem value="availability">Nach Bestand</SelectItem>
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
      </SurfaceSection>

      <div className="text-sm text-muted-foreground">
        {loading
          ? "Angebote werden geladen."
          : visibleOffers.length === 1
            ? "1 Angebot gefunden"
            : `${visibleOffers.length} Angebote gefunden`}
      </div>

      {loading ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-3 rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </section>
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
              <SurfaceSection key={offer.id}>
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
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
                      <div className="min-w-0 space-y-1">
                        <CardTitle className="truncate text-lg">
                          {offer.produkt.name}
                        </CardTitle>
                        <CardDescription>
                          {offer.produkt.sorte
                            ? `${offer.produkt.sorte} · ${offer.produkt.unterkategorie || ""}`
                            : offer.produkt.unterkategorie}
                        </CardDescription>
                      </div>
                    </div>

                    <Badge className={getOfferAvailabilityClassName(offer.mengeVerfuegbar)}>
                      {getOfferAvailabilityText(offer.mengeVerfuegbar)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <InfoRow
                    icon={<Package className="size-4" />}
                    label={`${offer.mengeVerfuegbar} ${offer.einheit} verfügbar`}
                  />
                  <InfoRow
                    icon={<Euro className="size-4" />}
                    label={formatPricePerUnit(
                      offer.euroPreis,
                      offer.menge,
                      offer.einheit,
                    )}
                  />
                  <InfoRow
                    icon={<Calendar className="size-4" />}
                    label={new Date(offer.saatPflanzDatum).toLocaleDateString("de-DE")}
                  />
                  <p className="text-sm text-muted-foreground">
                    Nächste Ernte: {formatHarvestRange(offer.ernteProjektion)}
                  </p>

                  <Button asChild className="w-full">
                    <Link to="/angebote/$id" params={{ id: offer.id }}>
                      Details anzeigen
                    </Link>
                  </Button>
                </CardContent>
              </SurfaceSection>
            );
          })}
        </section>
      )}
    </PageShell>
  );
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
