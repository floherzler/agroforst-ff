"use client";

import { Search as SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import AngeboteModal from "@/components/AngeboteModal";
import {
  catalogCategories,
  getProductImageUrl,
  listProductCatalog,
  type CatalogCategory,
} from "@/features/catalog/catalog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
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
    <main className="container mx-auto min-h-screen space-y-4 p-4">
      <section className="grid grid-cols-12 items-start gap-4">
        <div className="col-span-12 space-y-3 lg:col-span-8">
          <div>
            <h1 className="text-3xl font-bold">Katalog</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Laden…" : `${products.length} Produkte`}
            </p>
          </div>

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
                  className="rounded-lg px-3 py-1.5 text-sm transition hover:bg-permdal-100/40 data-[state=active]:bg-permdal-200/60 data-[state=active]:text-permdal-900 data-[state=active]:shadow-sm"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div
            className="flex flex-col gap-2 rounded-xl border bg-white/70 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60 lg:sticky lg:top-2"
            role="region"
            aria-label="Ansicht und Suche"
          >
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-full pl-8"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Suche (Name oder Sorte)…"
                  aria-label="Produkte suchen"
                />
              </div>

              <Tabs
                value={view}
                onValueChange={(value) => setView(value as ViewMode)}
              >
                <TabsList className="flex gap-1 rounded-lg border border-permdal-100 bg-permdal-50/60 p-1">
                  <TabsTrigger
                    value="cards"
                    className="shrink-0 rounded-md px-3 py-1.5 text-sm transition hover:bg-permdal-100/40 data-[state=active]:bg-permdal-200/60 data-[state=active]:text-permdal-900 data-[state=active]:shadow-sm"
                  >
                    Karten
                  </TabsTrigger>
                  <TabsTrigger
                    value="table"
                    className="shrink-0 rounded-md px-3 py-1.5 text-sm transition hover:bg-permdal-100/40 data-[state=active]:bg-permdal-200/60 data-[state=active]:text-permdal-900 data-[state=active]:shadow-sm"
                  >
                    Tabelle
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </section>

      {view === "cards" ? (
        <CardsView products={products} offerCounts={offerCounts} />
      ) : (
        <TableView products={products} offerCounts={offerCounts} />
      )}
    </main>
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
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const imageUrl = getProductImageUrl(product.imageId);

        return (
          <article
            key={product.id}
            className="flex flex-col gap-2 rounded-xl border bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 rounded-md">
                  {imageUrl ? (
                    <AvatarImage src={imageUrl} alt={product.name} />
                  ) : (
                    <AvatarFallback className="bg-permdal-100 text-permdal-800">
                      {product.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>

                <Button
                  variant="ghost"
                  className="px-0 text-left font-semibold hover:underline"
                  onClick={() => {}}
                  title="Produktseite (bald)"
                >
                  {product.name}
                  {product.sorte ? ` – ${product.sorte}` : ""}
                </Button>
              </div>

              <AngeboteModal
                produktId={product.id}
                produktName={product.name}
                produktSorte={product.sorte}
                produktAngebote={offerCounts[product.id] ?? 0}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              {product.unterkategorie || "–"}
            </div>

            <Seasonality months={product.saisonalitaet} />
          </article>
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
    <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
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
            const hasOffers = count > 0;

            return (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => {}}
                    title="Produktseite (bald)"
                  >
                    {product.name}
                    {product.sorte ? ` – ${product.sorte}` : ""}
                  </button>
                </TableCell>
                <TableCell>{product.hauptkategorie}</TableCell>
                <TableCell className="text-muted-foreground">
                  {product.unterkategorie || "–"}
                </TableCell>
                <TableCell>
                  <span
                    className={[
                      "rounded-full px-2 py-1 text-xs",
                      hasOffers
                        ? "bg-permdal-100 text-permdal-900"
                        : "bg-permdal-200 text-permdal-600",
                    ].join(" ")}
                  >
                    {hasOffers ? `${count} Angebote` : "Keine"}
                  </span>
                </TableCell>
                <TableCell>
                  <Seasonality months={product.saisonalitaet} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function Seasonality({ months }: { months: number[] }) {
  const segments = useMemo(() => computeSegments(months), [months]);
  const monthWidth = 100 / 12;

  return (
    <div className="mt-3">
      <div className="mb-1 text-xs text-muted-foreground">Saisonalität</div>

      <div className="relative">
        <div className="grid h-8 grid-cols-12 gap-px">
          {Array.from({ length: 12 }, (_, index) => (
            <div
              key={index}
              className="flex items-center justify-center rounded-[2px] bg-muted/60"
            >
              <span className="text-[10px] leading-none text-muted-foreground">
                {shortMonth(index + 1)}
              </span>
            </div>
          ))}
        </div>

        {segments.map((segment, index) => (
          <div
            key={index}
            className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-green-500/60 ring-1 ring-green-600/20"
            style={{
              left: `${(segment.start - 1) * monthWidth}%`,
              width: `${segment.len * monthWidth}%`,
            }}
            aria-label={`Saison von ${monthName(segment.start)} bis ${monthName(endOf(segment))}`}
            title={`Saison: ${monthName(segment.start)} – ${monthName(endOf(segment))}`}
          />
        ))}
      </div>
    </div>
  );
}

function computeSegments(months: number[]) {
  const present = new Array<boolean>(13).fill(false);

  months.forEach((month) => {
    if (Number.isFinite(month) && month >= 1 && month <= 12) {
      present[month] = true;
    }
  });

  const segments: { start: number; len: number }[] = [];

  for (let month = 1; month <= 12; month++) {
    const previousMonth = month === 1 ? 12 : month - 1;

    if (present[month] && !present[previousMonth]) {
      let len = 1;
      let next = month === 12 ? 1 : month + 1;

      while (present[next] && next !== month) {
        len++;
        next = next === 12 ? 1 : next + 1;

        if (len >= 12) {
          break;
        }
      }

      segments.push({ start: month, len });
    }
  }

  return segments;
}

function endOf(segment: { start: number; len: number }) {
  return ((segment.start + segment.len - 2) % 12) + 1;
}

function monthName(value: number) {
  return (
    [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
    ][value - 1] ?? String(value)
  );
}

function shortMonth(value: number) {
  return (
    [
      "Jan",
      "Feb",
      "Mär",
      "Apr",
      "Mai",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Okt",
      "Nov",
      "Dez",
    ][value - 1] ?? String(value)
  );
}
