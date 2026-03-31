"use client";

import { PencilLine, Sprout } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { displayProductName, displayValueLabel } from "@/features/zentrale/admin-domain";
import { getProduktImagePreviewUrl } from "@/lib/appwrite/appwriteProducts";
import { cn } from "@/lib/utils";
import { statusToneRecipes, surfaceRecipes, textRecipes } from "@/theme/recipes";

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
  const imageUrl = product.imageId
    ? getProduktImagePreviewUrl({ imageId: product.imageId, width: 240, height: 240 })
    : undefined;
  const seasonalMonths = (product.saisonalitaet ?? [])
    .filter((month) => month >= 1 && month <= 12);

  return (
    <Card
      className={cn(
        "h-full gap-0 overflow-hidden border border-border/70 py-0 transition hover:border-primary/25",
        surfaceRecipes({ tone: selected ? "strong" : "default" }),
        selected && "border-primary shadow-brand-soft",
      )}
    >
      <CardHeader className="relative gap-4 border-b border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(182,209,164,0.16),transparent_42%),radial-gradient(circle_at_top_right,rgba(190,176,235,0.12),transparent_30%),linear-gradient(180deg,var(--color-surface-plain),color-mix(in_srgb,var(--color-surface-soft)_42%,white_58%))] px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar className="size-18 rounded-[1.45rem] border border-white/80 bg-surface-plain shadow-[0_12px_28px_-20px_rgba(39,38,21,0.55)]">
              {imageUrl ? <AvatarImage src={imageUrl} alt={product.name} className="object-cover" /> : null}
              <AvatarFallback className="rounded-[1.45rem] bg-accent text-accent-foreground">
                <Sprout />
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge className={cn(selected ? statusToneRecipes({ tone: "seasonal" }) : "")} variant={selected ? "default" : "outline"}>
                  {displayValueLabel(product.hauptkategorie)}
                </Badge>
                {product.unterkategorie ? (
                  <Badge variant="secondary">{displayValueLabel(product.unterkategorie)}</Badge>
                ) : null}
                {product.lebensdauer ? (
                  <Badge variant="outline">{displayValueLabel(product.lebensdauer)}</Badge>
                ) : null}
                {statusLabel !== "Live" ? (
                  <Badge variant={statusVariant}>{statusLabel}</Badge>
                ) : null}
              </div>
              <CardTitle className={cn("line-clamp-2", textRecipes({ role: "title" }))}>
                {displayProductName(product)}
              </CardTitle>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {buildCardInfoText(product)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 py-4">
        <div className="rounded-[1.15rem] border border-border/60 bg-surface-soft p-3">
          <div className={cn("mb-2 text-[0.68rem] uppercase tracking-[0.16em]", textRecipes({ role: "meta" }))}>
            Saisonfenster
          </div>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {monthLabels.map((month, index) => {
              const monthNumber = index + 1;
              const active = seasonalMonths.includes(monthNumber);

              return (
                <div
                  key={month}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-md text-[0.7rem] font-medium",
                    active
                      ? "bg-accent text-accent-foreground ring-1 ring-accent/30"
                      : "bg-muted/55 text-muted-foreground",
                  )}
                >
                  {month}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t border-border/60 px-5 py-4">
        <Button
          variant={selected ? "default" : "secondary"}
          className="w-full cursor-pointer"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
        >
          <PencilLine data-icon="inline-start" />
          {selected ? "Im Editor geöffnet" : "Bearbeiten"}
        </Button>
      </CardFooter>
    </Card>
  );
}

const monthLabels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function buildCardInfoText(product: Produkt) {
  if (product.notes?.trim()) {
    return product.notes.trim();
  }

  const category = displayValueLabel(product.unterkategorie || product.hauptkategorie) || "Sortiment";
  const lifespan = displayValueLabel(product.lebensdauer);

  if (product.sorte && lifespan) {
    return `${product.sorte} ist als ${category.toLowerCase()} ${lifespan.toLowerCase()} eingeplant.`;
  }

  if (product.sorte) {
    return `${product.sorte} ist Teil des saisonalen ${category.toLowerCase()}-Sortiments.`;
  }

  return `${category} aus dem aktuellen Hofsortiment.`;
}
