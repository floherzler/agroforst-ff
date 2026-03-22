"use client";

import { useEffect, useState } from "react";

import { subscribeToAngebot } from "@/lib/appwrite/appwriteProducts";

export default function AngebotLive({ initial }: { initial: Angebot }) {
    const [angebot, setAngebot] = useState<Angebot>(initial);

    useEffect(() => {
        const unsubscribe = subscribeToAngebot(initial.id, ({ type, record }) => {
            if (type === "update") {
                setAngebot((prev) => ({ ...prev, ...record }));
            }
        });

        return () => unsubscribe();
    }, [initial.id]);

    return (
        <div className="space-y-2">
            <p>
                <span className="font-semibold">Menge verfügbar:</span>{" "}
                {angebot.mengeVerfuegbar} {angebot.einheit}
            </p>
            <p>
                <span className="font-semibold">Preis:</span>{" "}
                {`${angebot.euroPreis.toFixed(2)} € / ${angebot.einheit}`}
            </p>
        </div>
    );
}
