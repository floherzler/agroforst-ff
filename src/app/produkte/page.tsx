// app/produkte/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { databases } from "@/models/client/config";
import env from "@/app/env";
import { Query, Models } from "appwrite";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";


import AngeboteModal from "@/components/AngeboteModal";
import { Button } from "@/components/ui/button";

import { storage } from "@/models/client/config";

type Produkt = {
    $id: string;
    $createdAt: string;
    name: string;
    sorte?: string;
    hauptkategorie: "Obst" | "Gemüse" | "Kräuter" | "Maschine" | "Sonstiges" | string;
    unterkategorie?: string;
    lebensdauer?: string;
    fruchtfolge_vor?: string[];
    fruchtfolge_nach?: string[];
    bodenansprueche?: string[];
    begleitpflanzen?: string[];
    saisonalitaet?: number[]; // 1..12
    imageID?: string;
};

type Angebot = Models.Document & { produktID: string };

const DB = env.appwrite.db;
const PRODUKTE = env.appwrite.produce_collection_id;
const ANGEBOTE = env.appwrite.angebote_collection_id;
const STORAGE_BUCKET = env.appwrite.storage;

// Exact values from your DB:
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
        (async () => {
            setLoading(true);
            try {
                const base = [Query.equal("hauptkategorie", selectedKat), Query.limit(200)];
                let list: Produkt[] = [];

                if (debouncedSearch.trim().length > 0) {
                    // OR-Suche über name ODER sorte -> zwei Requests, clientseitig mergen
                    const [byName] = await Promise.all([
                        databases.listDocuments(DB, PRODUKTE, [
                            ...base, Query.search("name", debouncedSearch.trim()),
                        ]),
                    ]);
                    list = dedupeById([...byName.documents,]).map(mapProdukt);
                    // optional sort by name
                    list.sort((a, b) => a.name.localeCompare(b.name, "de"));
                } else {
                    const prodRes = await databases.listDocuments(DB, PRODUKTE, [
                        ...base, Query.orderAsc("name"),
                    ]);
                    list = prodRes.documents.map(mapProdukt);
                }

                setProdukte(list);

                // Angebote-Counts für sichtbare Produkte
                if (list.length) {
                    const ids = list.map((p) => p.$id);
                    const anRes = await databases.listDocuments(DB, ANGEBOTE, [
                        Query.equal("produktID", ids),
                        Query.limit(500),
                    ]);
                    const map: Record<string, number> = {};
                    (anRes.documents as Angebot[]).forEach((d) => {
                        map[d.produktID] = (map[d.produktID] ?? 0) + 1;
                    });
                    setAngeboteCount(map);
                } else {
                    setAngeboteCount({});
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [selectedKat, debouncedSearch]);

    return (
        <main className="min-h-screen container mx-auto p-4 space-y-4">
            {/* Top bar: title + search + view switch */}
            {/* --- Top controls (title+tabs on left, single toolbar on right) --- */}
            <section className="grid grid-cols-12 gap-4 items-start">
                {/* Left: Title + count + Category tabs */}
                <div className="col-span-12 lg:col-span-8 space-y-3">
                    <div>
                        <h1 className="text-3xl font-bold">Katalog</h1>
                        <p className="text-sm text-muted-foreground">
                            {loading ? "Laden…" : `${produkte.length} Produkte`}
                        </p>
                    </div>

                    {/* Category tabs */}
                    <Tabs value={selectedKat} onValueChange={(v) => setSelectedKat(v as (typeof KATS)[number])}>
                        <TabsList
                            className="
          flex flex-wrap gap-1 rounded-xl
          bg-permdal-50/60 border border-permdal-100 p-1
        "
                        >
                            {KATS.map((k) => (
                                <TabsTrigger
                                    key={k}
                                    value={k}
                                    className="
              rounded-lg px-3 py-1.5 text-sm
              data-[state=active]:bg-permdal-200/60
              data-[state=active]:text-permdal-900
              data-[state=active]:shadow-sm
              hover:bg-permdal-100/40 transition
            "
                                >
                                    {k}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>

                {/* Right: Single toolbar (Search + View switch) */}
                <div className="col-span-12 lg:col-span-4">
                    <div
                        className="
        flex flex-col gap-2 rounded-xl border bg-white/70
        backdrop-blur supports-[backdrop-filter]:bg-white/60
        p-2 shadow-sm lg:sticky lg:top-2
      "
                        role="region"
                        aria-label="Ansicht & Suche"
                    >
                        <div className="flex items-center gap-2">
                            {/* Search */}
                            <div className="relative flex-1">
                                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    className="pl-8 w-full"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Suche (Name oder Sorte)…"
                                    aria-label="Produkte suchen"
                                />
                            </div>

                            {/* View switch */}
                            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                                <TabsList
                                    className="
              flex gap-1 rounded-lg
              bg-permdal-50/60 border border-permdal-100 p-1
            "
                                >
                                    <TabsTrigger
                                        value="cards"
                                        className="
                rounded-md px-3 py-1.5 text-sm shrink-0
                data-[state=active]:bg-permdal-200/60
                data-[state=active]:text-permdal-900
                data-[state=active]:shadow-sm
                hover:bg-permdal-100/40 transition
              "
                                    >
                                        Karten
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="table"
                                        className="
                                rounded-md px-3 py-1.5 text-sm shrink-0
                                data-[state=active]:bg-permdal-200/60
                                data-[state=active]:text-permdal-900
                                data-[state=active]:shadow-sm
                                hover:bg-permdal-100/40 transition
                            "
                                    >
                                        Tabelle
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </section>



            {/* Content */}
            {
                view === "cards" ? (
                    <CardsView produkte={produkte} angeboteCount={angeboteCount} />
                ) : (
                    <TableView produkte={produkte} angeboteCount={angeboteCount} />
                )
            }

        </main >
    );
}

/* ---------- Views ---------- */

function CardsView({
    produkte, angeboteCount,
}: { produkte: Produkt[]; angeboteCount: Record<string, number> }) {
    produkte.forEach((p) => {
        console.log("Produkt", p.name, "imageId:", p.imageID);
    });

    return (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {produkte.map((p) => {
                return (
                    <article
                        key={p.$id}
                        className="rounded-xl border bg-white p-4 shadow-sm flex flex-col gap-2"
                    >
                        {/* Header with Avatar + Name + Angebote */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12 rounded-md">
                                    {p.imageID ? (
                                        <AvatarImage
                                            src={storage.getFilePreview(STORAGE_BUCKET, p.imageID, 160, 160)}
                                            alt={p.name}
                                        />
                                    ) : (
                                        <AvatarFallback className="bg-permdal-100 text-permdal-800">
                                            {'FB'}
                                        </AvatarFallback>
                                    )}
                                </Avatar>

                                <Button
                                    variant="ghost"
                                    className="text-left font-semibold hover:underline px-0"
                                    onClick={() => { }}
                                    title="Produktseite (bald)"
                                >
                                    {p.name}{p.sorte ? ` – ${p.sorte}` : ""}
                                </Button>
                            </div>

                            <AngeboteModal
                                produktId={p.$id}
                                produktName={p.name}
                                produktSorte={p.sorte}
                                produktAngebote={angeboteCount[p.$id] ?? 0}
                            />
                        </div>

                        {/* Unterkategorie */}
                        <div className="text-sm text-muted-foreground">
                            {p.unterkategorie ?? "–"}
                        </div>

                        {/* Saisonbalken */}
                        <Saisonalitaet months={p.saisonalitaet ?? []} />
                    </article>

                );
            })}
        </section>
    );
}

function TableView({
    produkte, angeboteCount,
}: { produkte: Produkt[]; angeboteCount: Record<string, number> }) {
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
                    {produkte.map((p) => {
                        const count = angeboteCount[p.$id] ?? 0;
                        const hasAngebote = count > 0;
                        return (
                            <TableRow key={p.$id}>
                                <TableCell className="font-medium">
                                    <button
                                        type="button"
                                        className="hover:underline"
                                        onClick={() => { }}
                                        title="Produktseite (bald)"
                                    >
                                        {p.name}{p.sorte ? ` – ${p.sorte}` : ""}
                                    </button>
                                </TableCell>
                                <TableCell>{p.hauptkategorie}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {p.unterkategorie ?? "–"}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={[
                                            "text-xs px-2 py-1 rounded-full",
                                            hasAngebote ? "bg-permdal-100 text-permdal-900" : "bg-permdal-200 text-permdal-600",
                                        ].join(" ")}
                                    >
                                        {hasAngebote ? `${count} Angebote` : "Keine"}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <Saisonalitaet months={p.saisonalitaet ?? []} />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

/* ---------- Helpers ---------- */

type ProduktDoc = Models.Document & {
    hauptkategorie?: string;
    unterkategorie?: string;
    lebensdauer?: string;
    fruchtfolge_vor?: string[];
    fruchtfolge_nach?: string[];
    bodenansprueche?: string[];
    begleitpflanzen?: string[];
    saisonalitaet?: (number | string)[];
    imageID?: string;
};

function mapProdukt(doc: ProduktDoc): Produkt {
    const raw = Array.isArray(doc.saisonalitaet) ? doc.saisonalitaet : [];
    const saisonalitaet: number[] = [
        ...new Set<number>(
            raw.map((m) => (typeof m === "string" ? parseInt(m, 10) : m))
        )
    ]
        .filter((n): n is number => Number.isFinite(n) && n >= 1 && n <= 12)
        .sort((a, b) => a - b);

    return {
        $id: doc.$id,
        $createdAt: doc.$createdAt,
        name: doc.name,
        sorte: doc.sorte,
        hauptkategorie: doc.hauptkategorie,
        unterkategorie: doc.unterkategorie,
        lebensdauer: doc.lebensdauer,
        fruchtfolge_vor: doc.fruchtfolge_vor,
        fruchtfolge_nach: doc.fruchtfolge_nach,
        bodenansprueche: doc.bodenansprueche,
        begleitpflanzen: doc.begleitpflanzen,
        saisonalitaet,
        imageID: doc.imageID,
    };
}

function dedupeById<T extends { $id: string }>(docs: T[]) {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const d of docs) {
        if (!seen.has(d.$id)) { seen.add(d.$id); out.push(d); }
    }
    return out;
}

/** Debounce helper */
function useDebounce<T>(value: T, delay = 300) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
}

/** Season bands (supports gaps + wrap-around) */
function Saisonalitaet({ months }: { months: number[] }) {
    const segments = useMemo(() => computeSegments(months), [months]);
    const monthWidth = 100 / 12;

    return (
        <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-1">Saisonalität</div>

            <div className="relative">
                {/* baseline cells */}
                <div className="grid grid-cols-12 gap-px h-8">
                    {Array.from({ length: 12 }, (_, i) => (
                        <div key={i} className="bg-muted/60 rounded-[2px] flex items-center justify-center">
                            <span className="text-[10px] leading-none text-muted-foreground">
                                {shortMonth(i + 1)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* active bands */}
                {segments.map((seg, idx) => (
                    <div
                        key={idx}
                        className="
              absolute top-1/2 -translate-y-1/2 h-3
              bg-green-500/60 rounded-full
              ring-1 ring-green-600/20
            "
                        style={{
                            left: `${(seg.start - 1) * monthWidth}%`,
                            width: `${seg.len * monthWidth}%`,
                        }}
                        aria-label={`Saison von ${monthName(seg.start)} bis ${monthName(endOf(seg))}`}
                        title={`Saison: ${monthName(seg.start)} – ${monthName(endOf(seg))}`}
                    />
                ))}
            </div>
        </div>
    );
}

function computeSegments(months: number[]) {
    const present = new Array<boolean>(13).fill(false);
    months.forEach((m) => {
        if (Number.isFinite(m) && m >= 1 && m <= 12) present[m] = true;
    });

    const segs: { start: number; len: number }[] = [];
    for (let m = 1; m <= 12; m++) {
        const prev = m === 1 ? 12 : m - 1;
        if (present[m] && !present[prev]) {
            let len = 1;
            let k = m === 12 ? 1 : m + 1;
            while (present[k] && k !== m) {
                len++;
                k = k === 12 ? 1 : k + 1;
                if (len >= 12) break;
            }
            segs.push({ start: m, len });
        }
    }
    return segs;
}

function endOf(seg: { start: number; len: number }) {
    return ((seg.start + seg.len - 2) % 12) + 1;
}
function monthName(n: number) {
    return ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"][n - 1] ?? String(n);
}
function shortMonth(n: number) {
    return ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][n - 1] ?? String(n);
}
