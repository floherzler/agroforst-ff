"use client";

import React from "react";
import { Sprout } from "lucide-react";
import { useParams } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import OrderDialog from "@/components/OrderDialog";
import { getOfferAvailabilityText, getProductImageUrl, getOfferPriceSummary } from "@/features/catalog/catalog";
import { displayProductName, displayValueLabel } from "@/features/zentrale/admin-domain";
import { getAngebotById, getProduktById, subscribeToAngebot } from "@/lib/appwrite/appwriteProducts";
import { formatOfferDate } from "@/lib/date";

export default function AngebotPage() {
    const { id } = useParams({ from: "/angebote/$id" });
    const [angebot, setAngebot] = React.useState<Angebot | null>(null);
    const [produkt, setProdukt] = React.useState<Produkt | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;

        async function loadAngebot() {
            try {
                const record = await getAngebotById(id);
                const productRecord = record.produktId ? await getProduktById(record.produktId) : null;
                if (!cancelled) {
                    setAngebot(record);
                    setProdukt(productRecord);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Angebot konnte nicht geladen werden.");
                }
            }
        }

        loadAngebot();

        return () => {
            cancelled = true;
        };
    }, [id]);

    React.useEffect(() => {
        if (!angebot?.id) {
            return;
        }

        const unsubscribe = subscribeToAngebot(angebot.id, ({ type, record }) => {
            if (type === "update") {
                setAngebot((current) => (current ? { ...current, ...record } : current));
            }
        });

        return () => unsubscribe();
    }, [angebot?.id]);

    if (error) {
        return (
            <main className="container mx-auto max-w-2xl p-6">
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
                    {error}
                </div>
            </main>
        );
    }

    if (!angebot) {
        return (
            <main className="container mx-auto max-w-2xl p-6">
                <div className="rounded-lg border bg-white p-6 shadow-sm">Angebot wird geladen...</div>
            </main>
        );
    }

    const imageUrl = getProductImageUrl(produkt?.imageId);
    const productName = displayProductName(produkt ?? undefined);
    const availabilityText = getOfferAvailabilityText(angebot.mengeVerfuegbar);

    return (
        <main className="container mx-auto max-w-4xl p-6">
            <section className="mb-6 overflow-hidden rounded-[2rem] border border-[var(--color-soil-900)]/10 bg-[linear-gradient(135deg,rgba(255,252,247,0.98),rgba(243,237,227,0.96))] shadow-[0_30px_80px_-48px_rgba(35,22,15,0.45)]">
                <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4 sm:gap-5">
                        <Avatar className="size-24 rounded-[1.8rem] border border-white/80 bg-[rgba(255,251,245,0.9)] shadow-[0_18px_40px_-28px_rgba(35,22,15,0.45)] sm:size-28">
                            {imageUrl ? <AvatarImage src={imageUrl} alt={productName} className="rounded-[1.8rem] object-cover" /> : null}
                            <AvatarFallback className="rounded-[1.8rem] bg-[rgba(194,214,180,0.45)] text-[var(--color-soil-700)]">
                                <Sprout />
                            </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                            <div className="mb-3 flex flex-wrap gap-2">
                                {produkt?.hauptkategorie ? (
                                    <Badge variant="outline">{displayValueLabel(produkt.hauptkategorie)}</Badge>
                                ) : null}
                                {angebot.year ? <Badge variant="secondary">Saison {angebot.year}</Badge> : null}
                                <Badge variant={angebot.mengeVerfuegbar > 0 ? "secondary" : "destructive"}>
                                    {availabilityText}
                                </Badge>
                            </div>
                            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-soil-900)] sm:text-4xl">
                                {productName}
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-soil-700)] sm:text-base">
                                {angebot.beschreibung?.trim() || "Saisonangebot aus dem Agroforst. Verfügbarkeit und Preise aktualisieren sich live."}
                            </p>
                        </div>
                    </div>

                    <div className="grid min-w-0 gap-3 rounded-[1.6rem] border border-[var(--color-soil-900)]/8 bg-[rgba(255,251,245,0.88)] p-4 sm:min-w-[18rem]">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-soil-600)]">
                                Verfügbar
                            </div>
                            <div className="mt-1 text-xl font-semibold text-[var(--color-soil-900)]">
                                {angebot.mengeVerfuegbar} {angebot.einheit}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-soil-600)]">
                                Preis
                            </div>
                            <div className="mt-1 text-base font-medium text-[var(--color-soil-900)]">
                                {getOfferPriceSummary(angebot)}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-soil-600)]">
                                Saat-/Pflanzdatum
                            </div>
                            <div className="mt-1 text-base font-medium text-[var(--color-soil-900)]">
                                {formatOfferDate(angebot.saatPflanzDatum)}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="mt-6">
                <OrderDialog angebot={angebot} />
            </div>
        </main>
    );
}
