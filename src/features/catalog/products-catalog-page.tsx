"use client";

import { Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";

import AngeboteModal from "@/components/AngeboteModal";
import {
  EmptyState,
  PageHeader,
  PageShell,
  SurfaceSection,
} from "@/components/base/page-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  getProductImageUrl,
  listProductCatalog,
  type CatalogCategory,
} from "@/features/catalog/catalog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type ViewMode = "cards" | "table";

export default function ProductsCatalogPage() {
  const [selectedCategory, setSelectedCategory] =
    useState<CatalogCategory>("Obst");
  const [view, setView] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Produkt[]>([]);
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setLoading(true);

      try {
        const nextCatalog = await listProductCatalog({
          category: selectedCategory,
          search: debouncedSearch.trim() || undefined,
        });

        if (!cancelled) {
          setProducts(nextCatalog.products);
          setOfferCounts(nextCatalog.offerCounts);
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
  }, [debouncedSearch, selectedCategory]);

  return (
    <PageShell>
      <PageHeader
        title="Produktkatalog"
        description={
          loading
            ? "Produkte werden geladen."
            : `${products.length} Produkte in der aktuellen Ansicht.`
        }
      />

      <SurfaceSection className="p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-4">
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

            <Tabs value={view} onValueChange={(value) => setView(value as ViewMode)}>
              <TabsList>
                <TabsTrigger value="cards">Karten</TabsTrigger>
                <TabsTrigger value="table">Tabelle</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </SurfaceSection>

      {products.length === 0 && !loading ? (
        <EmptyState
          title="Keine Produkte gefunden"
          description="Passe Kategorie oder Suchbegriff an."
        />
      ) : view === "cards" ? (
        <CardsView products={products} offerCounts={offerCounts} />
      ) : (
        <TableView products={products} offerCounts={offerCounts} />
      )}
    </PageShell>
  );
}

function CardsView({
  products,
  offerCounts,
}: {
  products: Produkt[];
  offerCounts: Record<string, number>;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const imageUrl = getProductImageUrl(product.imageId);

        return (
          <SurfaceSection key={product.id}>
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
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
                <div className="min-w-0 space-y-1">
                  <h2 className="truncate text-base font-semibold">
                    {product.name}
                    {product.sorte ? ` – ${product.sorte}` : ""}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {product.unterkategorie || "Keine Unterkategorie"}
                  </p>
                </div>
              </div>

              <AngeboteModal
                produktId={product.id}
                produktName={product.name}
                produktSorte={product.sorte}
                produktAngebote={offerCounts[product.id] ?? 0}
              />
            </div>

            <div className="border-t border-border/70 px-5 py-4 text-sm text-muted-foreground sm:px-6">
              <Seasonality months={product.saisonalitaet} />
            </div>
          </SurfaceSection>
        );
      })}
    </section>
  );
}

function TableView({
  products,
  offerCounts,
}: {
  products: Produkt[];
  offerCounts: Record<string, number>;
}) {
  return (
    <SurfaceSection className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kategorie</TableHead>
            <TableHead>Unterkategorie</TableHead>
            <TableHead>Angebote</TableHead>
            <TableHead className="w-[360px]">Saisonalität</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const count = offerCounts[product.id] ?? 0;
            return (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  {product.name}
                  {product.sorte ? ` – ${product.sorte}` : ""}
                </TableCell>
                <TableCell>{product.hauptkategorie}</TableCell>
                <TableCell className="text-muted-foreground">
                  {product.unterkategorie || "–"}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" disabled={count === 0}>
                    {count === 0 ? "Keine" : `${count} Angebote`}
                  </Button>
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
    return <span>Keine Angaben</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {months.map((month) => (
        <span
          key={month}
          className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
        >
          {month}
        </span>
      ))}
    </div>
  );
}
