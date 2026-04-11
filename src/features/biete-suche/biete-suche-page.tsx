"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowRightLeft, Search as SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState, PageHeader, PageShell, SurfaceSection } from "@/components/base/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listBieteSucheEintraege, subscribeToBieteSucheEintraege } from "@/lib/appwrite/appwriteExchange";
import { applyRealtimeRecord } from "@/features/zentrale/admin-domain";

function getModeBadgeClassName(modus: BieteSucheModus) {
  return modus === "biete"
    ? "border-permdal-300 bg-permdal-100 text-permdal-800"
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

  return (
    <PageShell>
      <PageHeader
        title="Biete/Suche"
        badge="Austausch mit dem Agroforst"
        description="Hier sammeln wir, was wir gerade anbieten oder suchen."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/feedback">
                Feedback
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">
                Zur Startseite
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild>
              <Link to="/produkte">
                Zum Produktkatalog
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        }
      />

      <SurfaceSection className="border-border/70 bg-muted/20 p-5 sm:p-6">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{loading ? "Lädt..." : `${entries.length} Einträge gesamt`}</Badge>
            <Badge variant="outline">{loading ? "Abgleich läuft" : `${visibleEntries.length} sichtbar`}</Badge>
            {selectedTag !== "alle" ? <Badge variant="outline" className={tagPillClassName}>Tag: #{selectedTag}</Badge> : null}
          </div>

          <Tabs value={selectedMode} onValueChange={(value) => setSelectedMode(value as "alle" | BieteSucheModus)}>
            <TabsList variant="line" className="flex-wrap justify-start">
              <TabsTrigger value="alle">Alle</TabsTrigger>
              <TabsTrigger value="biete">Biete</TabsTrigger>
              <TabsTrigger value="suche">Suche</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nach Titel, Beschreibung oder Tag suchen"
                aria-label="Biete/Suche durchsuchen"
              />
            </div>

            <div className="flex flex-wrap gap-2">
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
          </div>
        </div>
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
            <Card key={entry.id} className="border-border/80 bg-card/95 shadow-brand-soft">
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <Badge variant="outline" className={getModeBadgeClassName(entry.modus)}>
                      {entry.modus === "biete" ? "Biete" : "Suche"}
                    </Badge>
                    <CardTitle className="text-xl">{entry.titel}</CardTitle>
                  </div>
                  <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
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
