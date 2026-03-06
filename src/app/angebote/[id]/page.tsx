"use client";

import React from "react";
import { useParams } from "@tanstack/react-router";
import AngebotLive from "@/components/AngebotLive";
import OrderDialog from "@/components/OrderDialog";
import { getStaffelById } from "@/lib/appwrite/appwriteProducts";

export default function AngebotPage() {
    const { id } = useParams({ from: "/angebote/$id" });
    const [angebot, setAngebot] = React.useState<Staffel | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;

        async function loadAngebot() {
            try {
                const record = await getStaffelById(id);
                if (!cancelled) {
                    setAngebot(record);
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

    return (
        <main className="container mx-auto p-6 max-w-2xl">
            <h1 className="text-2xl font-bold mb-4">Angebot {id}</h1>

            <div className="rounded-lg border bg-white p-6 shadow-sm space-y-3">
                {/* 👇 hydration: static props + realtime updates */}
                <AngebotLive
                    initial={{
                        ...angebot,
                    }}
                />

                <p>
                    <span className="font-semibold">Saat-/Pflanzdatum:</span>{" "}
                    {new Date(angebot.saatPflanzDatum).toLocaleDateString("de-DE")}
                </p>
                {angebot.ernteProjektion?.length > 0 && (
                    <p>
                        <span className="font-semibold">Ernteprojektion:</span>{" "}
                        {angebot.ernteProjektion
                            .map((d: string) => new Date(d).toLocaleDateString("de-DE"))
                            .join(" - ")}
                    </p>
                )}
            </div>

            <div className="mt-6">
                <OrderDialog angebotId={id} />
            </div>
        </main>
    );
}
