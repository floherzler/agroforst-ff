'use client';

import { useEffect, useState } from "react";
import { listAlleProdukte, listStaffeln } from "@/lib/appwrite/appwriteProducts";
import ZentraleAdmin from "@/components/ZentraleAdmin";

export default function Page() {
  const [produkte, setProdukte] = useState<Produkt[] | null>(null);
  const [staffeln, setStaffeln] = useState<Staffel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [produkteResponse, staffelnResponse] = await Promise.all([
          listAlleProdukte(),
          listStaffeln(),
        ]);

        setProdukte(produkteResponse);
        setStaffeln(staffelnResponse);
        setError(null);
      } catch (rawError) {
        const message =
          rawError instanceof Error
            ? rawError.message
            : "Admin-Daten konnten nicht geladen werden.";
        setError(message);
      }
    }

    void load();
  }, []);

  if (error) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Zentrale</h1>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </main>
    );
  }

  if (!produkte || !staffeln) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto mb-8 max-w-7xl text-center">
        <h1 className="text-3xl font-bold">Zentrale</h1>
      </div>
      <div className="mx-auto w-full max-w-7xl">
        <ZentraleAdmin initialProdukte={produkte} initialStaffeln={staffeln} />
      </div>
    </main>
  );
}
