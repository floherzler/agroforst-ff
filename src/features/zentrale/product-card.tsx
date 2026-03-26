"use client";

import { PencilLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { displayProductName, displayValueLabel } from "@/features/zentrale/admin-domain";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  product: Produkt;
  selected: boolean;
  statusLabel: string;
  statusVariant?: "default" | "secondary" | "outline";
  onSelect: () => void;
  onEdit: () => void;
};

export function ProductCard({
  product,
  selected,
  statusLabel,
  statusVariant = "outline",
  onSelect,
  onEdit,
}: ProductCardProps) {
  return (
    <Card
      className={cn(
        "h-full gap-3 border border-border/70 bg-card/95 py-0 transition hover:border-earth-500/30 hover:bg-background",
        selected && "border-earth-500 bg-earth-50/70 shadow-brand-soft",
      )}
    >
      <CardHeader className="gap-2 border-b border-border/60 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-earth-700">{displayProductName(product)}</CardTitle>
            <p className="mt-1 truncate text-xs text-muted-foreground">{product.id}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={selected ? "default" : "outline"}>{displayValueLabel(product.hauptkategorie)}</Badge>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex flex-wrap gap-2">
          {product.unterkategorie ? <Badge variant="secondary">{displayValueLabel(product.unterkategorie)}</Badge> : null}
          {product.lebensdauer ? <Badge variant="outline">{displayValueLabel(product.lebensdauer)}</Badge> : null}
          {(product.saisonalitaet ?? []).length > 0 ? (
            <Badge variant="outline">Saison {product.saisonalitaet.join(", ")}</Badge>
          ) : (
            <Badge variant="outline">Keine Saison</Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="grid grid-cols-2 gap-2 border-t border-border/60 py-4">
        <Button variant={selected ? "default" : "outline"} onClick={onSelect}>
          {selected ? "Ausgewählt" : "Auswählen"}
        </Button>
        <Button variant="secondary" onClick={onEdit}>
          <PencilLine data-icon="inline-start" />
          Bearbeiten
        </Button>
      </CardFooter>
    </Card>
  );
}
