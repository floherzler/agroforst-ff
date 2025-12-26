import { databases } from "@/models/client/config";
import env from "@/app/env";

// app/angebote/[id]/page.tsx
import AngebotLive from "@/components/AngebotLive";
import OrderDialog from "@/components/OrderDialog";

export default async function AngebotPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const angebot = await databases.getDocument(
        env.appwrite.db,
        env.appwrite.angebote_collection_id,
        id
    );


    return (
        <main className="container mx-auto p-6 max-w-2xl">
            <h1 className="text-2xl font-bold mb-4">Angebot {id}</h1>

            <div className="rounded-lg border bg-white p-6 shadow-sm space-y-3">
                {/* 👇 hydration: static props + realtime updates */}
                <AngebotLive
                    initial={{
                        ...angebot,
                        mengeVerfuegbar: angebot.mengeVerfuegbar,
                        einheit: angebot.einheit,
                        menge: angebot.menge,
                        euroPreis: angebot.euroPreis,
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
