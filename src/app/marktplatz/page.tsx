"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, Euro, Filter, Package, Search as SearchIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    getProduktImagePreviewUrl,
    listProdukteMitStaffeln,
    type ProduktMitAngeboten,
} from "@/lib/appwrite/appwriteProducts";

type AngebotMitProdukt = Staffel & {
    produkt: Produkt;
};

type SortOption = "date" | "price" | "name" | "availability";
type FilterOption = "all" | "available" | "low-stock";

const KATS = ["Obst", "Gemüse", "Kräuter", "Maschine", "Sonstiges"] as const;

export default function MarktplatzPage() {
    const [angebote, setAngebote] = useState<AngebotMitProdukt[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("date");
    const [filterBy, setFilterBy] = useState<FilterOption>("all");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [selectedKat, setSelectedKat] = useState<(typeof KATS)[number]>("Obst");

    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        let cancelled = false;

        async function loadAngebote() {
            setLoading(true);
            try {
                const produktMitAngeboten = await listProdukteMitStaffeln();
                if (cancelled) {
                    return;
                }

                const combined = produktMitAngeboten.flatMap((entry: ProduktMitAngeboten) =>
                    entry.angebote.map((angebot) => ({
                        ...angebot,
                        produkt: entry.produkt,
                    })),
                );
                setAngebote(combined);
            } catch (error) {
                console.error("Error loading angebote:", error);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadAngebote();

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredAndSortedAngebote = useMemo(() => {
        let filtered = angebote.filter((angebot) => angebot.produkt.hauptkategorie === selectedKat);

        if (debouncedSearch.trim()) {
            const searchLower = debouncedSearch.toLowerCase();
            filtered = filtered.filter(
                (angebot) =>
                    angebot.produkt.name.toLowerCase().includes(searchLower) ||
                    angebot.produkt.sorte.toLowerCase().includes(searchLower) ||
                    angebot.produkt.hauptkategorie.toLowerCase().includes(searchLower),
            );
        }

        if (filterBy === "available") {
            filtered = filtered.filter((angebot) => angebot.mengeVerfuegbar > 0);
        } else if (filterBy === "low-stock") {
            filtered = filtered.filter((angebot) => angebot.mengeVerfuegbar > 0 && angebot.mengeVerfuegbar <= 10);
        }

        return [...filtered].sort((left, right) => {
            let comparison = 0;
            switch (sortBy) {
                case "date":
                    comparison = new Date(left.saatPflanzDatum).getTime() - new Date(right.saatPflanzDatum).getTime();
                    break;
                case "price":
                    comparison = left.euroPreis - right.euroPreis;
                    break;
                case "name":
                    comparison = left.produkt.name.localeCompare(right.produkt.name, "de");
                    break;
                case "availability":
                    comparison = left.mengeVerfuegbar - right.mengeVerfuegbar;
                    break;
            }
            return sortOrder === "asc" ? comparison : -comparison;
        });
    }, [angebote, debouncedSearch, filterBy, selectedKat, sortBy, sortOrder]);

    return (
        <main className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-permdal-900">Marktplatz</h1>
                    <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
                        Aktuelle Angebote aus der Ostprignitz
                    </p>
                    <div className="flex justify-center mt-4">
                        <Link to="/produkte">
                            <Button variant="outline" size="sm" className="text-permdal-700 border-permdal-200 hover:bg-permdal-50 text-xs sm:text-sm">
                                Alle Produkte anzeigen
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="flex justify-center">
                    <Tabs value={selectedKat} onValueChange={(value) => setSelectedKat(value as (typeof KATS)[number])}>
                        <TabsList className="flex flex-wrap gap-1 rounded-xl bg-permdal-50/60 border border-permdal-100 p-1">
                            {KATS.map((kategorie) => (
                                <TabsTrigger
                                    key={kategorie}
                                    value={kategorie}
                                    className="rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm data-[state=active]:bg-permdal-200/60 data-[state=active]:text-permdal-900 data-[state=active]:shadow-sm hover:bg-permdal-100/40 transition"
                                >
                                    {kategorie}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="relative w-full">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-10"
                            placeholder="Nach Produkt, Sorte oder Kategorie suchen..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

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
                            <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="w-[40px] text-xs sm:text-sm">
                                {sortOrder === "asc" ? "↑" : "↓"}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="text-xs sm:text-sm text-muted-foreground">
                    {loading
                        ? "Laden..."
                        : filteredAndSortedAngebote.length === 1
                            ? "1 Angebot gefunden"
                            : `${filteredAndSortedAngebote.length} Angebote gefunden`}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <Card key={index} className="animate-pulse border border-surface-outline bg-surface-card">
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
                            <Card key={angebot.id} className="border border-surface-outline bg-surface-card shadow-brand-soft transition-shadow hover:shadow-brand-strong">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg">
                                                {angebot.produkt.imageId ? (
                                                    <AvatarImage
                                                        src={getProduktImagePreviewUrl({ imageId: angebot.produkt.imageId, width: 160, height: 160 })}
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
                                        <Link to="/angebote/$id" params={{ id: angebot.id }}>
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

function getAvailabilityColor(menge: number) {
    if (menge === 0) return "bg-red-100 text-red-800";
    if (menge <= 10) return "bg-yellow-100 text-yellow-800";
    return "bg-permdal-100 text-permdal-800";
}

function getAvailabilityText(menge: number) {
    if (menge === 0) return "Ausverkauft";
    if (menge <= 10) return "Nur noch wenige";
    return "Verfügbar";
}

function formatPricePerUnit(euroPreis: number, menge: number, einheit: string) {
    if (einheit.toLowerCase() === "gramm" && menge >= 1000) {
        return `${euroPreis.toFixed(2)} / kg`;
    }
    if (menge === 1 && einheit.toLowerCase() === "stück") {
        return `${euroPreis.toFixed(2)} / Stück`;
    }
    return `${euroPreis.toFixed(2)} € / ${menge} ${einheit}`;
}

function formatHarvestRange(ernteProjektion: string[]) {
    if (!ernteProjektion.length) return null;
    if (ernteProjektion.length === 1) {
        return new Date(ernteProjektion[0]).toLocaleDateString("de-DE");
    }
    const startDate = new Date(ernteProjektion[0]).toLocaleDateString("de-DE");
    const endDate = new Date(ernteProjektion[ernteProjektion.length - 1]).toLocaleDateString("de-DE");
    return `${startDate} - ${endDate}`;
}

function useDebounce<T>(value: T, delay = 300) {
    const [current, setCurrent] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setCurrent(value), delay);
        return () => clearTimeout(timer);
    }, [delay, value]);
    return current;
}
