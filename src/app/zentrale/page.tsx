'use client';

import { useEffect, useState } from "react";
import { listAlleProdukte, listStaffeln } from "@/lib/appwrite/appwriteProducts";
import ZentraleAdmin from "@/components/ZentraleAdmin";

export default function Page() {
  const [produkte, setProdukte] = useState<Produkt[] | null>(null);
  const [staffeln, setStaffeln] = useState<Staffel[] | null>(null);

  useEffect(() => {
    async function load() {
      const [produkteResponse, staffelnResponse] = await Promise.all([
        listAlleProdukte(),
        listStaffeln(),
      ]);

      setProdukte(produkteResponse);
      setStaffeln(staffelnResponse);
    }
    load();
  }, []);

  if (!produkte || !staffeln) {
    return <div>Loading…</div>;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Zentrale</h1>
      </div>
      <div className="w-full max-w-4xl">
        <ZentraleAdmin initialProdukte={produkte} initialStaffeln={staffeln} />
      </div>
    </main>
  );
}
