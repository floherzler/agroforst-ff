// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { databases } from "@/models/client/config";
import env from "@/app/env";
import BestellungsList from "@/components/BestellungsList";

export default function Page() {
  const [bestellungen, setBestellungen] = useState<Bestellung[] | null>(null);

  useEffect(() => {
    async function load() {
      console.log("Fetching staffeln on the client…");
      const resp = await databases.listDocuments(
        env.appwrite.db,
        env.appwrite.order_collection_id
      );
      setBestellungen(
        resp.documents.map((doc) => ({
          $id: doc.$id,
          $createdAt: doc.$createdAt,
          userID: doc.userID,
          angebotID: doc.angebotID,
          menge: doc.menge,
          abholung: doc.abholung,
          preis_einheit: doc.preis_einheit,
          preis_gesamt: doc.preis_gesamt,
          einheit: doc.einheit,
          mitgliedschaftID: doc.mitgliedschaftID,
          produkt_name: doc.produkt_name,
          status: doc.status,
        }))
      );
    }
    load();
  }, []);

  if (!bestellungen) {
    return <div>Loading…</div>;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Bestellungen</h1>
        <a
          href="/produkte"
          className="text-blue-500 hover:underline text-lg"
        >
          Zu den Produkten
        </a>
      </div>
      <div className="w-full max-w-4xl">
        <BestellungsList initialBestellungen={bestellungen} />
      </div>
    </main>
  );
}
