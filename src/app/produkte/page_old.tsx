"use client";

import { useEffect, useState } from "react";
import { listAlleProdukte } from "@/lib/appwrite/appwriteProducts";
import ProduktListe from "@/components/ProductList";

export default function Page() {
  const [produkte, setProdukte] = useState<Produkt[] | null>(null);

  useEffect(() => {
    async function load() {
      console.log("Fetching staffeln on the client…");
      setProdukte(await listAlleProdukte());
    }
    load();
  }, []);

  if (!produkte) {
    return <div>Loading…</div>;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Produkte</h1>
        <a
          href="/staffeln"
          className="text-blue-500 hover:underline text-lg"
        >
          Zu den Staffeln
        </a>
      </div>
      <div className="w-full max-w-4xl">
        <ProduktListe initialProdukte={produkte} />
      </div>
    </main>
  );
}
