"use client";

import { useEffect, useMemo, useState } from "react";
import { databases } from "@/models/client/config";
import env from "@/app/env";
import { Query, Models } from "appwrite";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Calendar, Package, Euro, Filter } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { storage } from "@/models/client/config";

type Angebot = {
    $id: string;
    $createdAt: string;
    produktID: string;
    mengeVerfuegbar: number;
    einheit: string;
    menge: number;
    euroPreis: number;
    saatPflanzDatum: string;
    ernteProjektion?: string[];
    mengeAbgeholt: number;
};

type Produkt = {
    $id: string;
    name: string;
    sorte?: string;
    hauptkategorie: string;
    unterkategorie?: string;
    imageID?: string;
};

type AngebotWithProdukt = Angebot & {
    produkt: Produkt;
};

const DB = env.appwrite.db;
const ANGEBOTE = env.appwrite.angebote_collection_id;
const PRODUKTE = env.appwrite.produce_collection_id;
const STORAGE_BUCKET = env.appwrite.storage;

type SortOption = "date" | "price" | "name" | "availability";
type FilterOption = "all" | "available" | "low-stock";

// Exact values from your DB:
const KATS = ["Obst", "Gemüse", "Kräuter", "Maschine", "Sonstiges"] as const;

export default function MarktplatzPage() {
    const [angebote, setAngebote] = useState<AngebotWithProdukt[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("date");
    const [filterBy, setFilterBy] = useState<FilterOption>("all");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [selectedKat, setSelectedKat] = useState<(typeof KATS)[number]>("Obst");

    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        async function loadAngebote() {
            setLoading(true);
            try {
                // Get all angebote
                const angeboteRes = await databases.listDocuments(DB, ANGEBOTE, [
                    Query.limit(500),
                    Query.orderDesc("$createdAt"),
                ]);

                // Get all produkte for mapping
                const produkteRes = await databases.listDocuments(DB, PRODUKTE, [
                    Query.limit(500),
                ]);

                // Create a map of produkte by ID
                const produkteMap = new Map<string, Produkt>();
                produkteRes.documents.forEach((doc: Models.Document) => {
                    produkteMap.set(doc.$id, {
                        $id: doc.$id,
                        name: doc.name,
                        sorte: doc.sorte,
                        hauptkategorie: doc.hauptkategorie,
                        unterkategorie: doc.unterkategorie,
                        imageID: doc.imageID,
                    });
                });

                // Combine angebote with their produkte
                const combined = angeboteRes.documents
                    .map((doc: Models.Document): AngebotWithProdukt | null => {
                        const produkt = produkteMap.get(doc.produktID);
                        if (!produkt) return null; // Skip if no matching produkt found

                        return {
                            $id: doc.$id,
                            $createdAt: doc.$createdAt,
                            produktID: doc.produktID,
                            mengeVerfuegbar: doc.mengeVerfuegbar,
                            einheit: doc.einheit,
                            menge: doc.menge,
                            euroPreis: doc.euroPreis,
                            saatPflanzDatum: doc.saatPflanzDatum,
                            ernteProjektion: doc.ernteProjektion,
                            mengeAbgeholt: doc.mengeAbgeholt,
                            produkt: produkt,
                        };
                    })
                    .filter((item): item is AngebotWithProdukt => item !== null);

                setAngebote(combined);
            } catch (error) {
                console.error("Error loading angebote:", error);
            } finally {
                setLoading(false);
            }
        }

        loadAngebote();
    }, []);

    // Filter and sort angebote
    const filteredAndSortedAngebote = useMemo(() => {
        let filtered = angebote;

        // Apply category filter
        filtered = filtered.filter((a) => a.produkt.hauptkategorie === selectedKat);

        // Apply search filter
        if (debouncedSearch.trim()) {
            const searchLower = debouncedSearch.toLowerCase();
            filtered = filtered.filter(
                (a) =>
                    a.produkt.name.toLowerCase().includes(searchLower) ||
                    (a.produkt.sorte && a.produkt.sorte.toLowerCase().includes(searchLower)) ||
                    a.produkt.hauptkategorie.toLowerCase().includes(searchLower)
            );
        }

        // Apply availability filter
        if (filterBy === "available") {
            filtered = filtered.filter((a) => a.mengeVerfuegbar > 0);
        } else if (filterBy === "low-stock") {
            filtered = filtered.filter((a) => a.mengeVerfuegbar > 0 && a.mengeVerfuegbar <= 10);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case "date":
                    comparison = new Date(a.saatPflanzDatum).getTime() - new Date(b.saatPflanzDatum).getTime();
                    break;
                case "price":
                    comparison = a.euroPreis - b.euroPreis;
                    break;
                case "name":
                    comparison = a.produkt.name.localeCompare(b.produkt.name, "de");
                    break;
                case "availability":
                    comparison = a.mengeVerfuegbar - b.mengeVerfuegbar;
                    break;
            }
            return sortOrder === "asc" ? comparison : -comparison;
        });

        return filtered;
    }, [angebote, debouncedSearch, sortBy, sortOrder, filterBy, selectedKat]);

    const getAvailabilityColor = (menge: number) => {
        if (menge === 0) return "bg-red-100 text-red-800";
        if (menge <= 10) return "bg-yellow-100 text-yellow-800";
        return "bg-permdal-100 text-permdal-800";
    };

    const getAvailabilityText = (menge: number) => {
        if (menge === 0) return "Ausverkauft";
        if (menge <= 10) return "Nur noch wenige";
        return "Verfügbar";
    };

    const formatPricePerUnit = (euroPreis: number, menge: number, einheit: string) => {
        const displayMenge = menge;
        const displayEinheit = einheit;

        // Convert grams to kg if >= 1000
        if (einheit.toLowerCase() === "gramm" && menge >= 1000) {
            return `${euroPreis.toFixed(2)} / kg`;
        }

        // For single units, omit the number
        if (menge === 1 && einheit.toLowerCase() === "stück") {
            return `${euroPreis.toFixed(2)} / Stück`;
        }

        return `${euroPreis.toFixed(2)} € / ${displayMenge} ${displayEinheit}`;
    };

    const formatHarvestRange = (ernteProjektion: string[] | undefined) => {
        if (!ernteProjektion || ernteProjektion.length === 0) return null;

        if (ernteProjektion.length === 1) {
            return new Date(ernteProjektion[0]).toLocaleDateString("de-DE");
        }

        const startDate = new Date(ernteProjektion[0]).toLocaleDateString("de-DE");
        const endDate = new Date(ernteProjektion[ernteProjektion.length - 1]).toLocaleDateString("de-DE");
        return `${startDate} - ${endDate}`;
    };

    return (
        <main className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-permdal-900">Marktplatz</h1>
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
                    Aktuelle Angebote aus der Ostprignitz
                </p>
                <div className="flex justify-center mt-4">
                    <Link href="/produkte" passHref>
                        <Button variant="outline" size="sm" className="text-permdal-700 border-permdal-200 hover:bg-permdal-50 text-xs sm:text-sm">
                            Alle Produkte anzeigen
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Category tabs */}
            <div className="flex justify-center">
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
                                className={
                                    `rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm
              data-[state=active]:bg-permdal-200/60
              data-[state=active]:text-permdal-900
              data-[state=active]:shadow-sm
              hover:bg-permdal-100/40 transition`
                                }
                            >
                                {k}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4">
                {/* Search */}
                <div className="relative w-full">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-10"
                        placeholder="Nach Produkt, Sorte oder Kategorie suchen..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Filters and Sort */}
                <div className="flex flex-wrap gap-2">
                    <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
                        <SelectTrigger className="w-full sm:w-[140px] text-xs sm:text-sm">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-card">
                            <SelectItem value="all">Alle Angebote</SelectItem>
                            <SelectItem value="available">Verfügbar</SelectItem>
                            <SelectItem value="low-stock">Nur noch wenige</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                        <SelectTrigger className="w-full sm:w-[140px] text-xs sm:text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-card">
                            <SelectItem value="date">Nach Datum</SelectItem>
                            <SelectItem value="price">Nach Preis</SelectItem>
                            <SelectItem value="name">Nach Name</SelectItem>
                            <SelectItem value="availability">Nach Verfügbarkeit</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center h-full">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            className="w-[40px] text-xs sm:text-sm"
                        >
                            {sortOrder === "asc" ? "↑" : "↓"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Results count */}
            <div className="text-xs sm:text-sm text-muted-foreground">
                {loading
                    ? "Laden..."
                    : filteredAndSortedAngebote.length === 1
                        ? "1 Angebot gefunden"
                        : `${filteredAndSortedAngebote.length} Angebote gefunden`
                }
            </div>

            {/* Angebote Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="animate-pulse border border-surface-outline bg-surface-card">
                            <CardHeader>
                                <div className="h-4 bg-muted rounded w-3/4"></div>
                                <div className="h-3 bg-muted rounded w-1/2"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="h-3 bg-muted rounded"></div>
                                    <div className="h-3 bg-muted rounded w-2/3"></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredAndSortedAngebote.map((angebot) => (
                        <Card
                            key={angebot.$id}
                            className="border border-surface-outline bg-surface-card shadow-brand-soft transition-shadow hover:shadow-brand-strong"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg">
                                            {angebot.produkt.imageID ? (
                                                <AvatarImage
                                                    src={storage.getFilePreview(STORAGE_BUCKET, angebot.produkt.imageID, 160, 160)}
                                                    alt={angebot.produkt.name}
                                                />
                                            ) : (
                                                <AvatarFallback className="bg-permdal-100 text-permdal-800 rounded-lg text-xs sm:text-sm">
                                                    {angebot.produkt.name.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            )}
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <CardTitle className="text-sm sm:text-lg truncate">
                                                {angebot.produkt.name}
                                                {angebot.produkt.sorte && (
                                                    <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                                                        {" "}
                                                        – {angebot.produkt.sorte}
                                                    </span>
                                                )}
                                            </CardTitle>
                                            <CardDescription className="text-xs sm:text-sm truncate">
                                                {angebot.produkt.unterkategorie}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge className={`${getAvailabilityColor(angebot.mengeVerfuegbar)} text-xs`}>
                                        {getAvailabilityText(angebot.mengeVerfuegbar)}
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        <span>
                                            {angebot.mengeVerfuegbar} {angebot.einheit} verfügbar
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-permdal-700">
                                        <Euro className="h-4 w-4" />
                                        <span>
                                            {formatPricePerUnit(angebot.euroPreis, angebot.menge, angebot.einheit)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                        Saat-/Pflanzdatum: {new Date(angebot.saatPflanzDatum).toLocaleDateString("de-DE")}
                                    </span>
                                </div>

                                {formatHarvestRange(angebot.ernteProjektion) && (
                                    <div className="text-sm text-muted-foreground">
                                        <span className="font-medium">Nächste Ernte:</span>{" "}
                                        {formatHarvestRange(angebot.ernteProjektion)}
                                    </div>
                                )}

                                <div className="pt-2">
                                    <Link href={`/angebote/${angebot.$id}`} passHref>
                                        <Button className="w-full bg-permdal-600 hover:bg-permdal-700 shadow-brand-soft">
                                            Details anzeigen
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {!loading && filteredAndSortedAngebote.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-muted-foreground text-lg">
                        Keine Angebote gefunden
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                        Versuchen Sie andere Suchbegriffe oder Filter
                    </p>
                </div>
            )}
            </div>
        </main>
    );
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
