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
    <main className="min-h-screen bg-background">
      <div className="container mx-auto space-y-4 px-4 py-4 sm:space-y-6 sm:py-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-permdal-900 sm:text-3xl lg:text-4xl">
            Marktplatz
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base lg:text-lg">
            Aktuelle Angebote aus der Ostprignitz
          </p>
          <div className="mt-4 flex justify-center">
            <Link to="/produkte">
              <Button
                variant="outline"
                size="sm"
                className="border-permdal-200 text-xs text-permdal-700 hover:bg-permdal-50 sm:text-sm"
              >
                Alle Produkte anzeigen
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex justify-center">
          <Tabs
            value={selectedCategory}
            onValueChange={(value) =>
              setSelectedCategory(value as CatalogCategory)
            }
          >
            <TabsList className="flex flex-wrap gap-1 rounded-xl border border-permdal-100 bg-permdal-50/60 p-1">
              {catalogCategories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="rounded-lg px-2 py-1 text-xs transition hover:bg-permdal-100/40 data-[state=active]:bg-permdal-200/60 data-[state=active]:text-permdal-900 data-[state=active]:shadow-sm sm:px-3 sm:py-1.5 sm:text-sm"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-col gap-4">
          <div className="relative w-full">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Nach Produkt, Sorte oder Kategorie suchen..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select
              value={filterBy}
              onValueChange={(value) =>
                setFilterBy(value as MarketplaceFilterOption)
              }
            >
              <SelectTrigger className="w-full text-xs sm:w-[140px] sm:text-sm">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-card">
                <SelectItem value="all">Alle Angebote</SelectItem>
                <SelectItem value="available">Verfügbar</SelectItem>
                <SelectItem value="low-stock">Nur noch wenige</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value) =>
                setSortBy(value as MarketplaceSortOption)
              }
            >
              <SelectTrigger className="w-full text-xs sm:w-[140px] sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-card">
                <SelectItem value="date">Nach Datum</SelectItem>
                <SelectItem value="price">Nach Preis</SelectItem>
                <SelectItem value="name">Nach Name</SelectItem>
                <SelectItem value="availability">Nach Verfügbarkeit</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex h-full items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSortOrder((value) => (value === "asc" ? "desc" : "asc"))
                }
                className="w-[40px] text-xs sm:text-sm"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground sm:text-sm">
          {loading
            ? "Laden..."
            : visibleOffers.length === 1
              ? "1 Angebot gefunden"
              : `${visibleOffers.length} Angebote gefunden`}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card
                key={index}
                className="animate-pulse border border-surface-outline bg-surface-card"
              >
                <CardHeader>
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {visibleOffers.map((offer) => {
              const imageUrl = getProductImageUrl(offer.produkt.imageId);

              return (
                <Card
                  key={offer.id}
                  className="border border-surface-outline bg-surface-card shadow-brand-soft transition-shadow hover:shadow-brand-strong"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Avatar className="h-10 w-10 rounded-lg sm:h-12 sm:w-12">
                          {imageUrl ? (
                            <AvatarImage
                              src={imageUrl}
                              alt={offer.produkt.name}
                            />
                          ) : (
                            <AvatarFallback className="rounded-lg bg-permdal-100 text-xs text-permdal-800 sm:text-sm">
                              {offer.produkt.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-sm sm:text-lg">
                            {offer.produkt.name}
                            {offer.produkt.sorte ? (
                              <span className="text-xs font-normal text-muted-foreground sm:text-sm">
                                {" "}
                                – {offer.produkt.sorte}
                              </span>
                            ) : null}
                          </CardTitle>
                          <CardDescription className="truncate text-xs sm:text-sm">
                            {offer.produkt.unterkategorie}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        className={`${getOfferAvailabilityClassName(offer.mengeVerfuegbar)} text-xs`}
                      >
                        {getOfferAvailabilityText(offer.mengeVerfuegbar)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {offer.mengeVerfuegbar} {offer.einheit} verfügbar
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-permdal-700">
                        <Euro className="h-4 w-4" />
                        <span>
                          {formatPricePerUnit(
                            offer.euroPreis,
                            offer.menge,
                            offer.einheit,
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Saat-/Pflanzdatum:{" "}
                        {new Date(offer.saatPflanzDatum).toLocaleDateString(
                          "de-DE",
                        )}
                      </span>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Nächste Ernte:</span>{" "}
                      {formatHarvestRange(offer.ernteProjektion)}
                    </div>

                    <div className="pt-2">
                      <Link to="/angebote/$id" params={{ id: offer.id }}>
                        <Button className="w-full bg-permdal-600 shadow-brand-soft hover:bg-permdal-700">
                          Details anzeigen
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && visibleOffers.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-lg text-muted-foreground">
              Keine Angebote gefunden
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Versuchen Sie andere Suchbegriffe oder Filter
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
