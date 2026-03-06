"use client";

import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";

import AngeboteModal from "@/components/AngeboteModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProduktImagePreviewUrl, listProdukte, listStaffeln } from "@/lib/appwrite/appwriteProducts";

const KATS = ["Obst", "Gemüse", "Kräuter", "Maschine", "Sonstiges"] as const;
type ViewMode = "cards" | "table";

export default function ProdukteKatalogPage() {
    const [selectedKat, setSelectedKat] = useState<(typeof KATS)[number]>("Obst");
    const [view, setView] = useState<ViewMode>("cards");
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [produkte, setProdukte] = useState<Produkt[]>([]);
    const [angeboteCount, setAngeboteCount] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            try {
                const produktListe = await listProdukte({
                    hauptkategorie: selectedKat,
                    search: debouncedSearch.trim() || undefined,
                    limit: 200,
                });

                if (cancelled) {
                    return;
                }

                setProdukte(produktListe);

                if (produktListe.length === 0) {
                    setAngeboteCount({});
                    return;
                }

                const staffeln = await listStaffeln({
                    produktIds: produktListe.map((produkt) => produkt.id),
                    limit: 500,
                });

                if (cancelled) {
                    return;
                }

                const nextCounts = staffeln.reduce<Record<string, number>>((acc, staffel) => {
                    acc[staffel.produktId] = (acc[staffel.produktId] ?? 0) + 1;
                    return acc;
                }, {});
                setAngeboteCount(nextCounts);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, [selectedKat, debouncedSearch]);

    return (
        <main className="min-h-screen container mx-auto p-4 space-y-4">
            <section className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-12 lg:col-span-8 space-y-3">
                    <div>
                        <h1 className="text-3xl font-bold">Katalog</h1>
                        <p className="text-sm text-muted-foreground">
                            {loading ? "Laden…" : `${produkte.length} Produkte`}
                        </p>
                    </div>

                    <Tabs value={selectedKat} onValueChange={(value) => setSelectedKat(value as (typeof KATS)[number])}>
                        <TabsList className="flex flex-wrap gap-1 rounded-xl bg-permdal-50/60 border border-permdal-100 p-1">
                            {KATS.map((kategorie) => (
                                <TabsTrigger
                                    key={kategorie}
                                    value={kategorie}
                                    className="rounded-lg px-3 py-1.5 text-sm data-[state=active]:bg-permdal-200/60 data-[state=active]:text-permdal-900 data-[state=active]:shadow-sm hover:bg-permdal-100/40 transition"
                                >
                                    {kategorie}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <div className="flex flex-col gap-2 rounded-xl border bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-2 shadow-sm lg:sticky lg:top-2" role="region" aria-label="Ansicht & Suche">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    className="pl-8 w-full"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Suche (Name oder Sorte)…"
                                    aria-label="Produkte suchen"
                                />
                            </div>

                            <Tabs value={view} onValueChange={(value) => setView(value as ViewMode)}>
                                <TabsList className="flex gap-1 rounded-lg bg-permdal-50/60 border border-permdal-100 p-1">
                                    <TabsTrigger value="cards" className="rounded-md px-3 py-1.5 text-sm shrink-0 data-[state=active]:bg-permdal-200/60 data-[state=active]:text-permdal-900 data-[state=active]:shadow-sm hover:bg-permdal-100/40 transition">
                                        Karten
                                    </TabsTrigger>
                                    <TabsTrigger value="table" className="rounded-md px-3 py-1.5 text-sm shrink-0 data-[state=active]:bg-permdal-200/60 data-[state=active]:text-permdal-900 data-[state=active]:shadow-sm hover:bg-permdal-100/40 transition">
                                        Tabelle
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </section>

            {view === "cards" ? (
                <CardsView produkte={produkte} angeboteCount={angeboteCount} />
            ) : (
                <TableView produkte={produkte} angeboteCount={angeboteCount} />
            )}
        </main>
    );
}

function CardsView({
    produkte,
    angeboteCount,
}: {
    produkte: Produkt[];
    angeboteCount: Record<string, number>;
}) {
    return (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {produkte.map((produkt) => (
                <article key={produkt.id} className="rounded-xl border bg-white p-4 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 rounded-md">
                                {produkt.imageId ? (
                                    <AvatarImage src={getProduktImagePreviewUrl({ imageId: produkt.imageId, width: 160, height: 160 })} alt={produkt.name} />
                                ) : (
                                    <AvatarFallback className="bg-permdal-100 text-permdal-800">
                                        FB
                                    </AvatarFallback>
                                )}
                            </Avatar>

                            <Button variant="ghost" className="text-left font-semibold hover:underline px-0" onClick={() => { }} title="Produktseite (bald)">
                                {produkt.name}{produkt.sorte ? ` – ${produkt.sorte}` : ""}
                            </Button>
                        </div>

                        <AngeboteModal
                            produktId={produkt.id}
                            produktName={produkt.name}
                            produktSorte={produkt.sorte}
                            produktAngebote={angeboteCount[produkt.id] ?? 0}
                        />
                    </div>

                    <div className="text-sm text-muted-foreground">
                        {produkt.unterkategorie || "–"}
                    </div>

                    <Saisonalitaet months={produkt.saisonalitaet} />
                </article>
            ))}
        </section>
    );
}

function TableView({
    produkte,
    angeboteCount,
}: {
    produkte: Produkt[];
    angeboteCount: Record<string, number>;
}) {
    return (
        <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
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
                    {produkte.map((produkt) => {
                        const count = angeboteCount[produkt.id] ?? 0;
                        const hasAngebote = count > 0;
                        return (
                            <TableRow key={produkt.id}>
                                <TableCell className="font-medium">
                                    <button type="button" className="hover:underline" onClick={() => { }} title="Produktseite (bald)">
                                        {produkt.name}{produkt.sorte ? ` – ${produkt.sorte}` : ""}
                                    </button>
                                </TableCell>
                                <TableCell>{produkt.hauptkategorie}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {produkt.unterkategorie || "–"}
                                </TableCell>
                                <TableCell>
                                    <span className={[
                                        "text-xs px-2 py-1 rounded-full",
                                        hasAngebote ? "bg-permdal-100 text-permdal-900" : "bg-permdal-200 text-permdal-600",
                                    ].join(" ")}>
                                        {hasAngebote ? `${count} Angebote` : "Keine"}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <Saisonalitaet months={produkt.saisonalitaet} />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

function useDebounce<T>(value: T, delay = 300) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setV(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return v;
}

function Saisonalitaet({ months }: { months: number[] }) {
    const segments = useMemo(() => computeSegments(months), [months]);
    const monthWidth = 100 / 12;

    return (
        <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-1">Saisonalität</div>

            <div className="relative">
                <div className="grid grid-cols-12 gap-px h-8">
                    {Array.from({ length: 12 }, (_, index) => (
                        <div key={index} className="bg-muted/60 rounded-[2px] flex items-center justify-center">
                            <span className="text-[10px] leading-none text-muted-foreground">
                                {shortMonth(index + 1)}
                            </span>
                        </div>
                    ))}
                </div>

                {segments.map((segment, index) => (
                    <div
                        key={index}
                        className="absolute top-1/2 -translate-y-1/2 h-3 bg-green-500/60 rounded-full ring-1 ring-green-600/20"
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
    return ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"][value - 1] ?? String(value);
}

function shortMonth(value: number) {
    return ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][value - 1] ?? String(value);
}
