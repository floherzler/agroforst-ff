'use client';

import { FormEvent, useEffect, useState } from "react";

import { verifyPayment } from "@/lib/appwrite/appwriteFunctions";
import { findPaymentIdByRef } from "@/lib/appwrite/appwriteMemberships";
import {
  subscribeToProdukte,
  subscribeToStaffeln,
  upsertProdukt,
  upsertStaffel,
} from "@/lib/appwrite/appwriteProducts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const hauptkategorieValues = [
  "Obst",
  "Gemuese",
  "Kraeuter",
  "Blumen",
  "Maschine",
  "Dienstleistung",
  "Sonstiges",
] as const;

const unterkategorieValues = [
  "Huelsenfruechte",
  "Kohlgemuese",
  "Wurzel-/Knollengemuese",
  "Blattgemuese/Salat",
  "Fruchtgemuese",
  "Zwiebelgemuese",
  "Kernobst",
  "Steinobst",
  "Beeren",
  "Zitrusfruechte",
  "Schalenfruechte",
] as const;

const lebensdauerValues = ["einjaehrig", "zweijaehrig", "mehrjaehrig"] as const;

const offerUnits = [
  { value: "piece", label: "Stueck" },
  { value: "gram", label: "Gramm" },
  { value: "bundle", label: "Bund" },
  { value: "liter", label: "Liter" },
] as const;

type FunctionStatus = {
  state: "idle" | "loading" | "success" | "error";
  message?: string;
};

type ProductFormState = {
  id: string;
  name: string;
  sorte: string;
  hauptkategorie: string;
  unterkategorie: string;
  lebensdauer: string;
  fruchtfolgeVor: string;
  fruchtfolgeNach: string;
  bodenansprueche: string;
  begleitpflanzen: string;
  saisonalitaet: string;
  notes: string;
};

type OfferFormState = {
  id: string;
  produktId: string;
  year: string;
  menge: string;
  mengeVerfuegbar: string;
  mengeAbgeholt: string;
  einheit: string;
  euroPreis: string;
  producerPreis: string;
  standardPreis: string;
  memberPreis: string;
  expectedRevenue: string;
  saatPflanzDatum: string;
  ernteProjektion: string;
  pickupAt: string;
  beschreibung: string;
};

type PaymentFormState = {
  paymentId: string;
  membershipId: string;
  status: string;
  amount: string;
  note: string;
};

function splitList(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function splitMonths(value: string): number[] {
  return Array.from(
    new Set(
      splitList(value)
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry >= 1 && entry <= 12),
    ),
  ).sort((left, right) => left - right);
}

function joinList(values: string[] | undefined): string {
  return Array.isArray(values) ? values.join(", ") : "";
}

function toDateInput(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toDateTimeInput(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function fromDateTimeInput(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function formatCurrency(value?: number): string {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return "-";
  }

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value ?? 0);
}

function displayProductName(product?: Produkt): string {
  if (!product) {
    return "Unbekanntes Produkt";
  }

  return [product.name, product.sorte].filter(Boolean).join(" - ");
}

function canonicalUnit(value?: string): string {
  switch ((value ?? "").trim().toLowerCase()) {
    case "stueck":
    case "stuck":
    case "piece":
      return "piece";
    case "gramm":
    case "gram":
    case "g":
      return "gram";
    case "bund":
    case "bundle":
      return "bundle";
    case "liter":
    case "l":
      return "liter";
    default:
      return (value ?? "").trim().toLowerCase();
  }
}

function emptyProductForm(): ProductFormState {
  return {
    id: "",
    name: "",
    sorte: "",
    hauptkategorie: "",
    unterkategorie: "",
    lebensdauer: "",
    fruchtfolgeVor: "",
    fruchtfolgeNach: "",
    bodenansprueche: "",
    begleitpflanzen: "",
    saisonalitaet: "",
    notes: "",
  };
}

function emptyOfferForm(defaultProductId = ""): OfferFormState {
  return {
    id: "",
    produktId: defaultProductId,
    year: String(new Date().getFullYear()),
    menge: "",
    mengeVerfuegbar: "",
    mengeAbgeholt: "0",
    einheit: "gram",
    euroPreis: "",
    producerPreis: "",
    standardPreis: "",
    memberPreis: "",
    expectedRevenue: "",
    saatPflanzDatum: "",
    ernteProjektion: "",
    pickupAt: "",
    beschreibung: "",
  };
}

function productToFormState(product: Produkt): ProductFormState {
  return {
    id: product.id,
    name: product.name,
    sorte: product.sorte,
    hauptkategorie: product.hauptkategorie,
    unterkategorie: product.unterkategorie,
    lebensdauer: product.lebensdauer,
    fruchtfolgeVor: joinList(product.fruchtfolgeVor),
    fruchtfolgeNach: joinList(product.fruchtfolgeNach),
    bodenansprueche: joinList(product.bodenansprueche),
    begleitpflanzen: joinList(product.begleitpflanzen),
    saisonalitaet: (product.saisonalitaet ?? []).join(", "),
    notes: product.notes ?? "",
  };
}

function offerToFormState(offer: Staffel): OfferFormState {
  return {
    id: offer.id,
    produktId: offer.produktId,
    year: offer.year ? String(offer.year) : String(new Date().getFullYear()),
    menge: String(offer.menge ?? ""),
    mengeVerfuegbar: String(offer.mengeVerfuegbar ?? ""),
    mengeAbgeholt: String(offer.mengeAbgeholt ?? 0),
    einheit: canonicalUnit(offer.einheit) || "gram",
    euroPreis: String(offer.euroPreis ?? ""),
    producerPreis: offer.producerPreis === undefined ? "" : String(offer.producerPreis),
    standardPreis: offer.standardPreis === undefined ? "" : String(offer.standardPreis),
    memberPreis: offer.memberPreis === undefined ? "" : String(offer.memberPreis),
    expectedRevenue: offer.expectedRevenue === undefined ? "" : String(offer.expectedRevenue),
    saatPflanzDatum: toDateInput(offer.saatPflanzDatum),
    ernteProjektion: joinList(offer.ernteProjektion),
    pickupAt: toDateTimeInput(offer.pickupAt),
    beschreibung: offer.beschreibung ?? "",
  };
}

function parseRequiredNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} muss eine Zahl sein.`);
  }
  return parsed;
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error("Eine optionale Zahl ist ungueltig.");
  }

  return parsed;
}

function StatusMessage({ status }: { status: FunctionStatus }) {
  if (!status.message) {
    return null;
  }

  return (
    <p
      className={
        status.state === "success"
          ? "text-sm text-green-700"
          : "text-sm text-red-700"
      }
    >
      {status.message}
    </p>
  );
}

function applyRealtimeRecord<T extends { id: string }>(
  records: T[],
  type: "create" | "update" | "delete",
  record: T,
): T[] {
  if (type === "delete") {
    return records.filter((entry) => entry.id !== record.id);
  }

  const existingIndex = records.findIndex((entry) => entry.id === record.id);
  if (existingIndex === -1) {
    return [...records, record];
  }

  return records.map((entry) => (entry.id === record.id ? record : entry));
}

export default function ZentraleAdmin({
  initialStaffeln,
  initialProdukte,
}: {
  initialStaffeln: Staffel[];
  initialProdukte: Produkt[];
}) {
  const [produkte, setProdukte] = useState<Produkt[]>(initialProdukte);
  const [staffeln, setStaffeln] = useState<Staffel[]>(initialStaffeln);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm());
  const [offerForm, setOfferForm] = useState<OfferFormState>(emptyOfferForm());
  const [productStatus, setProductStatus] = useState<FunctionStatus>({ state: "idle" });
  const [offerStatus, setOfferStatus] = useState<FunctionStatus>({ state: "idle" });
  const [productFilter, setProductFilter] = useState("");
  const [offerFilter, setOfferFilter] = useState("");
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    paymentId: "",
    membershipId: "",
    status: "bezahlt",
    amount: "",
    note: "",
  });
  const [paymentResult, setPaymentResult] = useState<FunctionStatus>({ state: "idle" });
  const [refSearchValue, setRefSearchValue] = useState("");
  const [refSearchStatus, setRefSearchStatus] = useState<FunctionStatus>({ state: "idle" });

  const productById = new Map(produkte.map((product) => [product.id, product]));
  const selectedProduct =
    selectedProductId === null
      ? null
      : produkte.find((product) => product.id === selectedProductId) ?? null;
  const selectedOffer =
    selectedOfferId === null
      ? null
      : staffeln.find((offer) => offer.id === selectedOfferId) ?? null;

  const visibleProducts = [...produkte]
    .filter((product) => {
      const search = productFilter.trim().toLowerCase();
      if (!search) {
        return true;
      }

      return [product.id, product.name, product.sorte, product.hauptkategorie]
        .join(" ")
        .toLowerCase()
        .includes(search);
    })
    .sort((left, right) =>
      displayProductName(left).localeCompare(displayProductName(right), "de"),
    );

  const visibleOffers = [...staffeln]
    .filter((offer) => {
      const search = offerFilter.trim().toLowerCase();
      if (!search) {
        return true;
      }

      const product = productById.get(offer.produktId);
      return [offer.id, offer.produktId, displayProductName(product), offer.year ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(search);
    })
    .sort((left, right) => {
      const yearDelta = (right.year ?? 0) - (left.year ?? 0);
      if (yearDelta !== 0) {
        return yearDelta;
      }

      return displayProductName(productById.get(left.produktId)).localeCompare(
        displayProductName(productById.get(right.produktId)),
        "de",
      );
    });

  useEffect(() => {
    if (selectedProduct) {
      setProductForm(productToFormState(selectedProduct));
      return;
    }

    setProductForm(emptyProductForm());
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedOffer) {
      setOfferForm(offerToFormState(selectedOffer));
      return;
    }

    setOfferForm(emptyOfferForm(selectedProductId ?? ""));
  }, [selectedOffer, selectedProductId]);

  useEffect(() => {
    const unsubscribeOffers = subscribeToStaffeln(({ type, record }) => {
      setStaffeln((current) => applyRealtimeRecord(current, type, record));
    });

    const unsubscribeProducts = subscribeToProdukte(({ type, record }) => {
      setProdukte((current) => applyRealtimeRecord(current, type, record));
    });

    return () => {
      unsubscribeOffers();
      unsubscribeProducts();
    };
  }, []);

  const handleCreateOrUpdateProdukt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProductStatus({ state: "loading" });

    try {
      const name = productForm.name.trim();
      const hauptkategorie = productForm.hauptkategorie.trim();

      if (!name) {
        throw new Error("Produktname ist erforderlich.");
      }

      if (!hauptkategorie) {
        throw new Error("Hauptkategorie ist erforderlich.");
      }

      const saved = await upsertProdukt({
        id: productForm.id.trim() || undefined,
        name,
        sorte: productForm.sorte.trim() || undefined,
        hauptkategorie,
        unterkategorie: productForm.unterkategorie.trim() || undefined,
        lebensdauer: productForm.lebensdauer.trim() || undefined,
        fruchtfolgeVor: splitList(productForm.fruchtfolgeVor),
        fruchtfolgeNach: splitList(productForm.fruchtfolgeNach),
        bodenansprueche: splitList(productForm.bodenansprueche),
        begleitpflanzen: splitList(productForm.begleitpflanzen),
        saisonalitaet: splitMonths(productForm.saisonalitaet),
        notes: productForm.notes.trim() || undefined,
      });

      setSelectedProductId(saved.id);

      setProductStatus({
        state: "success",
        message: selectedProductId ? "Produkt wurde aktualisiert." : "Produkt wurde angelegt.",
      });
    } catch (rawError) {
      const message =
        rawError instanceof Error
          ? rawError.message
          : String(rawError ?? "Produkt konnte nicht gespeichert werden.");
      setProductStatus({ state: "error", message });
    }
  };

  const handleCreateOrUpdateAngebot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOfferStatus({ state: "loading" });

    try {
      const produktId = offerForm.produktId.trim();
      if (!produktId) {
        throw new Error("Produkt ist erforderlich.");
      }

      const menge = parseRequiredNumber(offerForm.menge, "Projektionsmenge");
      const mengeVerfuegbar = offerForm.mengeVerfuegbar.trim()
        ? parseRequiredNumber(offerForm.mengeVerfuegbar, "Verfuegbare Menge")
        : menge;
      const mengeAbgeholt = offerForm.mengeAbgeholt.trim()
        ? parseRequiredNumber(offerForm.mengeAbgeholt, "Reservierte Menge")
        : 0;
      const euroPreis = parseRequiredNumber(offerForm.euroPreis, "Preis");
      const year = offerForm.year.trim()
        ? parseRequiredNumber(offerForm.year, "Jahr")
        : undefined;

      const saved = await upsertStaffel({
        id: offerForm.id.trim() || undefined,
        produktId,
        year,
        menge,
        mengeVerfuegbar,
        mengeAbgeholt,
        einheit: canonicalUnit(offerForm.einheit) || "gram",
        euroPreis,
        producerPreis: parseOptionalNumber(offerForm.producerPreis),
        standardPreis: parseOptionalNumber(offerForm.standardPreis),
        memberPreis: parseOptionalNumber(offerForm.memberPreis),
        expectedRevenue: parseOptionalNumber(offerForm.expectedRevenue),
        saatPflanzDatum: offerForm.saatPflanzDatum.trim() || undefined,
        ernteProjektion: splitList(offerForm.ernteProjektion),
        pickupAt: fromDateTimeInput(offerForm.pickupAt),
        beschreibung: offerForm.beschreibung.trim() || undefined,
      });

      setSelectedOfferId(saved.id);

      setOfferStatus({
        state: "success",
        message: selectedOfferId ? "Angebot wurde aktualisiert." : "Angebot wurde angelegt.",
      });
    } catch (rawError) {
      const message =
        rawError instanceof Error
          ? rawError.message
          : String(rawError ?? "Angebot konnte nicht gespeichert werden.");
      setOfferStatus({ state: "error", message });
    }
  };

  const handleVerifyPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaymentResult({ state: "loading" });

    try {
      const paymentId = paymentForm.paymentId.trim();
      if (!paymentId) {
        throw new Error("Payment-ID ist erforderlich.");
      }

      await verifyPayment({
        paymentId,
        status: paymentForm.status,
        membershipId: paymentForm.membershipId.trim() || undefined,
        amount: paymentForm.amount.trim()
          ? parseRequiredNumber(paymentForm.amount, "Betrag")
          : undefined,
        note: paymentForm.note.trim() || undefined,
      });

      setPaymentForm({
        paymentId: "",
        membershipId: "",
        status: "bezahlt",
        amount: "",
        note: "",
      });
      setPaymentResult({ state: "success", message: "Zahlung wurde validiert." });
    } catch (rawError) {
      const message =
        rawError instanceof Error
          ? rawError.message
          : String(rawError ?? "Zahlung konnte nicht validiert werden.");
      setPaymentResult({ state: "error", message });
    }
  };

  const handleFindPaymentByRef = async () => {
    const ref = refSearchValue.trim();
    if (!ref) {
      setRefSearchStatus({ state: "error", message: "Bitte eine Referenz eingeben." });
      return;
    }

    setRefSearchStatus({ state: "loading" });
    try {
      const paymentId = await findPaymentIdByRef(ref);
      if (!paymentId) {
        setRefSearchStatus({ state: "error", message: "Keine Zahlung zu dieser Referenz gefunden." });
        return;
      }

      setPaymentForm((current) => ({ ...current, paymentId }));
      setRefSearchStatus({ state: "success", message: `Payment-ID gesetzt: ${paymentId}` });
    } catch (rawError) {
      const message =
        rawError instanceof Error
          ? rawError.message
          : String(rawError ?? "Referenz konnte nicht gesucht werden.");
      setRefSearchStatus({ state: "error", message });
    }
  };

  return (
    <div className="w-full px-4 pb-8">
      <Tabs defaultValue="produkte" className="flex flex-col gap-6">
        <TabsList className="grid w-full grid-cols-3 border border-gray-200/70 bg-white/80">
          <TabsTrigger value="produkte">Produkte</TabsTrigger>
          <TabsTrigger value="angebote">Angebote</TabsTrigger>
          <TabsTrigger value="finanzen">Finanzen</TabsTrigger>
        </TabsList>

        <TabsContent value="produkte" className="flex flex-col gap-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
            <Card className="border-gray-200 bg-white shadow-md">
              <CardHeader className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <CardTitle>{selectedProduct ? "Produkt bearbeiten" : "Produkt anlegen"}</CardTitle>
                    <CardDescription>
                      Stammdaten fuer den Produktkatalog pflegen. Updates laufen ueber dieselbe
                      Appwrite-Funktion wie die Erstanlage.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-4" onSubmit={handleCreateOrUpdateProdukt}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Produkt-ID
                      <Input
                        value={productForm.id}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, id: event.target.value }))
                        }
                        placeholder="z. B. apple_topaz"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Name
                      <Input
                        value={productForm.name}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Produktname"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Sorte
                      <Input
                        value={productForm.sorte}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, sorte: event.target.value }))
                        }
                        placeholder="Variante oder Sorte"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Hauptkategorie
                      <Select
                        value={productForm.hauptkategorie}
                        onValueChange={(value) =>
                          setProductForm((current) => ({ ...current, hauptkategorie: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kategorie waehlen" />
                        </SelectTrigger>
                        <SelectContent>
                          {hauptkategorieValues.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Unterkategorie
                      <Select
                        value={productForm.unterkategorie || "__empty__"}
                        onValueChange={(value) =>
                          setProductForm((current) => ({
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
                              {value}
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
                          setProductForm((current) => ({
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
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Fruchtfolge davor
                      <Textarea
                        value={productForm.fruchtfolgeVor}
                        onChange={(event) =>
                          setProductForm((current) => ({
                            ...current,
                            fruchtfolgeVor: event.target.value,
                          }))
                        }
                        placeholder="Komma- oder zeilengetrennt"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Fruchtfolge danach
                      <Textarea
                        value={productForm.fruchtfolgeNach}
                        onChange={(event) =>
                          setProductForm((current) => ({
                            ...current,
                            fruchtfolgeNach: event.target.value,
                          }))
                        }
                        placeholder="Komma- oder zeilengetrennt"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Bodenansprueche
                      <Textarea
                        value={productForm.bodenansprueche}
                        onChange={(event) =>
                          setProductForm((current) => ({
                            ...current,
                            bodenansprueche: event.target.value,
                          }))
                        }
                        placeholder="Komma- oder zeilengetrennt"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Begleitpflanzen
                      <Textarea
                        value={productForm.begleitpflanzen}
                        onChange={(event) =>
                          setProductForm((current) => ({
                            ...current,
                            begleitpflanzen: event.target.value,
                          }))
                        }
                        placeholder="Komma- oder zeilengetrennt"
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Saisonmonate
                    <Input
                      value={productForm.saisonalitaet}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          saisonalitaet: event.target.value,
                        }))
                      }
                      placeholder="z. B. 7, 8, 9"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Notizen
                    <Textarea
                      value={productForm.notes}
                      onChange={(event) =>
                        setProductForm((current) => ({ ...current, notes: event.target.value }))
                      }
                      placeholder="Interne Hinweise zum Produkt"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      className="bg-permdal-800 text-white hover:bg-permdal-700"
                      disabled={productStatus.state === "loading"}
                    >
                      {productStatus.state === "loading"
                        ? "Speichert..."
                        : selectedProduct
                          ? "Produkt aktualisieren"
                          : "Produkt anlegen"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setSelectedProductId(null);
                        setProductStatus({ state: "idle" });
                        setProductForm(emptyProductForm());
                      }}
                    >
                      Neues Formular
                    </Button>
                  </div>

                  <StatusMessage status={productStatus} />
                </form>
              </CardContent>
            </Card>

            <Card className="border-gray-200 bg-white shadow-md">
              <CardHeader className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <CardTitle>Produktkatalog</CardTitle>
                    <CardDescription>
                      Live-Liste aller Produkte. Ein Klick auf eine Zeile laedt sie in den Editor.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{visibleProducts.length} Produkte</Badge>
                </div>
                <Input
                  value={productFilter}
                  onChange={(event) => setProductFilter(event.target.value)}
                  placeholder="Nach ID, Name, Sorte oder Kategorie filtern"
                />
              </CardHeader>
              <CardContent className="overflow-x-auto">
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
                    {visibleProducts.map((product) => (
                      <TableRow
                        key={product.id}
                        className={
                          product.id === selectedProductId ? "bg-muted/60" : "cursor-pointer"
                        }
                        onClick={() => {
                          setSelectedProductId(product.id);
                          setProductStatus({ state: "idle" });
                        }}
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
                            <Badge variant="outline">{product.hauptkategorie}</Badge>
                            {product.unterkategorie ? (
                              <Badge variant="secondary">{product.unterkategorie}</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(product.saisonalitaet ?? []).length > 0
                            ? product.saisonalitaet.join(", ")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="angebote" className="flex flex-col gap-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
            <Card className="border-gray-200 bg-white shadow-md">
              <CardHeader className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <CardTitle>{selectedOffer ? "Angebot bearbeiten" : "Angebot anlegen"}</CardTitle>
                    <CardDescription>
                      Produktbezug, Menge, Preise und Zeitfenster fuer die aktuelle Saison pflegen.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-4" onSubmit={handleCreateOrUpdateAngebot}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Angebots-ID
                      <Input
                        value={offerForm.id}
                        onChange={(event) =>
                          setOfferForm((current) => ({ ...current, id: event.target.value }))
                        }
                        placeholder="Leer lassen fuer auto-ID"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Produkt
                      <Select
                        value={offerForm.produktId}
                        onValueChange={(value) =>
                          setOfferForm((current) => ({ ...current, produktId: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Produkt waehlen" />
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

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Jahr
                      <Input
                        type="number"
                        min="2000"
                        max="2100"
                        value={offerForm.year}
                        onChange={(event) =>
                          setOfferForm((current) => ({ ...current, year: event.target.value }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Einheit
                      <Select
                        value={offerForm.einheit}
                        onValueChange={(value) =>
                          setOfferForm((current) => ({ ...current, einheit: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Einheit waehlen" />
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
                      Projektionsmenge
                      <Input
                        type="number"
                        min="0"
                        value={offerForm.menge}
                        onChange={(event) =>
                          setOfferForm((current) => ({ ...current, menge: event.target.value }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Verfuegbar
                      <Input
                        type="number"
                        min="0"
                        value={offerForm.mengeVerfuegbar}
                        onChange={(event) =>
                          setOfferForm((current) => ({
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
                          setOfferForm((current) => ({
                            ...current,
                            mengeAbgeholt: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Verkaufspreis
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={offerForm.euroPreis}
                        onChange={(event) =>
                          setOfferForm((current) => ({ ...current, euroPreis: event.target.value }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Erwarteter Umsatz
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={offerForm.expectedRevenue}
                        onChange={(event) =>
                          setOfferForm((current) => ({
                            ...current,
                            expectedRevenue: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Produzentenpreis
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={offerForm.producerPreis}
                        onChange={(event) =>
                          setOfferForm((current) => ({
                            ...current,
                            producerPreis: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Standardpreis
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={offerForm.standardPreis}
                        onChange={(event) =>
                          setOfferForm((current) => ({
                            ...current,
                            standardPreis: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Mitgliederpreis
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={offerForm.memberPreis}
                        onChange={(event) =>
                          setOfferForm((current) => ({
                            ...current,
                            memberPreis: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Saat-/Pflanzdatum
                      <Input
                        type="date"
                        value={offerForm.saatPflanzDatum}
                        onChange={(event) =>
                          setOfferForm((current) => ({
                            ...current,
                            saatPflanzDatum: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium">
                      Abholung
                      <Input
                        type="datetime-local"
                        value={offerForm.pickupAt}
                        onChange={(event) =>
                          setOfferForm((current) => ({ ...current, pickupAt: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Ernteprojektion
                    <Textarea
                      value={offerForm.ernteProjektion}
                      onChange={(event) =>
                        setOfferForm((current) => ({
                          ...current,
                          ernteProjektion: event.target.value,
                        }))
                      }
                      placeholder="Komma- oder zeilengetrennte Datumswerte"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Beschreibung
                    <Textarea
                      value={offerForm.beschreibung}
                      onChange={(event) =>
                        setOfferForm((current) => ({
                          ...current,
                          beschreibung: event.target.value,
                        }))
                      }
                      placeholder="Kurzer interner oder externer Hinweis"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      className="bg-permdal-800 text-white hover:bg-permdal-700"
                      disabled={offerStatus.state === "loading"}
                    >
                      {offerStatus.state === "loading"
                        ? "Speichert..."
                        : selectedOffer
                          ? "Angebot aktualisieren"
                          : "Angebot anlegen"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setSelectedOfferId(null);
                        setOfferStatus({ state: "idle" });
                        setOfferForm(emptyOfferForm(selectedProductId ?? ""));
                      }}
                    >
                      Neues Formular
                    </Button>
                  </div>

                  <StatusMessage status={offerStatus} />
                </form>
              </CardContent>
            </Card>

            <Card className="border-gray-200 bg-white shadow-md">
              <CardHeader className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <CardTitle>Angebotsliste</CardTitle>
                    <CardDescription>
                      Live-Liste aller Angebote mit Produktbezug, Preisen und Verfuegbarkeit.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{visibleOffers.length} Angebote</Badge>
                </div>
                <Input
                  value={offerFilter}
                  onChange={(event) => setOfferFilter(event.target.value)}
                  placeholder="Nach Produkt, Angebots-ID oder Jahr filtern"
                />
              </CardHeader>
              <CardContent className="flex flex-col gap-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Angebot</TableHead>
                      <TableHead>Produkt</TableHead>
                      <TableHead>Jahr</TableHead>
                      <TableHead>Preis</TableHead>
                      <TableHead>Verfuegbar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleOffers.map((offer) => {
                      const product = productById.get(offer.produktId);
                      return (
                        <TableRow
                          key={offer.id}
                          className={
                            offer.id === selectedOfferId ? "bg-muted/60" : "cursor-pointer"
                          }
                          onClick={() => {
                            setSelectedOfferId(offer.id);
                            setOfferStatus({ state: "idle" });
                          }}
                        >
                          <TableCell className="font-mono text-xs">{offer.id}</TableCell>
                          <TableCell className="font-medium">
                            {displayProductName(product)}
                          </TableCell>
                          <TableCell>{offer.year ?? "-"}</TableCell>
                          <TableCell>{formatCurrency(offer.euroPreis)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={offer.mengeVerfuegbar > 0 ? "default" : "secondary"}
                            >
                              {offer.mengeVerfuegbar} {offer.einheit}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {selectedOffer ? (
                  <>
                    <Separator />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="font-medium">Aktuell gewaehltes Angebot</span>
                        <span className="text-muted-foreground">{selectedOffer.id}</span>
                        <span>{displayProductName(productById.get(selectedOffer.produktId))}</span>
                      </div>
                      <div className="grid gap-1 text-sm text-muted-foreground">
                        <span>Projektionsmenge: {selectedOffer.menge} {selectedOffer.einheit}</span>
                        <span>Reserviert: {selectedOffer.mengeAbgeholt} {selectedOffer.einheit}</span>
                        <span>Abholung: {selectedOffer.pickupAt ? new Date(selectedOffer.pickupAt).toLocaleString("de-DE") : "-"}</span>
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="finanzen" className="flex flex-col gap-6">
          <Card className="border-gray-200 bg-white shadow-md">
            <CardHeader className="flex flex-col gap-2">
              <CardTitle>Zahlung verifizieren</CardTitle>
              <CardDescription>
                Bestehenden Zahlungsdatensatz suchen und den Status ueber die Appwrite-Funktion
                aktualisieren.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-6" onSubmit={handleVerifyPayment}>
                <div className="rounded-lg bg-muted/40 p-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Rechnungsreferenz suchen</label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        value={refSearchValue}
                        onChange={(event) => setRefSearchValue(event.target.value)}
                        placeholder="z. B. MB2026-001"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleFindPaymentByRef}
                        disabled={refSearchStatus.state === "loading"}
                      >
                        {refSearchStatus.state === "loading" ? "Sucht..." : "Suchen"}
                      </Button>
                    </div>
                    <StatusMessage status={refSearchStatus} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Payment-ID
                    <Input
                      value={paymentForm.paymentId}
                      onChange={(event) =>
                        setPaymentForm((current) => ({ ...current, paymentId: event.target.value }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Mitgliedschaft-ID
                    <Input
                      value={paymentForm.membershipId}
                      onChange={(event) =>
                        setPaymentForm((current) => ({
                          ...current,
                          membershipId: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Status
                    <Select
                      value={paymentForm.status}
                      onValueChange={(value) =>
                        setPaymentForm((current) => ({ ...current, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bezahlt">bezahlt</SelectItem>
                        <SelectItem value="warten">warten</SelectItem>
                        <SelectItem value="teilbezahlt">teilbezahlt</SelectItem>
                        <SelectItem value="offen">offen</SelectItem>
                        <SelectItem value="storniert">storniert</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Betrag
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(event) =>
                        setPaymentForm((current) => ({ ...current, amount: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-sm font-medium">
                  Notiz
                  <Textarea
                    value={paymentForm.note}
                    onChange={(event) =>
                      setPaymentForm((current) => ({ ...current, note: event.target.value }))
                    }
                    placeholder="Optionaler interner Vermerk"
                  />
                </label>

                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    className="bg-permdal-800 text-white hover:bg-permdal-700"
                    disabled={paymentResult.state === "loading"}
                  >
                    {paymentResult.state === "loading" ? "Validiert..." : "Zahlung validieren"}
                  </Button>
                </div>

                <StatusMessage status={paymentResult} />
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
