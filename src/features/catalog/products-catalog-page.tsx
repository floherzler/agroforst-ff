"use client";

import { Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";

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
import {
  CardAction,
  CardContent,
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
  const offerTotal = products.reduce(
    (sum, product) => sum + (offerCounts[product.id] ?? 0),
    0,
  );

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

            <Tabs value={view} onValueChange={(value) => setView(value as ViewMode)}>
              <TabsList>
                <TabsTrigger value="cards">Karten</TabsTrigger>
                <TabsTrigger value="table">Tabelle</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">
            {loading ? "Produkte laden" : `${products.length} Produkte`}
          </Badge>
          <Badge variant="outline">
            {loading ? "Angebote werden aktualisiert" : `${offerTotal} Angebote`}
          </Badge>
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
      ) : products.length === 0 ? (
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
        const offerCount = offerCounts[product.id] ?? 0;

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
                  <p className="text-sm text-muted-foreground">
                    {product.unterkategorie || "Keine Unterkategorie"}
                  </p>
                </div>
              </div>

              <CardAction>
                <AngeboteModal
                  produktId={product.id}
                  produktName={product.name}
                  produktSorte={product.sorte}
                  produktAngebote={offerCount}
                />
              </CardAction>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={offerCount > 0 ? "secondary" : "outline"}>
                  {offerCount === 0
                    ? "Keine Angebote"
                    : `${offerCount} ${offerCount === 1 ? "Angebot" : "Angebote"}`}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Aktuelle Verfügbarkeit im Überblick
                </span>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Saisonalität</p>
                <Seasonality months={product.saisonalitaet} />
              </div>
            </CardContent>
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
                <TableCell>{displayValueLabel(product.hauptkategorie)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {displayValueLabel(product.unterkategorie) || "–"}
                </TableCell>
                <TableCell>
                  <AngeboteModal
                    produktId={product.id}
                    produktName={product.name}
                    produktSorte={product.sorte}
                    produktAngebote={count}
                  />
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
              <Skeleton className="h-8 w-28 rounded-lg" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-5 py-4 sm:px-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-px w-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </CardContent>
        </SurfaceSection>
      ))}
    </section>
  );
}

function CatalogTableSkeleton() {
  return (
    <SurfaceSection className="overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="grid gap-3 md:grid-cols-[1.3fr_0.8fr_1fr_0.8fr_1.2fr]"
          >
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </SurfaceSection>
  );
}
