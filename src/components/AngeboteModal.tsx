"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Query } from "appwrite";
import { databases } from "@/models/client/config";
import env from "@/app/env";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Angebot = {
  $id: string;
  mengeVerfuegbar: number;
  einheit: string;
  euroPreis: number;
  menge: number;
  saatPflanzDatum: string;
  ernteProjektion?: string[];
};

const DB = env.appwrite.db;
const ANGEBOTE = env.appwrite.angebote_collection_id;

export default function AngeboteModal({ produktId, produktName, produktSorte, produktAngebote }: { produktId: string; produktName: string; produktSorte?: string; produktAngebote: number; }) {
  const [angebote, setAngebote] = useState<Angebot[]>([]);

  async function load() {
    const res = await databases.listDocuments(DB, ANGEBOTE, [Query.equal("produktID", produktId)]);
    setAngebote(res.documents as unknown as Angebot[]);
  }

  if (produktAngebote === 0) {
    return <Button variant="outline" size="sm" className="text-gray-500 border-gray-300 cursor-default" disabled>Keine Angebote</Button>;
  }

  return (
    <Dialog onOpenChange={(open) => open && void load()}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-permdal-600 text-white hover:bg-permdal-700">{produktAngebote} {produktAngebote > 1 ? "Angebote" : "Angebot"} anzeigen</Button>
      </DialogTrigger>
      <DialogContent className="bg-white rounded-2xl p-6 shadow-xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-permdal-900">Angebote für {produktName}{produktSorte ? ` – ${produktSorte}` : ""}</DialogTitle>
        </DialogHeader>
        {angebote.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Keine Angebote vorhanden</p>
        ) : (
          <ul className="space-y-4 text-black">
            {angebote.map((a) => (
              <li key={a.$id}>
                <div className="rounded-xl border bg-white p-4 shadow-sm flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-semibold text-black">{a.mengeVerfuegbar} {a.einheit} verfügbar</p>
                    <p className="text-sm">Preis: {(() => {
                      let menge = a.menge;
                      let einheit = a.einheit;
                      if (einheit.toLowerCase() === "gramm" && menge >= 1000) {
                        menge = menge / 1000;
                        einheit = "kg";
                      }
                      if (menge === 1 && einheit.toLowerCase() === "stück") {
                        return `${a.euroPreis.toFixed(2)} € / Stück`;
                      }
                      return `${a.euroPreis.toFixed(2)} € / ${menge} ${einheit}`;
                    })()}</p>
                    <p className="text-xs text-muted-foreground">Saat- / Pflanzdatum: {new Date(a.saatPflanzDatum).toLocaleDateString("de-DE")}</p>
                    {a.ernteProjektion && a.ernteProjektion.length > 0 && (
                      <p className="text-xs text-muted-foreground">Nächste Ernte: {a.ernteProjektion.length === 1 ? new Date(a.ernteProjektion[0]).toLocaleDateString("de-DE") : `${new Date(a.ernteProjektion[0]).toLocaleDateString("de-DE")} - ${new Date(a.ernteProjektion[a.ernteProjektion.length - 1]).toLocaleDateString("de-DE")}`}</p>
                    )}
                  </div>
                  <Link to="/angebote/$id" params={{ id: a.$id }}><Button variant="link" className="px-0 flex items-center gap-1">Details und Bestellung</Button></Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
