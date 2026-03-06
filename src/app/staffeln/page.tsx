// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { listStaffeln } from "@/lib/appwrite/appwriteProducts";
import StaffelAdmin from "@/components/StaffelAdmin";

export default function Page() {
  const [staffeln, setStaffeln] = useState<Staffel[] | null>(null);

  useEffect(() => {
    async function load() {
      console.log("Fetching staffeln on the client…");
      setStaffeln(await listStaffeln());
    }
    load();
  }, []);

  if (!staffeln) {
    return <div>Loading…</div>;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Staffeln</h1>
        <a
          href="/produkte"
          className="text-blue-500 hover:underline text-lg"
        >
          Zu den Produkten
        </a>
      </div>
      <div className="w-full max-w-4xl">
        <StaffelAdmin initialStaffeln={staffeln} />
      </div>
    </main>
  );
}
