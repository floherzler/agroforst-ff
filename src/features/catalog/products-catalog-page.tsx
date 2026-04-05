"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRight, Search as SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  PageHeader,
  PageShell,
  SurfaceSection,
} from "@/components/base/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatHarvestRange,
  getOfferDisplayUnitPrice,
  getOfferPriceSummary,
} from "@/features/catalog/catalog";
import { displayValueLabel } from "@/features/zentrale/admin-domain";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  listAlleProdukte,
  listAngebote,
  subscribeToAngebote,
  subscribeToProdukte,
} from "@/lib/appwrite/appwriteProducts";

type CatalogRow =
  | {
      kind: "offer";
      id: string;
      product: Produkt;
      offer: Angebot;
      offerCount: number;
    }
  | {
      kind: "product";
      id: string;
      product: Produkt;
      offer: null;
      offerCount: 0;
    };

export default function ProductsCatalogPage() {
  const [products, setProducts] = useState<Produkt[]>([]);
  const [offers, setOffers] = useState<Angebot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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

  const offerCountByProduct = useMemo(() => {
    return offers.reduce<Record<string, number>>((result, offer) => {
      if (!offer.produktId) {
        return result;
      }

      result[offer.produktId] = (result[offer.produktId] ?? 0) + 1;
      return result;
    }, {});
  }, [offers]);

  const rows = useMemo(() => {
    const productsById = new Map(products.map((product) => [product.id, product] as const));
    const offerRows: CatalogRow[] = offers
      .map((offer) => {
        const product = productsById.get(offer.produktId);
        if (!product) {
          return null;
        }

        return {
          kind: "offer",
          id: offer.id,
          product,
          offer,
          offerCount: offerCountByProduct[product.id] ?? 0,
        } satisfies CatalogRow;
      })
      .filter((row): row is Extract<CatalogRow, { kind: "offer" }> => row !== null)
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

        const nameCompare = left.product.name.localeCompare(right.product.name, "de");
        if (nameCompare !== 0) {
          return nameCompare;
        }

        return (right.offer.year ?? 0) - (left.offer.year ?? 0);
      });

    const productRows: CatalogRow[] = products
      .filter((product) => !offerCountByProduct[product.id])
      .sort((left, right) => left.name.localeCompare(right.name, "de"))
      .map((product) => ({
        kind: "product",
        id: product.id,
        product,
        offer: null,
        offerCount: 0,
      }));

    return [...offerRows, ...productRows];
  }, [offerCountByProduct, offers, products]);

  const visibleRows = useMemo(() => {
    const searchValue = debouncedSearch.trim().toLowerCase();
    if (!searchValue) {
      return rows;
    }

    return rows.filter((row) => {
      const values = [
        row.product.name,
        row.product.sorte,
        row.product.hauptkategorie,
        row.product.unterkategorie,
        row.kind === "offer" ? row.offer.year : "",
      ]
        .join(" ")
        .toLowerCase();

      return values.includes(searchValue);
    });
  }, [debouncedSearch, rows]);

  const offerRowsCount = rows.filter((row) => row.kind === "offer").length;
  const productRowsWithoutOffers = rows.length - offerRowsCount;

  return (
    <PageShell>
      <PageHeader
        title="Produkte"
        badge="Angebotsübersicht"
        description="Hier steht das Angebot im Vordergrund: erst alle aktuellen Angebote, danach die Produkte ohne laufendes Angebot. Die Struktur bleibt absichtlich schlicht."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/">
                Zur Startseite
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        }
      />

      <SurfaceSection className="border-border/70 bg-muted/20 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{loading ? "Lädt..." : `${offerRowsCount} Angebote`}</Badge>
            <Badge variant="outline">
              {loading ? "Abgleich läuft" : `${productRowsWithoutOffers} Produkte ohne Angebot`}
            </Badge>
            {debouncedSearch ? <Badge variant="outline">Suche: {debouncedSearch}</Badge> : null}
          </div>

          <div className="relative w-full max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Produkt, Sorte oder Kategorie suchen"
              className="pl-9"
              aria-label="Produkte oder Angebote suchen"
            />
          </div>
        </div>
      </SurfaceSection>

      {loading && rows.length === 0 ? (
        <CatalogTableSkeleton />
      ) : loadError ? (
        <EmptyState
          title="Produktseite momentan nicht erreichbar"
          description={loadError}
        />
      ) : visibleRows.length === 0 ? (
        <EmptyState
          title="Keine Treffer"
          description="Passe den Suchbegriff an, um Angebote oder Produkte wieder einzublenden."
        />
      ) : (
        <SurfaceSection className="overflow-hidden">
          <Table className="min-w-[880px]">
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
              {visibleRows.map((row) => {
                if (row.kind === "offer") {
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Badge variant={row.offer.mengeVerfuegbar > 0 ? "secondary" : "outline"}>
                          Angebot
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>
                            {row.product.name}
                            {row.product.sorte ? ` – ${row.product.sorte}` : ""}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {row.offerCount === 1
                              ? "1 laufendes Angebot"
                              : `${row.offerCount} laufende Angebote`}
                          </span>
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
                }

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Badge variant="outline">Produkt</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.product.name}
                      {row.product.sorte ? ` – ${row.product.sorte}` : ""}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div>{displayValueLabel(row.product.hauptkategorie)}</div>
                      <div className="text-xs">
                        {displayValueLabel(row.product.unterkategorie) || "–"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">–</TableCell>
                    <TableCell className="text-muted-foreground">Noch kein Angebot</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.product.saisonalitaet.length > 0
                        ? row.product.saisonalitaet.join(", ")
                        : "Keine Angabe"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      Folgt später
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SurfaceSection>
      )}
    </PageShell>
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
