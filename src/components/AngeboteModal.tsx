"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";

import { listStaffeln } from "@/lib/appwrite/appwriteProducts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function AngeboteModal({
  produktId,
  produktName,
  produktSorte,
  produktAngebote,
}: {
  produktId: string;
  produktName: string;
  produktSorte?: string;
  produktAngebote: number;
}) {
  const [angebote, setAngebote] = useState<Staffel[]>([]);

  async function load() {
    setAngebote(await listStaffeln({ produktId }));
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
            {angebote.map((angebot) => (
              <li key={angebot.id}>
                <div className="rounded-xl border bg-white p-4 shadow-sm flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-semibold text-black">{angebot.mengeVerfuegbar} {angebot.einheit} verfügbar</p>
                    <p className="text-sm">Preis: {(() => {
                      let menge = angebot.menge;
                      let einheit = angebot.einheit;
                      if (einheit.toLowerCase() === "gramm" && menge >= 1000) {
                        menge = menge / 1000;
                        einheit = "kg";
                      }
                      if (menge === 1 && einheit.toLowerCase() === "stück") {
                        return `${angebot.euroPreis.toFixed(2)} € / Stück`;
                      }
                      return `${angebot.euroPreis.toFixed(2)} € / ${menge} ${einheit}`;
                    })()}</p>
                    <p className="text-xs text-muted-foreground">Saat- / Pflanzdatum: {new Date(angebot.saatPflanzDatum).toLocaleDateString("de-DE")}</p>
                    {angebot.ernteProjektion.length > 0 && (
                      <p className="text-xs text-muted-foreground">Nächste Ernte: {angebot.ernteProjektion.length === 1 ? new Date(angebot.ernteProjektion[0]).toLocaleDateString("de-DE") : `${new Date(angebot.ernteProjektion[0]).toLocaleDateString("de-DE")} - ${new Date(angebot.ernteProjektion[angebot.ernteProjektion.length - 1]).toLocaleDateString("de-DE")}`}</p>
                    )}
                  </div>
                  <Link to="/angebote/$id" params={{ id: angebot.id }}><Button variant="link" className="px-0 flex items-center gap-1">Details und Bestellung</Button></Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
