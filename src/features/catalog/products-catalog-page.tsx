"use client";

import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  Layers3,
  Radio,
  Search as SearchIcon,
  Sprout,
  Store,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import AngeboteModal from "@/components/AngeboteModal";
import { displayValueLabel } from "@/features/zentrale/admin-domain";
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
  CardAction,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  catalogCategories,
  formatEuro,
  formatHarvestRange,
  getProductImageUrl,
  listMarketplaceSnapshot,
  normalizeCatalogCategory,
  type CatalogCategory,
} from "@/features/catalog/catalog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  subscribeToAngebote,
  subscribeToProdukte,
} from "@/lib/appwrite/appwriteProducts";

type ViewMode = "cards" | "table";

type OfferMeta = {
  count: number;
  availableAmount: number;
  lowestPrice: number | null;
  nextHarvest: string;
};

export default function ProductsCatalogPage() {
  const [selectedCategory, setSelectedCategory] =
    useState<CatalogCategory>("Obst");
  const [view, setView] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Produkt[]>([]);
  const [offers, setOffers] = useState<Angebot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setLoading(true);
      setLoadError(null);

      try {
        const snapshot = await listMarketplaceSnapshot();

        if (!cancelled) {
          setProducts(snapshot.products);
          setOffers(snapshot.offers);
        }
      } catch (error) {
        console.error("Error loading product catalog", error);
        if (!cancelled) {
          setLoadError("Produkte konnten nicht geladen werden.");
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

  const visibleProducts = useMemo(() => {
    const searchValue = debouncedSearch.trim().toLowerCase();

    return products.filter((product) => {
      if (normalizeCatalogCategory(product.hauptkategorie) !== selectedCategory) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      const haystack = [
        product.name,
        product.sorte,
        product.hauptkategorie,
        product.unterkategorie,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchValue);
    });
  }, [debouncedSearch, products, selectedCategory]);

  const offerMetaByProduct = useMemo(() => {
    return offers.reduce<Record<string, OfferMeta>>((result, offer) => {
      const current = result[offer.produktId] ?? {
        count: 0,
        availableAmount: 0,
        lowestPrice: null,
        nextHarvest: "",
      };
      const nextHarvest = formatHarvestRange(offer.ernteProjektion);

      result[offer.produktId] = {
        count: current.count + 1,
        availableAmount: current.availableAmount + offer.mengeVerfuegbar,
        lowestPrice:
          current.lowestPrice === null
            ? offer.euroPreis
            : Math.min(current.lowestPrice, offer.euroPreis),
        nextHarvest:
          current.nextHarvest && current.nextHarvest !== "Noch offen"
            ? current.nextHarvest
            : nextHarvest,
      };

      return result;
    }, {});
  }, [offers]);

  const offerTotal = visibleProducts.reduce(
    (sum, product) => sum + (offerMetaByProduct[product.id]?.count ?? 0),
    0,
  );
  const productsWithOffers = visibleProducts.filter(
    (product) => (offerMetaByProduct[product.id]?.count ?? 0) > 0,
  ).length;
  const seasonalProducts = visibleProducts.filter(
    (product) => product.saisonalitaet.length > 0,
  ).length;

  return (
    <PageShell>
      <PageHeader
        title="Produkte"
        badge="Öffentlicher Katalog"
        description="Der Produktkatalog ist der öffentliche Einstieg. Produkte, Saisonfenster und aktuelle Angebotslage werden hier strukturiert aus Appwrite zusammengeführt."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/">
                Zur Landing Page
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild>
              <Link to="/signup" search={{ redirect: "/produkte" }}>
                Für Neuigkeiten registrieren
              </Link>
            </Button>
          </div>
        }
      />

      <SurfaceSection className="p-5 sm:p-6">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <CatalogStat
              icon={<Layers3 data-icon="inline-start" />}
              label="Produkte"
              value={loading ? "..." : String(visibleProducts.length)}
              hint="in der aktuellen Kategorie"
            />
            <CatalogStat
              icon={<Store data-icon="inline-start" />}
              label="Mit Angebot"
              value={loading ? "..." : String(productsWithOffers)}
              hint="mit mindestens einem aktiven Eintrag"
            />
            <CatalogStat
              icon={<Sprout data-icon="inline-start" />}
              label="Saisonal"
              value={loading ? "..." : String(seasonalProducts)}
              hint="mit gepflegten Monatsangaben"
            />
            <CatalogStat
              icon={<Radio data-icon="inline-start" />}
              label="Live"
              value={loading ? "..." : `${offerTotal}`}
              hint="Angebote werden live aktualisiert"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="flex flex-col gap-4">
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
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px]">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Produkt oder Sorte suchen"
                  className="pl-9"
                  aria-label="Produkte suchen"
                />
              </div>

              <Tabs
                value={view}
                onValueChange={(value) => setView(value as ViewMode)}
              >
                <TabsList>
                  <TabsTrigger value="cards">Karten</TabsTrigger>
                  <TabsTrigger value="table">Tabelle</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">
            {loading ? "Produkte laden" : `${visibleProducts.length} Produkte`}
          </Badge>
          <Badge variant="outline">
            {loading ? "Live-Abgleich läuft" : `${offerTotal} Angebote`}
          </Badge>
          <Badge variant="outline">Realtime via Appwrite</Badge>
          {debouncedSearch ? (
            <Badge variant="outline">Suche: {debouncedSearch}</Badge>
          ) : null}
        </div>
      </SurfaceSection>

      {loading && products.length === 0 ? (
        view === "cards" ? (
          <CatalogCardsSkeleton />
        ) : (
          <CatalogTableSkeleton />
        )
      ) : loadError ? (
        <EmptyState
          title="Produktkatalog momentan nicht erreichbar"
          description={loadError}
        />
      ) : visibleProducts.length === 0 ? (
        <EmptyState
          title="Keine Produkte gefunden"
          description="Passe Kategorie oder Suchbegriff an."
        />
      ) : view === "cards" ? (
        <CardsView products={visibleProducts} offerMetaByProduct={offerMetaByProduct} />
      ) : (
        <TableView products={visibleProducts} offerMetaByProduct={offerMetaByProduct} />
      )}
    </PageShell>
  );
}

function CardsView({
  products,
  offerMetaByProduct,
}: {
  products: Produkt[];
  offerMetaByProduct: Record<string, OfferMeta>;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const imageUrl = getProductImageUrl(product.imageId);
        const meta = offerMetaByProduct[product.id];
        const offerCount = meta?.count ?? 0;

        return (
          <SurfaceSection key={product.id} className="h-full">
            <CardHeader className="gap-4 border-b px-5 py-5 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-12 rounded-xl">
                  {imageUrl ? (
                    <AvatarImage src={imageUrl} alt={product.name} />
                  ) : (
                    <AvatarFallback className="bg-secondary text-primary">
                      {product.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0 flex flex-col gap-1">
                  <CardTitle className="truncate">
                    {product.name}
                    {product.sorte ? ` – ${product.sorte}` : ""}
                  </CardTitle>
                  <CardDescription>
                    {displayValueLabel(product.unterkategorie) ||
                      "Keine Unterkategorie"}
                  </CardDescription>
                </div>
              </div>
              <CardAction>
                <Badge variant={offerCount > 0 ? "secondary" : "outline"}>
                  {offerCount === 0
                    ? "Noch kein Angebot"
                    : `${offerCount} ${offerCount === 1 ? "Angebot" : "Angebote"}`}
                </Badge>
              </CardAction>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 px-5 py-4 sm:px-6">
              <div className="grid gap-3">
                <InfoRow
                  icon={<Store className="size-4" />}
                  label={
                    meta
                      ? `${meta.availableAmount} Einheiten insgesamt verfügbar`
                      : "Angebote folgen im Marktplatz"
                  }
                />
                <InfoRow
                  icon={<Calendar className="size-4" />}
                  label={
                    meta?.nextHarvest
                      ? `Nächste Ernte: ${meta.nextHarvest}`
                      : "Nächste Ernte: Noch offen"
                  }
                />
                <InfoRow
                  icon={<Sprout className="size-4" />}
                  label={
                    meta?.lowestPrice !== null
                      ? `Ab ${formatEuro(meta.lowestPrice)}`
                      : "Preis folgt mit dem ersten Angebot"
                  }
                />
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Saisonalität</p>
                <Seasonality months={product.saisonalitaet} />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col items-stretch gap-3 border-t px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>{displayValueLabel(product.hauptkategorie)}</span>
                <span>{offerCount > 0 ? "Live" : "In Vorbereitung"}</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <AngeboteModal
                  produktId={product.id}
                  produktName={product.name}
                  produktSorte={product.sorte}
                  produktAngebote={offerCount}
                  triggerVariant="outline"
                  triggerSize="default"
                  triggerClassName="w-full justify-center"
                />
                <Button asChild className="w-full">
                  <Link to="/signup" search={{ redirect: "/produkte" }}>
                    Neuigkeiten erhalten
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </SurfaceSection>
        );
      })}
    </section>
  );
}

function TableView({
  products,
  offerMetaByProduct,
}: {
  products: Produkt[];
  offerMetaByProduct: Record<string, OfferMeta>;
}) {
  return (
    <SurfaceSection className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kategorie</TableHead>
            <TableHead>Angebote</TableHead>
            <TableHead>Ab Preis</TableHead>
            <TableHead className="w-[300px]">Saisonalität</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const meta = offerMetaByProduct[product.id];
            const count = meta?.count ?? 0;

            return (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  {product.name}
                  {product.sorte ? ` – ${product.sorte}` : ""}
                </TableCell>
                <TableCell>
                  {displayValueLabel(product.hauptkategorie)}
                  <div className="text-sm text-muted-foreground">
                    {displayValueLabel(product.unterkategorie) || "–"}
                  </div>
                </TableCell>
                <TableCell>
                  <AngeboteModal
                    produktId={product.id}
                    produktName={product.name}
                    produktSorte={product.sorte}
                    produktAngebote={count}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {meta?.lowestPrice !== null ? formatEuro(meta.lowestPrice) : "–"}
                </TableCell>
                <TableCell>
                  <Seasonality months={product.saisonalitaet} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </SurfaceSection>
  );
}

function Seasonality({
  months,
}: {
  months?: Array<string | number> | null;
}) {
  if (!months || months.length === 0) {
    return <Badge variant="outline">Keine Angaben</Badge>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {months.map((month) => (
        <Badge key={month} variant="outline">
          {month}
        </Badge>
      ))}
    </div>
  );
}

function CatalogStat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <SurfaceSection className="border-border/70 bg-muted/20 p-4">
      <div className="flex flex-col gap-2">
        <Badge variant="outline" className="w-fit">
          {icon}
          {label}
        </Badge>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        <CardDescription>{hint}</CardDescription>
      </div>
    </SurfaceSection>
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

function CatalogCardsSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <SurfaceSection key={index} className="h-full">
          <CardHeader className="gap-4 border-b px-5 py-5 sm:px-6">
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
          <CardContent className="flex flex-col gap-4 px-5 py-4 sm:px-6">
            <div className="grid gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t px-5 py-4 sm:px-6">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </CardFooter>
        </SurfaceSection>
      ))}
    </section>
  );
}

function CatalogTableSkeleton() {
  return (
    <SurfaceSection className="overflow-hidden">
      <div className="grid gap-3 p-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid grid-cols-5 gap-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </SurfaceSection>
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
