"use client";

import type { FormEvent } from "react";

import {
  Activity,
  ArrowRightLeft,
  ArrowRight,
  BookText,
  Boxes,
  CalendarRange,
  ClipboardList,
  Euro,
  ImagePlus,
  Layers3,
  Package2,
  Plus,
  ReceiptText,
  Sprout,
  Trash2,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  displayProductName,
  formatTeilungPreviewLabel,
  displayUnitLabel,
  displayValueLabel,
  formatCurrency,
  hauptkategorieValues,
  lebensdauerValues,
  offerUnits,
  splitList,
  type BieteSucheFormState,
  type FunctionStatus,
  type OfferFormState,
  type PreisStaffelFormState,
  type ProductFormState,
  unterkategorieValues,
} from "@/features/zentrale/admin-domain";
import { formatHarvestRange, getOfferPriceSummary } from "@/features/catalog/catalog";
import { formatOfferDate } from "@/lib/date";
import { cn } from "@/lib/utils";

type SharedAdminState = {
  produkte: Produkt[];
  staffeln: Staffel[];
  bieteSucheEintraege: BieteSucheEintrag[];
  productById: Map<string, Produkt>;
  selectedProductId: string | null;
  selectedOfferId: string | null;
  selectedBieteSucheId: string | null;
  selectedProduct: Produkt | null;
  selectedOffer: Staffel | null;
  selectedBieteSuche: BieteSucheEintrag | null;
  productForm: ProductFormState;
  offerForm: OfferFormState;
  bieteSucheForm: BieteSucheFormState;
  productStatus: FunctionStatus;
  offerStatus: FunctionStatus;
  bieteSucheStatus: FunctionStatus;
  productFilter: string;
  offerFilter: string;
  bieteSucheFilter: string;
  activePanel: "produkte" | "angebote" | "biete-suche";
  visibleProducts: Produkt[];
  visibleOffers: Staffel[];
  visibleBieteSucheEintraege: BieteSucheEintrag[];
  offersForSelectedProduct: Staffel[];
  bieteSucheTags: string[];
  totalProjectedQuantity: number;
  totalAvailableQuantity: number;
  totalExpectedRevenue: number;
  activeSeasonOffers: number;
  generatedProductId: string;
  productImageFileName: string;
  productImagePreviewUrl?: string;
  setProductForm: React.Dispatch<React.SetStateAction<any>>;
  setOfferForm: React.Dispatch<React.SetStateAction<any>>;
  setBieteSucheForm: React.Dispatch<React.SetStateAction<any>>;
  setProductFilter: (value: string) => void;
  setOfferFilter: (value: string) => void;
  setBieteSucheFilter: (value: string) => void;
  setActivePanel: (value: "produkte" | "angebote" | "biete-suche") => void;
  setProductImageFile: (file: File | null) => void;
  saveProduct: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  saveOffer: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  saveBieteSuche: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  resetProductForm: () => void;
  resetOfferForm: () => void;
  resetBieteSucheForm: () => void;
  selectProduct: (productId: string) => void;
  selectOffer: (offerId: string) => void;
  selectBieteSuche: (entryId: string) => void;
  createBieteSucheDraft: (mode?: BieteSucheModus) => void;
};

export function StatusMessage({ status }: { status: FunctionStatus }) {
  if (!status.message) {
    return null;
  }

  return (
    <p className={status.state === "success" ? "text-sm text-primary" : "text-sm text-destructive"}>
      {status.message}
    </p>
  );
}

function updatePreisStaffelAt(
  staffeln: PreisStaffelFormState[],
  index: number,
  patch: Partial<PreisStaffelFormState>,
) {
  return staffeln.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, ...patch } : entry,
  );
}

export function ProductEditor({
  state,
  compact = false,
}: {
  state: SharedAdminState;
  compact?: boolean;
}) {
  const { productForm, selectedProduct, productStatus } = state;

  return (
    <Card className="border-border/80 bg-card/95 shadow-brand-soft">
      <CardHeader className={compact ? "gap-2 px-4 py-4" : "gap-2"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>{selectedProduct ? "Produkt bearbeiten" : "Produkt anlegen"}</CardTitle>
            <CardDescription>
              Produktstammdaten für Hofladen, Abokiste und Saisonplanung. Die sichtbaren Feldnamen bleiben deutsch, technisch wird sauber ins Backend geschrieben.
            </CardDescription>
          </div>
          <Badge variant="outline">Live</Badge>
        </div>
      </CardHeader>
      <CardContent className={compact ? "px-4 pb-4 pt-0" : undefined}>
        <form className="flex flex-col gap-4" onSubmit={state.saveProduct}>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Name
              <Input
                value={productForm.name}
                onChange={(event) =>
                  state.setProductForm((current: any) => ({ ...current, name: event.target.value }))
                }
                placeholder="z. B. Kartoffel, Salbei oder Apfel"
              />
            </label>
            <div className="rounded-[1.35rem] border border-border/70 bg-background/70 p-4">
              <div className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Technische Produkt-ID
              </div>
              <div className="mt-2 font-mono text-sm text-foreground">
                {state.generatedProductId || "wird aus Name und Sorte erzeugt"}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Neue Produkte bekommen die ID automatisch, zum Beispiel aus
                {" "}
                <span className="font-medium text-foreground">Apfel + Elstar</span>
                {" "}
                wird
                {" "}
                <span className="font-mono text-foreground">apfel_elstar</span>.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Sorte
              <Input
                value={productForm.sorte}
                onChange={(event) =>
                  state.setProductForm((current: any) => ({ ...current, sorte: event.target.value }))
                }
                placeholder="z. B. Linda, Topaz oder Echter Salbei"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Hauptkategorie
              <Select
                value={productForm.hauptkategorie}
                onValueChange={(value) =>
                  state.setProductForm((current: any) => ({ ...current, hauptkategorie: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie wählen" />
                </SelectTrigger>
                <SelectContent>
                  {hauptkategorieValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {displayValueLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-background/70">
              {state.productImagePreviewUrl ? (
                <img
                  src={state.productImagePreviewUrl}
                  alt={productForm.name || "Produktbild Vorschau"}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-muted/60 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <ImagePlus className="size-7" />
                    <span className="max-w-[12rem] text-sm leading-5">
                      Noch kein Bild verknüpft
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 rounded-[1.5rem] border border-border/70 bg-background/60 p-4">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">Produktbild</div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Vorhandenes Bild per Appwrite-Datei-ID verknüpfen oder eine neue Datei direkt in den Bucket
                  {" "}
                  <span className="font-mono text-foreground">produkt_bilder</span>
                  {" "}
                  hochladen.
                </p>
              </div>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Vorhandene Datei-ID
                <Input
                  value={productForm.imageId}
                  onChange={(event) =>
                    state.setProductForm((current: any) => ({ ...current, imageId: event.target.value }))
                  }
                  placeholder="z. B. 67fd2f4f0012abcd1234"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Neues Bild hochladen
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={(event) =>
                    state.setProductImageFile(event.target.files?.[0] ?? null)
                  }
                />
              </label>

              <div className="rounded-[1rem] border border-dashed border-border/80 bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
                {state.productImageFileName
                  ? `Beim Speichern wird "${state.productImageFileName}" hochgeladen und mit dem Produkt verknüpft.`
                  : productForm.imageId.trim()
                    ? `Aktuell verknüpft: ${productForm.imageId.trim()}`
                    : "Ohne Upload bleibt nur die eingetragene Datei-ID verknüpft."}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Unterkategorie
              <Select
                value={productForm.unterkategorie || "__empty__"}
                onValueChange={(value) =>
                  state.setProductForm((current: any) => ({
                    ...current,
                    unterkategorie: value === "__empty__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">Keine</SelectItem>
                  {unterkategorieValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {displayValueLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Lebensdauer
              <Select
                value={productForm.lebensdauer || "__empty__"}
                onValueChange={(value) =>
                  state.setProductForm((current: any) => ({
                    ...current,
                    lebensdauer: value === "__empty__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">Keine</SelectItem>
                  {lebensdauerValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {displayValueLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Interne Notizen
            <Textarea
              value={productForm.notes}
              onChange={(event) =>
                state.setProductForm((current: any) => ({ ...current, notes: event.target.value }))
              }
              placeholder="z. B. lagert gut, für Wochenmarkt beliebt, empfindlich bei Nässe"
            />
          </label>

          <p className="text-xs text-muted-foreground">
            Tipp: Name und Sorte so pflegen, wie sie später auch im Marktplatz und in Bestellungen erscheinen sollen.
          </p>

          <Accordion type="multiple" className="w-full rounded-[1.3rem] border border-border/70 bg-background/60 px-4">
            <AccordionItem value="saison">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Sprout />
                  Saison und Lesart
                </span>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4 pt-1">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Saisonmonate
                  <Input
                    value={productForm.saisonalitaet}
                    onChange={(event) =>
                      state.setProductForm((current: any) => ({
                        ...current,
                        saisonalitaet: event.target.value,
                      }))
                    }
                    placeholder="z. B. 5, 6, 7, 8 oder 9, 10, 11"
                  />
                </label>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="fruchtfolge">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <BookText />
                  Fruchtfolge
                </span>
              </AccordionTrigger>
              <AccordionContent className="grid gap-4 pt-1 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Fruchtfolge davor
                  <Textarea
                    value={productForm.fruchtfolgeVor}
                    onChange={(event) =>
                      state.setProductForm((current: any) => ({
                        ...current,
                        fruchtfolgeVor: event.target.value,
                      }))
                    }
                    placeholder="z. B. Kleegras, Salat, Zwiebel"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Fruchtfolge danach
                  <Textarea
                    value={productForm.fruchtfolgeNach}
                    onChange={(event) =>
                      state.setProductForm((current: any) => ({
                        ...current,
                        fruchtfolgeNach: event.target.value,
                      }))
                    }
                    placeholder="z. B. Bohnen, Kürbis, Phacelia"
                  />
                </label>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="anbau">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <ReceiptText />
                  Anbaukontext
                </span>
              </AccordionTrigger>
              <AccordionContent className="grid gap-4 pt-1 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Bodenansprüche
                  <Textarea
                    value={productForm.bodenansprueche}
                    onChange={(event) =>
                      state.setProductForm((current: any) => ({
                        ...current,
                        bodenansprueche: event.target.value,
                      }))
                    }
                    placeholder="z. B. sandiger Lehm, humos, frisch"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Begleitpflanzen
                  <Textarea
                    value={productForm.begleitpflanzen}
                    onChange={(event) =>
                      state.setProductForm((current: any) => ({
                        ...current,
                        begleitpflanzen: event.target.value,
                      }))
                    }
                    placeholder="z. B. Dill, Ringelblume, Basilikum"
                  />
                </label>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={productStatus.state === "loading"}
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "min-w-[12rem] px-4")}
            >
              {productStatus.state === "loading"
                ? "Speichert..."
                : selectedProduct
                  ? "Produkt aktualisieren"
                  : "Produkt anlegen"}
            </button>
            <button
              type="button"
              onClick={state.resetProductForm}
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "min-w-[11rem] px-4")}
            >
              Neues Formular
            </button>
          </div>

          <StatusMessage status={productStatus} />
        </form>
      </CardContent>
    </Card>
  );
}

export function OfferEditor({
  state,
  compact = false,
}: {
  state: SharedAdminState;
  compact?: boolean;
}) {
  const { offerForm, selectedOffer, offerStatus, produkte } = state;
  const harvestDates = offerForm.ernteProjektion.length > 0 ? offerForm.ernteProjektion : [""];

  return (
    <Card className="border-border/80 bg-card/95 shadow-brand-soft">
      <CardHeader className={compact ? "gap-2 px-4 py-4" : "gap-2"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>{selectedOffer ? "Angebot bearbeiten" : "Angebot anlegen"}</CardTitle>
            <CardDescription>
              Angebotsdaten für Saison, Verfügbarkeit und Preislogik im Verkauf.
            </CardDescription>
          </div>
          <Badge variant="outline">Live</Badge>
        </div>
      </CardHeader>
      <CardContent className={compact ? "px-4 pb-4 pt-0" : undefined}>
        <form className="flex flex-col gap-4" onSubmit={state.saveOffer}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Angebots-ID
              <Input
                value={offerForm.id}
                onChange={(event) =>
                  state.setOfferForm((current: any) => ({ ...current, id: event.target.value }))
                }
                placeholder="Leer lassen für Auto-ID"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Produkt
              <Select
                value={offerForm.produktId}
                onValueChange={(value) =>
                  state.setOfferForm((current: any) => ({ ...current, produktId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Produkt wählen" />
                </SelectTrigger>
                <SelectContent>
                  {produkte
                    .slice()
                    .sort((left, right) =>
                      displayProductName(left).localeCompare(displayProductName(right), "de"),
                    )
                    .map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {displayProductName(product)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            Mengen und Preise immer aus Sicht des Hofalltags pflegen: Was wird real angeboten, was ist schon reserviert und welche Einheit ist für Kund:innen später verständlich?
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Jahr
              <Input
                type="number"
                min="2000"
                max="2100"
                value={offerForm.year}
                onChange={(event) =>
                  state.setOfferForm((current: any) => ({ ...current, year: event.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Einheit
              <Select
                value={offerForm.einheit}
                onValueChange={(value) =>
                  state.setOfferForm((current: any) => ({ ...current, einheit: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Einheit wählen" />
                </SelectTrigger>
                <SelectContent>
                  {offerUnits.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Geplante Menge
              <Input
                type="number"
                min="0"
                value={offerForm.menge}
                onChange={(event) =>
                  state.setOfferForm((current: any) => ({ ...current, menge: event.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Aktuell verfügbar
              <Input
                type="number"
                min="0"
                value={offerForm.mengeVerfuegbar}
                onChange={(event) =>
                  state.setOfferForm((current: any) => ({
                    ...current,
                    mengeVerfuegbar: event.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Reserviert
              <Input
                type="number"
                min="0"
                value={offerForm.mengeAbgeholt}
                onChange={(event) =>
                  state.setOfferForm((current: any) => ({
                    ...current,
                    mengeAbgeholt: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Erwarteter Umsatz gesamt
              <Input
                type="number"
                min="0"
                step="0.01"
                value={offerForm.expectedRevenue}
                onChange={(event) =>
                  state.setOfferForm((current: any) => ({
                    ...current,
                    expectedRevenue: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="rounded-[1.35rem] border border-border/70 bg-background/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium text-foreground">Preisstaffeln</div>
                <p className="text-xs text-muted-foreground">
                  Teilungen werden numerisch in der gewählten Basiseinheit gespeichert und können
                  später kombiniert bestellt werden.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  state.setOfferForm((current: OfferFormState) => ({
                    ...current,
                    preisStaffeln: [...current.preisStaffeln, { teilung: "", paketPreisEur: "" }],
                  }))
                }
              >
                Staffel hinzufügen
              </Button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {offerForm.preisStaffeln.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 px-4 py-5 text-sm text-muted-foreground">
                  Keine Preisstaffeln gepflegt. Fuer jedes Angebot ist mindestens eine Staffel erforderlich.
                </div>
              ) : (
                offerForm.preisStaffeln.map((staffel, index) => {
                  const teilung = Number(staffel.teilung);
                  const paketPreis = Number(staffel.paketPreisEur);
                  const hasPreview =
                    Number.isFinite(teilung)
                    && teilung > 0
                    && Number.isFinite(paketPreis)
                    && paketPreis >= 0;

                  return (
                    <div
                      key={index}
                      className="grid gap-3 rounded-xl border border-border/70 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]"
                    >
                      <label className="flex flex-col gap-2 text-sm font-medium">
                        Teilung
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={staffel.teilung}
                          onChange={(event) =>
                            state.setOfferForm((current: OfferFormState) => ({
                              ...current,
                              preisStaffeln: updatePreisStaffelAt(current.preisStaffeln, index, {
                                teilung: event.target.value,
                              }),
                            }))
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-medium">
                        Paketpreis
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={staffel.paketPreisEur}
                          onChange={(event) =>
                            state.setOfferForm((current: OfferFormState) => ({
                              ...current,
                              preisStaffeln: updatePreisStaffelAt(current.preisStaffeln, index, {
                                paketPreisEur: event.target.value,
                              }),
                            }))
                          }
                        />
                      </label>
                      <div className="flex flex-col justify-center gap-1 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <div className="font-medium text-foreground">
                          {hasPreview
                            ? formatTeilungPreviewLabel(teilung, offerForm.einheit)
                            : "Vorschau folgt"}
                        </div>
                        <div className="text-muted-foreground">
                          {hasPreview
                            ? `${formatCurrency(paketPreis)} gesamt · ${formatCurrency(paketPreis / teilung)} / ${displayUnitLabel(offerForm.einheit)}`
                            : "Teilung und Paketpreis eingeben"}
                        </div>
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            state.setOfferForm((current: OfferFormState) => ({
                              ...current,
                              preisStaffeln: current.preisStaffeln.filter(
                                (_, entryIndex) => entryIndex !== index,
                              ),
                            }))
                          }
                        >
                          Entfernen
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Beschreibung
            <Textarea
              value={offerForm.beschreibung}
              onChange={(event) =>
                state.setOfferForm((current: any) => ({
                  ...current,
                  beschreibung: event.target.value,
                }))
              }
              placeholder="z. B. frisch aus der Ernte, lagerfähig bis Februar, nur Abholung freitags"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Tags
            <Input
              value={offerForm.tags}
              onChange={(event) =>
                state.setOfferForm((current: OfferFormState) => ({
                  ...current,
                  tags: event.target.value,
                }))
              }
              placeholder="z. B. Sonderangebot, neu, lagerware"
            />
          </label>

          <Accordion type="multiple" className="w-full rounded-[1.3rem] border border-border/70 bg-background/60 px-4">
            <AccordionItem value="timeline">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <CalendarRange />
                  Zeitfenster
                </span>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4 pt-1">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Saat-/Pflanzdatum
                    <Input
                      type="date"
                      value={offerForm.saatPflanzDatum}
                      onChange={(event) =>
                        state.setOfferForm((current: any) => ({
                          ...current,
                          saatPflanzDatum: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Abholung möglich ab
                    <Input
                      type="datetime-local"
                      value={offerForm.pickupAt}
                      onChange={(event) =>
                        state.setOfferForm((current: any) => ({ ...current, pickupAt: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">Ernteprojektion</span>
                      <span className="text-xs text-muted-foreground">
                        Einzelne Erntetermine werden als Appwrite-`datetime[]` gespeichert.
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        state.setOfferForm((current: OfferFormState) => ({
                          ...current,
                          ernteProjektion: [...current.ernteProjektion, ""],
                        }))
                      }
                    >
                      <Plus className="size-4" />
                      Termin
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/70 p-3">
                    {harvestDates.map((value, index) => (
                      <div key={`${index}-${value || "empty"}`} className="flex items-end gap-3">
                        <label className="flex flex-1 flex-col gap-2 text-sm font-medium">
                          {`Erntetermin ${index + 1}`}
                          <Input
                            type="date"
                            value={value}
                            onChange={(event) =>
                              state.setOfferForm((current: OfferFormState) => ({
                                ...current,
                                ernteProjektion: current.ernteProjektion.map((entry, entryIndex) =>
                                  entryIndex === index ? event.target.value : entry,
                                ),
                              }))
                            }
                          />
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={offerForm.ernteProjektion.length === 0}
                          onClick={() =>
                            state.setOfferForm((current: OfferFormState) => ({
                              ...current,
                              ernteProjektion: current.ernteProjektion.filter(
                                (_, entryIndex) => entryIndex !== index,
                              ),
                            }))
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground">
                      Anzeige: {formatHarvestRange(harvestDates.filter(Boolean))}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={offerStatus.state === "loading"}
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "min-w-[12rem] px-4")}
            >
              {offerStatus.state === "loading"
                ? "Speichert..."
                : selectedOffer
                  ? "Angebot aktualisieren"
                  : "Angebot anlegen"}
            </button>
            <button
              type="button"
              onClick={state.resetOfferForm}
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "min-w-[11rem] px-4")}
            >
              Neues Formular
            </button>
          </div>

          <StatusMessage status={offerStatus} />
        </form>
      </CardContent>
    </Card>
  );
}

export function BieteSucheEditor({
  state,
  compact = false,
}: {
  state: SharedAdminState;
  compact?: boolean;
}) {
  const { bieteSucheForm, selectedBieteSuche, bieteSucheStatus } = state;

  return (
    <Card className="border-border/80 bg-card/95 shadow-brand-soft">
      <CardHeader className={compact ? "gap-2 px-4 py-4" : "gap-2"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>{selectedBieteSuche ? "Eintrag bearbeiten" : "Eintrag anlegen"}</CardTitle>
            <CardDescription>
              Gesuche und Angebote außerhalb des Produktkatalogs verwalten.
            </CardDescription>
          </div>
          <Badge variant="outline">Live</Badge>
        </div>
      </CardHeader>
      <CardContent className={compact ? "px-4 pb-4 pt-0" : undefined}>
        <form className="flex flex-col gap-4" onSubmit={state.saveBieteSuche}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Eintrags-ID
              <Input
                value={bieteSucheForm.id}
                onChange={(event) =>
                  state.setBieteSucheForm((current: BieteSucheFormState) => ({ ...current, id: event.target.value }))
                }
                placeholder="Leer lassen für Auto-ID"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Modus
              <Select
                value={bieteSucheForm.modus}
                onValueChange={(value) =>
                  state.setBieteSucheForm((current: BieteSucheFormState) => ({
                    ...current,
                    modus: value as BieteSucheModus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Modus wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="biete">Biete</SelectItem>
                  <SelectItem value="suche">Suche</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Titel
            <Input
              value={bieteSucheForm.titel}
              onChange={(event) =>
                state.setBieteSucheForm((current: BieteSucheFormState) => ({
                  ...current,
                  titel: event.target.value,
                }))
              }
              placeholder="z. B. Kartoffelroder gesucht oder Mostpresse verfügbar"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Beschreibung
            <Textarea
              value={bieteSucheForm.beschreibung}
              onChange={(event) =>
                state.setBieteSucheForm((current: BieteSucheFormState) => ({
                  ...current,
                  beschreibung: event.target.value,
                }))
              }
              placeholder="Was wird angeboten oder gesucht, in welchem Umfang und mit welchem Hintergrund?"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Tags
            <Input
              value={bieteSucheForm.tags}
              onChange={(event) =>
                state.setBieteSucheForm((current: BieteSucheFormState) => ({
                  ...current,
                  tags: event.target.value,
                }))
              }
              placeholder="z. B. Maschinen, Nachbarschaftshilfe, Verleih"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Hinweis / Kontakt
            <Input
              value={bieteSucheForm.hinweis}
              onChange={(event) =>
                state.setBieteSucheForm((current: BieteSucheFormState) => ({
                  ...current,
                  hinweis: event.target.value,
                }))
              }
              placeholder="z. B. Abholung in Wittstock, Kontakt über das Hofteam"
            />
          </label>

          {state.bieteSucheTags.length > 0 ? (
            <div className="rounded-[1.2rem] border border-border/70 bg-background/60 p-4">
              <div className="text-sm font-medium">Vorhandene Tags</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {state.bieteSucheTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs transition hover:bg-muted"
                    onClick={() =>
                      state.setBieteSucheForm((current: BieteSucheFormState) => {
                        const values = splitList(current.tags);
                        if (values.some((value) => value.toLowerCase() === tag.toLowerCase())) {
                          return current;
                        }

                        return {
                          ...current,
                          tags: [...values, tag].join(", "),
                        };
                      })
                    }
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={bieteSucheStatus.state === "loading"}
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "min-w-[12rem] px-4")}
            >
              {bieteSucheStatus.state === "loading"
                ? "Speichert..."
                : selectedBieteSuche
                  ? "Eintrag aktualisieren"
                  : "Eintrag anlegen"}
            </button>
            <button
              type="button"
              onClick={state.resetBieteSucheForm}
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "min-w-[11rem] px-4")}
            >
              Neues Formular
            </button>
          </div>

          <StatusMessage status={bieteSucheStatus} />
        </form>
      </CardContent>
    </Card>
  );
}

export function ProductTable({
  state,
  dense = false,
  caption,
}: {
  state: SharedAdminState;
  dense?: boolean;
  caption?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/95 shadow-brand-soft">
      <CardHeader className={dense ? "gap-3 px-4 py-4" : "gap-3"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Produktkatalog</CardTitle>
            <CardDescription>
              {caption ?? "Live-Liste aller Produkte. Ein Klick lädt den Datensatz in den Editor."}
            </CardDescription>
          </div>
          <Badge variant="secondary">{state.visibleProducts.length} Produkte</Badge>
        </div>
        <Input
          value={state.productFilter}
          onChange={(event) => state.setProductFilter(event.target.value)}
          placeholder="Nach ID, Produktname, Sorte oder Kategorie filtern"
        />
      </CardHeader>
      <CardContent className={dense ? "px-4 pb-4 pt-0" : "overflow-x-auto"}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Saison</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.visibleProducts.map((product) => (
              <TableRow
                key={product.id}
                className={product.id === state.selectedProductId ? "bg-muted/60" : "cursor-pointer"}
                onClick={() => state.selectProduct(product.id)}
              >
                <TableCell className="font-mono text-xs">{product.id}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{product.name}</span>
                    {product.sorte ? (
                      <span className="text-xs text-muted-foreground">{product.sorte}</span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{displayValueLabel(product.hauptkategorie)}</Badge>
                    {product.unterkategorie ? (
                      <Badge variant="secondary">{displayValueLabel(product.unterkategorie)}</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  {(product.saisonalitaet ?? []).length > 0 ? product.saisonalitaet.join(", ") : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function OfferTable({
  state,
  dense = false,
  caption,
}: {
  state: SharedAdminState;
  dense?: boolean;
  caption?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/95 shadow-brand-soft">
      <CardHeader className={dense ? "gap-3 px-4 py-4" : "gap-3"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Angebotsliste</CardTitle>
            <CardDescription>
              {caption ?? "Live-Liste aller Angebote mit Produktbezug, Preisen und Verfügbarkeit."}
            </CardDescription>
          </div>
          <Badge variant="secondary">{state.visibleOffers.length} Angebote</Badge>
        </div>
        <Input
          value={state.offerFilter}
          onChange={(event) => state.setOfferFilter(event.target.value)}
          placeholder="Nach Produkt, Angebots-ID oder Jahr filtern"
        />
      </CardHeader>
      <CardContent className={dense ? "px-4 pb-4 pt-0" : "flex flex-col gap-4 overflow-x-auto"}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Angebot</TableHead>
              <TableHead>Produkt</TableHead>
              <TableHead>Jahr</TableHead>
              <TableHead>Preis</TableHead>
              <TableHead>Verfügbar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.visibleOffers.map((offer) => {
              const product = state.productById.get(offer.produktId);
              return (
                <TableRow
                  key={offer.id}
                  className={offer.id === state.selectedOfferId ? "bg-muted/60" : "cursor-pointer"}
                  onClick={() => state.selectOffer(offer.id)}
                >
                  <TableCell className="font-mono text-xs">{offer.id}</TableCell>
                  <TableCell className="font-medium">{displayProductName(product)}</TableCell>
                  <TableCell>{offer.year ?? "-"}</TableCell>
                  <TableCell>{getOfferPriceSummary(offer)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={offer.mengeVerfuegbar > 0 ? "default" : "secondary"}>
                        {offer.mengeVerfuegbar} {displayUnitLabel(offer.einheit)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Ernte: {formatHarvestRange(offer.ernteProjektion)}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {state.selectedOffer ? (
          <>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Aktuell gewähltes Angebot</span>
                <span className="text-muted-foreground">{state.selectedOffer.id}</span>
                <span>{displayProductName(state.productById.get(state.selectedOffer.produktId))}</span>
              </div>
              <div className="grid gap-1 text-sm text-muted-foreground">
                <span>
                  Geplante Menge: {state.selectedOffer.menge} {displayUnitLabel(state.selectedOffer.einheit)}
                </span>
                <span>
                  Reserviert: {state.selectedOffer.mengeAbgeholt} {displayUnitLabel(state.selectedOffer.einheit)}
                </span>
                <span>
                  Saat-/Pflanzdatum: {formatOfferDate(state.selectedOffer.saatPflanzDatum)}
                </span>
                <span>
                  Erntefenster: {formatHarvestRange(state.selectedOffer.ernteProjektion)}
                </span>
                <span>
                  Abholung:{" "}
                  {state.selectedOffer.pickupAt
                    ? new Date(state.selectedOffer.pickupAt).toLocaleString("de-DE")
                    : "-"}
                </span>
                <span>
                  Tags: {state.selectedOffer.tags.length > 0 ? state.selectedOffer.tags.join(", ") : "-"}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function BieteSucheTable({
  state,
  dense = false,
  caption,
}: {
  state: SharedAdminState;
  dense?: boolean;
  caption?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/95 shadow-brand-soft">
      <CardHeader className={dense ? "gap-3 px-4 py-4" : "gap-3"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Biete/Suche-Liste</CardTitle>
            <CardDescription>
              {caption ?? "Live-Liste aller Einträge mit Modus, Tags und Kurzbeschreibung."}
            </CardDescription>
          </div>
          <Badge variant="secondary">{state.visibleBieteSucheEintraege.length} Einträge</Badge>
        </div>
        <Input
          value={state.bieteSucheFilter}
          onChange={(event) => state.setBieteSucheFilter(event.target.value)}
          placeholder="Nach Titel, Modus, Tags oder Hinweis filtern"
        />
      </CardHeader>
      <CardContent className={dense ? "px-4 pb-4 pt-0" : "flex flex-col gap-4 overflow-x-auto"}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Modus</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Hinweis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.visibleBieteSucheEintraege.map((entry) => (
              <TableRow
                key={entry.id}
                className={entry.id === state.selectedBieteSucheId ? "bg-muted/60" : "cursor-pointer"}
                onClick={() => state.selectBieteSuche(entry.id)}
              >
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{entry.titel}</span>
                    <span className="text-xs text-muted-foreground">{entry.id}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={entry.modus === "biete" ? "default" : "secondary"}>
                    {entry.modus === "biete" ? "Biete" : "Suche"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.length > 0 ? entry.tags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    )) : "-"}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{entry.hinweis ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {state.selectedBieteSuche ? (
          <>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Aktuell gewählter Eintrag</span>
                <span className="text-muted-foreground">{state.selectedBieteSuche.titel}</span>
                <span>{state.selectedBieteSuche.id}</span>
              </div>
              <div className="grid gap-1 text-sm text-muted-foreground">
                <span>Modus: {state.selectedBieteSuche.modus === "biete" ? "Biete" : "Suche"}</span>
                <span>Hinweis: {state.selectedBieteSuche.hinweis ?? "-"}</span>
                <span>
                  Tags: {state.selectedBieteSuche.tags.length > 0 ? state.selectedBieteSuche.tags.join(", ") : "-"}
                </span>
                <span>
                  Beschreibung: {state.selectedBieteSuche.beschreibung?.trim() || "-"}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdminVariantHeader({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/70 p-6 shadow-brand-soft sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(106,168,114,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(39,38,21,0.08),transparent_32%)]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-3">
            {badge}
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href="/zentrale">Varianten vergleichen</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function AdminStatGrid({ state }: { state: SharedAdminState }) {
  const cards = [
    {
      label: "Produkte",
      value: String(state.produkte.length),
      icon: Package2,
      tone: "bg-permdal-50 text-permdal-800",
    },
    {
      label: "Angebote",
      value: String(state.staffeln.length),
      icon: Layers3,
      tone: "bg-earth-50 text-earth-500",
    },
    {
      label: "Verfügbar",
      value: String(state.totalAvailableQuantity),
      icon: Boxes,
      tone: "bg-secondary text-secondary-foreground",
    },
    {
      label: "Umsatzpotenzial",
      value: formatCurrency(state.totalExpectedRevenue),
      icon: Euro,
      tone: "bg-lilac-50 text-lilac-800",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="border-border/80 bg-card/95 shadow-brand-soft">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <span className="text-2xl font-semibold tracking-tight">{card.value}</span>
            </div>
            <div className={`rounded-2xl p-3 ${card.tone}`}>
              <card.icon />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ProductQuickList({ state }: { state: SharedAdminState }) {
  return (
    <Card className="border-border/80 bg-card/95 shadow-brand-soft">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2">
          <Sprout />
          Schnellzugriff Produkte
        </CardTitle>
        <CardDescription>Kompakte Auswahl für schnellen Wechsel in den Editor.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {state.visibleProducts.slice(0, 8).map((product) => (
          <button
            key={product.id}
            type="button"
            className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-left transition hover:bg-muted"
            onClick={() => state.selectProduct(product.id)}
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium">{displayProductName(product)}</span>
              <span className="text-xs text-muted-foreground">{product.id}</span>
            </div>
            <ArrowRight className="text-muted-foreground" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

export function OperationsBoard({ state }: { state: SharedAdminState }) {
  const freshestOffers = state.visibleOffers.slice(0, 6);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-border/80 bg-card/95 shadow-brand-soft">
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2">
            <Activity />
            Betriebsübersicht
          </CardTitle>
          <CardDescription>Auf einen Blick: Bestand, Pipeline und aktive Saisonfenster.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <div className="text-sm text-muted-foreground">Projektionsmenge</div>
            <div className="mt-2 text-2xl font-semibold">{state.totalProjectedQuantity}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <div className="text-sm text-muted-foreground">Aktive Saisonangebote</div>
            <div className="mt-2 text-2xl font-semibold">{state.activeSeasonOffers}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <div className="text-sm text-muted-foreground">Angebote zum gewählten Produkt</div>
            <div className="mt-2 text-2xl font-semibold">{state.offersForSelectedProduct.length}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/95 shadow-brand-soft">
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2">
            <CalendarRange />
            Letzte Angebote
          </CardTitle>
          <CardDescription>Direkter Zugriff auf die jüngsten oder relevanten Datensätze.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {freshestOffers.map((offer) => (
            <button
              key={offer.id}
              type="button"
              className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-left transition hover:bg-muted"
              onClick={() => state.selectOffer(offer.id)}
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium">{displayProductName(state.productById.get(offer.produktId))}</span>
                <span className="text-xs text-muted-foreground">
                  {offer.year ?? "-"} · {getOfferPriceSummary(offer)}
                </span>
              </div>
              <Badge variant={offer.mengeVerfuegbar > 0 ? "default" : "secondary"}>
                {offer.mengeVerfuegbar} {offer.einheit}
              </Badge>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function CompactRail({ state }: { state: SharedAdminState }) {
  return (
    <Card className="border-border/80 bg-card/95 shadow-brand-soft">
      <CardHeader className="gap-2 px-4 py-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList />
          Arbeitsleiste
        </CardTitle>
        <CardDescription>Direkte Sprünge in Datensätze und Arbeitsbereiche.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4 pb-4 pt-0">
        <Tabs value={state.activePanel} onValueChange={(value) => state.setActivePanel(value as "produkte" | "angebote")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="produkte">Produkte</TabsTrigger>
            <TabsTrigger value="angebote">Angebote</TabsTrigger>
          </TabsList>
          <TabsContent value="produkte" className="mt-4 flex flex-col gap-2">
            {state.visibleProducts.slice(0, 12).map((product) => (
              <button
                key={product.id}
                type="button"
                className="rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-left text-sm transition hover:bg-muted"
                onClick={() => state.selectProduct(product.id)}
              >
                <div className="font-medium">{displayProductName(product)}</div>
                <div className="text-xs text-muted-foreground">{product.id}</div>
              </button>
            ))}
          </TabsContent>
          <TabsContent value="angebote" className="mt-4 flex flex-col gap-2">
            {state.visibleOffers.slice(0, 12).map((offer) => (
              <button
                key={offer.id}
                type="button"
                className="rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-left text-sm transition hover:bg-muted"
                onClick={() => state.selectOffer(offer.id)}
              >
                <div className="font-medium">{displayProductName(state.productById.get(offer.produktId))}</div>
                <div className="text-xs text-muted-foreground">
                  {offer.id} · {offer.year ?? "-"}
                </div>
              </button>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function ProductGallery({
  state,
  className,
}: {
  state: SharedAdminState;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/80 bg-card/95 shadow-brand-soft", className)}>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Produktgalerie</CardTitle>
            <CardDescription>Kartenansicht für Sorten, Kategorien und schnelle Stammdatenpflege.</CardDescription>
          </div>
          <Badge variant="secondary">{state.visibleProducts.length}</Badge>
        </div>
        <Input
          value={state.productFilter}
          onChange={(event) => state.setProductFilter(event.target.value)}
          placeholder="Produkte filtern"
        />
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.visibleProducts.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => state.selectProduct(product.id)}
            className={cn(
              "rounded-[1.6rem] border p-4 text-left transition",
              product.id === state.selectedProductId
                ? "border-permdal-500 bg-permdal-50 shadow-brand-soft"
                : "border-border/70 bg-background/80 hover:bg-muted",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {product.id}
                </div>
                <div className="mt-2 text-lg font-semibold">{displayProductName(product)}</div>
              </div>
              <ArrowRight className="text-muted-foreground" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline">{displayValueLabel(product.hauptkategorie)}</Badge>
              {product.unterkategorie ? <Badge variant="secondary">{displayValueLabel(product.unterkategorie)}</Badge> : null}
              {product.lebensdauer ? <Badge variant="secondary">{displayValueLabel(product.lebensdauer)}</Badge> : null}
            </div>
            <div className="mt-4 grid gap-1 text-sm text-muted-foreground">
              <span>Saison: {(product.saisonalitaet ?? []).length > 0 ? product.saisonalitaet.join(", ") : "-"}</span>
              <span>Notiz: {product.notes?.trim() ? product.notes : "Keine interne Notiz"}</span>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

export function OfferBoard({
  state,
  className,
}: {
  state: SharedAdminState;
  className?: string;
}) {
  const lanes = [
    {
      key: "ready",
      title: "Bereit",
      tone: "border-emerald-200 bg-emerald-50/70",
      offers: state.visibleOffers.filter((offer) => offer.mengeVerfuegbar > Math.max(offer.menge * 0.5, 0)),
    },
    {
      key: "tight",
      title: "Knapp",
      tone: "border-amber-200 bg-amber-50/80",
      offers: state.visibleOffers.filter(
        (offer) => offer.mengeVerfuegbar > 0 && offer.mengeVerfuegbar <= Math.max(offer.menge * 0.5, 0),
      ),
    },
    {
      key: "empty",
      title: "Leer",
      tone: "border-stone-200 bg-stone-100/80",
      offers: state.visibleOffers.filter((offer) => offer.mengeVerfuegbar <= 0),
    },
  ];

  return (
    <Card className={cn("border-border/80 bg-card/95 shadow-brand-soft", className)}>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Angebotsboard</CardTitle>
            <CardDescription>Verfügbarkeit auf einen Blick, nach Signalstatus gruppiert.</CardDescription>
          </div>
          <Badge variant="secondary">{state.visibleOffers.length}</Badge>
        </div>
        <Input
          value={state.offerFilter}
          onChange={(event) => state.setOfferFilter(event.target.value)}
          placeholder="Angebote filtern"
        />
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-3">
        {lanes.map((lane) => (
          <div key={lane.key} className={cn("rounded-[1.7rem] border p-4", lane.tone)}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{lane.title}</h3>
              <Badge variant="outline">{lane.offers.length}</Badge>
            </div>
            <div className="flex flex-col gap-3">
              {lane.offers.slice(0, 8).map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => state.selectOffer(offer.id)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left transition",
                    offer.id === state.selectedOfferId
                      ? "border-permdal-500 bg-white shadow-brand-soft"
                      : "border-black/8 bg-white/75 hover:bg-white",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{displayProductName(state.productById.get(offer.produktId))}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {offer.id} · {offer.year ?? "-"}
                      </div>
                    </div>
                    <Badge variant={offer.mengeVerfuegbar > 0 ? "default" : "secondary"}>
                      {offer.mengeVerfuegbar}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                    <span>{getOfferPriceSummary(offer)}</span>
                    <span>{displayUnitLabel(offer.einheit)}</span>
                  </div>
                </button>
              ))}
              {lane.offers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 px-4 py-5 text-sm text-muted-foreground">
                  Keine Angebote in dieser Gruppe.
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function WorkbenchBrowser({
  state,
  className,
}: {
  state: SharedAdminState;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/80 bg-card/95 shadow-brand-soft", className)}>
      <CardHeader className="gap-2 px-4 py-4">
        <CardTitle className="font-mono text-base tracking-tight">Arbeitsbereich-Navigator</CardTitle>
        <CardDescription>Dichte, tastaturfreundliche Listen für schnellen Kontextwechsel.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 px-4 pb-4 pt-0 xl:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-background/85">
          <div className="border-b border-border/70 px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Produkte
          </div>
          <div className="flex max-h-[22rem] flex-col overflow-auto">
            {state.visibleProducts.map((product, index) => (
              <button
                key={product.id}
                type="button"
                onClick={() => state.selectProduct(product.id)}
                className={cn(
                  "grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-border/50 px-3 py-2 text-left font-mono text-sm last:border-b-0",
                  product.id === state.selectedProductId ? "bg-permdal-50 text-permdal-900" : "hover:bg-muted/70",
                )}
              >
                <span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                <span className="truncate">{displayProductName(product)}</span>
                <span className="text-xs text-muted-foreground">{displayValueLabel(product.hauptkategorie)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/85">
          <div className="border-b border-border/70 px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Angebote
          </div>
          <div className="flex max-h-[22rem] flex-col overflow-auto">
            {state.visibleOffers.map((offer, index) => (
              <button
                key={offer.id}
                type="button"
                onClick={() => state.selectOffer(offer.id)}
                className={cn(
                  "grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-border/50 px-3 py-2 text-left font-mono text-sm last:border-b-0",
                  offer.id === state.selectedOfferId ? "bg-lilac-50 text-lilac-900" : "hover:bg-muted/70",
                )}
              >
                <span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                <span className="truncate">{displayProductName(state.productById.get(offer.produktId))}</span>
                <span className="text-xs text-muted-foreground">{offer.year ?? "-"}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/85 xl:col-span-2">
          <div className="border-b border-border/70 px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Biete / Suche
          </div>
          <div className="flex max-h-[18rem] flex-col overflow-auto">
            {state.visibleBieteSucheEintraege.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => state.selectBieteSuche(entry.id)}
                className={cn(
                  "grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-border/50 px-3 py-2 text-left font-mono text-sm last:border-b-0",
                  entry.id === state.selectedBieteSucheId ? "bg-amber-50 text-amber-900" : "hover:bg-muted/70",
                )}
              >
                <span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                <span className="truncate">{entry.titel}</span>
                <span className="text-xs text-muted-foreground">{entry.modus}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
