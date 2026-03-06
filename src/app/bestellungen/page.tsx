// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { listBestellungen } from "@/lib/appwrite/appwriteOrders";
import BestellungsList from "@/components/BestellungsList";

export default function Page() {
  const [bestellungen, setBestellungen] = useState<Bestellung[] | null>(null);

  useEffect(() => {
    async function load() {
      console.log("Fetching staffeln on the client…");
      setBestellungen(await listBestellungen());
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
