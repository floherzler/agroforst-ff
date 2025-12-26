"use client";

import { useEffect, useState } from "react";
import { client } from "@/models/client/config";
import env from "@/app/env";

type Angebot = {
    $id: string;
    mengeVerfuegbar: number;
    einheit: string;
    menge: number;
    euroPreis: number;
};

export default function AngebotLive({ initial }: { initial: Angebot }) {
    const [angebot, setAngebot] = useState<Angebot>(initial);

    useEffect(() => {
        const db = env.appwrite.db;
        const coll = env.appwrite.angebote_collection_id;
        const channel = `databases.${db}.collections.${coll}.documents.${initial.$id}`;

        const unsubscribe = client.subscribe(channel, (response) => {
            const eventType = response.events[0];
            const changed = response.payload as Angebot;

            if (eventType.includes("update")) {
                setAngebot((prev) => ({ ...prev, ...changed }));
            }
        });

        return () => unsubscribe();
    }, [initial.$id]);

    return (
        <div className="space-y-2">
            <p>
                <span className="font-semibold">Menge verfügbar:</span>{" "}
                {angebot.mengeVerfuegbar} {angebot.einheit}
            </p>
            <p>
                <span className="font-semibold">Preis:</span>{" "}
                {(() => {
                    let menge = angebot.menge;
                    let einheit = angebot.einheit;
                    if (menge >= 1000 && einheit.toLowerCase() === "gramm") {
                        menge = menge / 1000;
                        einheit = "kg";
                    }
                    return `${angebot.euroPreis.toFixed(2)} € / ${menge} ${einheit}`;
                })()}
            </p>
        </div>
    );
}
