"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRightLeft, ChevronDown, ChevronUp, Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState, PageHeader, PageShell, SurfaceSection } from "@/components/base/page-shell";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listBieteSucheEintraege, subscribeToBieteSucheEintraege } from "@/lib/appwrite/appwriteExchange";
import { applyRealtimeRecord } from "@/features/zentrale/admin-domain";

function getModeBadgeClassName(modus: BieteSucheModus) {
  return modus === "biete"
    ? "!border-permdal-300 !bg-permdal-100 !text-permdal-800"
    : "border-lilac-300 bg-lilac-100 text-lilac-800";
}

const tagPillClassName =
  "border-border/70 bg-background/95 text-foreground shadow-[0_1px_2px_rgba(23,2,6,0.08),0_6px_14px_rgba(23,2,6,0.05)]";

export default function BieteSuchePage() {
  const [entries, setEntries] = useState<BieteSucheEintrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedMode, setSelectedMode] = useState<"alle" | BieteSucheModus>("alle");
  const [selectedTag, setSelectedTag] = useState<string>("alle");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 250);

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await listBieteSucheEintraege();
        if (!cancelled) {
          setEntries(response);
        }
      } catch (error) {
        console.error("Error loading Biete/Suche entries", error);
        if (!cancelled) {
          setLoadError("Biete/Suche konnte nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let unsubscribe = () => { };

    try {
      unsubscribe = subscribeToBieteSucheEintraege(({ type, record }) => {
        setEntries((current) => applyRealtimeRecord(current, type, record));
      });
    } catch (error) {
      console.error("Failed to subscribe to Biete/Suche realtime updates", error);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const availableTags = useMemo(
    () =>
      Array.from(
        new Set(entries.flatMap((entry) => entry.tags.map((tag) => tag.trim()).filter(Boolean))),
      ).sort((left, right) => left.localeCompare(right, "de")),
    [entries],
  );

  const visibleEntries = useMemo(() => {
    const searchValue = debouncedSearch.trim().toLowerCase();

    return entries.filter((entry) => {
      if (selectedMode !== "alle" && entry.modus !== selectedMode) {
        return false;
      }

      if (
        selectedTag !== "alle"
        && !entry.tags.some((tag) => tag.trim().toLowerCase() === selectedTag.toLowerCase())
      ) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      return [entry.titel, entry.beschreibung ?? "", entry.hinweis ?? "", ...entry.tags]
        .join(" ")
        .toLowerCase()
        .includes(searchValue);
    });
  }, [debouncedSearch, entries, selectedMode, selectedTag]);

  const modeValue = selectedMode === "alle" ? ["alle"] : [selectedMode];

  return (
    <PageShell>
      <PageHeader
        title="Biete/Suche"
        badge="Austausch mit dem Agroforst"
        description="Hier sammeln wir, was wir gerade anbieten oder suchen."
      />

      <SurfaceSection className="border-border/70 bg-muted/20 p-5 sm:p-6">
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{loading ? "Lädt..." : `${entries.length} Einträge gesamt`}</Badge>
              <Badge variant="outline">{loading ? "Abgleich läuft" : `${visibleEntries.length} sichtbar`}</Badge>
              {selectedTag !== "alle" ? <Badge variant="outline" className={tagPillClassName}>Tag: #{selectedTag}</Badge> : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ToggleGroup
                multiple={false}
                value={modeValue}
                onValueChange={(value) => {
                  setSelectedMode((value[0] as "alle" | BieteSucheModus | undefined) ?? "alle");
                }}
                variant="outline"
                size="sm"
                className="rounded-full border border-border/70 bg-background/70 p-1 shadow-sm"
              >
                <ToggleGroupItem value="alle" className="rounded-full px-4">
                  Alle
                </ToggleGroupItem>
                <ToggleGroupItem value="biete" className="rounded-full px-4">
                  Biete
                </ToggleGroupItem>
                <ToggleGroupItem value="suche" className="rounded-full px-4">
                  Suche
                </ToggleGroupItem>
              </ToggleGroup>

              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nach Titel, Beschreibung oder Tag suchen"
                  aria-label="Biete/Suche durchsuchen"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-full"
                aria-expanded={filtersOpen}
                aria-controls="biete-suche-tags"
                onClick={() => setFiltersOpen((current) => !current)}
              >
                <SlidersHorizontal data-icon="inline-start" />
                {filtersOpen ? "Filter verbergen" : "Filter"}
                {filtersOpen ? <ChevronUp data-icon="inline-end" /> : <ChevronDown data-icon="inline-end" />}
              </Button>
            </div>

            <CollapsibleContent id="biete-suche-tags" className="pt-1">
              <ScrollArea className="w-full rounded-[1.2rem] border border-border/60 bg-background/65 px-3 py-3">
                <div className="flex w-max min-w-full gap-2 pr-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTag("alle")}
                    className={`rounded-full border px-3 py-2 text-sm transition ${selectedTag === "alle" ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-background hover:bg-muted"}`}
                  >
                    Alle Tags
                  </button>
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                      className={`rounded-full border px-3 py-2 text-sm transition ${selectedTag === tag ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-background hover:bg-muted"}`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="mt-2" />
              </ScrollArea>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </SurfaceSection>

      {loading && entries.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-52 rounded-[1.75rem]" />
          ))}
        </div>
      ) : loadError ? (
        <EmptyState
          title="Biete/Suche ist gerade nicht erreichbar"
          description={loadError}
          action={(
            <Button asChild variant="outline">
              <Link to="/">Zur Startseite</Link>
            </Button>
          )}
        />
      ) : visibleEntries.length === 0 ? (
        <EmptyState
          title="Noch keine passenden Einträge"
          description="Für diese Kombination aus Modus, Suche und Tags gibt es aktuell keinen sichtbaren Eintrag."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleEntries.map((entry) => (
            <Card
              key={entry.id}
              tone="plain"
              style={{
                background:
                  "linear-gradient(180deg, rgba(239, 246, 228, 0.98) 0%, rgba(226, 237, 208, 0.98) 100%)",
              }}
              className="border-permdal-200/70 shadow-brand-soft"
            >
              <CardHeader className="gap-3 border-b border-permdal-200/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <Badge variant="outline" className={getModeBadgeClassName(entry.modus)}>
                      {entry.modus === "biete" ? "Biete" : "Suche"}
                    </Badge>
                    <CardTitle className="text-xl">{entry.titel}</CardTitle>
                  </div>
                  <div className="rounded-2xl border border-lilac-200/60 bg-lilac-100/70 p-3 text-lilac-700 shadow-[0_12px_28px_-20px_rgba(166,153,211,0.45)]">
                    <ArrowRightLeft className="size-5" />
                  </div>
                </div>
                <CardDescription>
                  {entry.hinweis ?? "Ohne zusätzlichen Hinweis"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {entry.beschreibung?.trim() || "Noch keine Beschreibung hinterlegt."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {entry.tags.length > 0 ? entry.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className={tagPillClassName}>#{tag}</Badge>
                  )) : <Badge variant="outline">Ohne Tag</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
