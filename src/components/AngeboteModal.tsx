"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { VariantProps } from "class-variance-authority";

import { formatHarvestRange, getOfferPriceSummary } from "@/features/catalog/catalog";
import { listStaffeln } from "@/lib/appwrite/appwriteProducts";
import { formatOfferDate } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function AngeboteModal({
  produktId,
  produktName,
  produktSorte,
  produktAngebote,
  triggerVariant = "default",
  triggerSize = "sm",
  triggerClassName,
  triggerLabel,
}: {
  produktId: string;
  produktName: string;
  produktSorte?: string;
  produktAngebote: number;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerSize?: VariantProps<typeof buttonVariants>["size"];
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [angebote, setAngebote] = useState<Staffel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function load() {
    setIsLoading(true);

    try {
      setAngebote(await listStaffeln({ produktId }));
    } finally {
      setIsLoading(false);
    }
  }

  if (produktAngebote === 0) {
    return (
      <Button variant="outline" size="sm" disabled>
        Keine Angebote
      </Button>
    );
  }

  return (
    <Dialog onOpenChange={(open) => open && void load()}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
        >
          {triggerLabel ??
            `${produktAngebote} ${produktAngebote > 1 ? "Angebote" : "Angebot"} anzeigen`}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Angebote für {produktName}
            {produktSorte ? ` – ${produktSorte}` : ""}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: Math.min(produktAngebote, 3) }).map((_, index) => (
              <Card key={index} size="sm">
                <CardHeader className="border-b">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-28" />
                </CardHeader>
                <CardContent className="flex flex-col gap-2 pt-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-48" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : angebote.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Keine Angebote vorhanden.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {angebote.map((angebot) => (
              <Card key={angebot.id} size="sm">
                <CardHeader className="border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <CardTitle>
                        {angebot.mengeVerfuegbar} {angebot.einheit} verfügbar
                      </CardTitle>
                      <CardDescription>
                        {getOfferPriceSummary(angebot)}
                      </CardDescription>
                    </div>
                    <Badge variant={angebot.mengeVerfuegbar > 0 ? "secondary" : "outline"}>
                      {angebot.mengeVerfuegbar > 0 ? "Aktiv" : "Leer"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 pt-3 text-sm text-muted-foreground">
                  <p>
                    Saat- / Pflanzdatum:{" "}
                    {formatOfferDate(angebot.saatPflanzDatum)}
                  </p>
                  <p>Nächste Ernte: {formatHarvestRange(angebot.ernteProjektion)}</p>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/angebote/$id" params={{ id: angebot.id }}>
                      Details und Bestellung
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
