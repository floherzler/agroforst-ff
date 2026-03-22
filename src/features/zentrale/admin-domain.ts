"use client";

export const hauptkategorieValues = [
  "Obst",
  "Gemuese",
  "Kraeuter",
  "Blumen",
  "Maschine",
  "Dienstleistung",
  "Sonstiges",
] as const;

export const unterkategorieValues = [
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

export const lebensdauerValues = ["einjaehrig", "zweijaehrig", "mehrjaehrig"] as const;

export const offerUnits = [
  { value: "stueck", label: "Stück" },
  { value: "kilogramm", label: "Kilogramm" },
  { value: "bund", label: "Bund" },
  { value: "liter", label: "Liter" },
] as const;

const labelByValue: Record<string, string> = {
  Gemuese: "Gemüse",
  Kraeuter: "Kräuter",
  Huelsenfruechte: "Hülsenfrüchte",
  Kohlgemuese: "Kohlgemüse",
  "Wurzel-/Knollengemuese": "Wurzel-/Knollengemüse",
  "Blattgemuese/Salat": "Blattgemüse / Salat",
  Fruchtgemuese: "Fruchtgemüse",
  Zwiebelgemuese: "Zwiebelgemüse",
  Zitrusfruechte: "Zitrusfrüchte",
  Schalenfruechte: "Schalenfrüchte",
  einjaehrig: "einjährig",
  zweijaehrig: "zweijährig",
  mehrjaehrig: "mehrjährig",
};

export type FunctionStatus = {
  state: "idle" | "loading" | "success" | "error";
  message?: string;
};

export type ProductFormState = {
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

export type OfferFormState = {
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

export function splitList(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function splitMonths(value: string): number[] {
  return Array.from(
    new Set(
      splitList(value)
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry >= 1 && entry <= 12),
    ),
  ).sort((left, right) => left - right);
}

export function joinList(values: string[] | undefined): string {
  return Array.isArray(values) ? values.join(", ") : "";
}

export function toDateInput(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function toDateTimeInput(value?: string): string {
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

export function fromDateTimeInput(value: string): string | undefined {
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

export function formatCurrency(value?: number): string {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return "-";
  }

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value ?? 0);
}

export function displayProductName(product?: Produkt): string {
  if (!product) {
    return "Unbekanntes Produkt";
  }

  return [product.name, product.sorte].filter(Boolean).join(" - ");
}

export function displayValueLabel(value?: string): string {
  if (!value) {
    return "";
  }

  return labelByValue[value] ?? value;
}

export function displayUnitLabel(value?: string): string {
  const canonical = canonicalUnit(value);
  return offerUnits.find((unit) => unit.value === canonical)?.label ?? value ?? "";
}

export function canonicalUnit(value?: string): string {
  switch ((value ?? "").trim().toLowerCase()) {
    case "stueck":
    case "stuck":
    case "stück":
    case "piece":
      return "stueck";
    case "kilogramm":
    case "kg":
    case "gramm":
    case "gram":
    case "g":
      return "kilogramm";
    case "bund":
    case "bundle":
      return "bund";
    case "liter":
    case "l":
      return "liter";
    default:
      return (value ?? "").trim().toLowerCase();
  }
}

export function emptyProductForm(): ProductFormState {
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

export function emptyOfferForm(defaultProductId = ""): OfferFormState {
  return {
    id: "",
    produktId: defaultProductId,
    year: String(new Date().getFullYear()),
    menge: "",
    mengeVerfuegbar: "",
    mengeAbgeholt: "0",
    einheit: "kilogramm",
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

export function productToFormState(product: Produkt): ProductFormState {
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

export function offerToFormState(offer: Staffel): OfferFormState {
  return {
    id: offer.id,
    produktId: offer.produktId,
    year: offer.year ? String(offer.year) : String(new Date().getFullYear()),
    menge: String(offer.menge ?? ""),
    mengeVerfuegbar: String(offer.mengeVerfuegbar ?? ""),
    mengeAbgeholt: String(offer.mengeAbgeholt ?? 0),
    einheit: canonicalUnit(offer.einheit) || "kilogramm",
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

export function parseRequiredNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} muss eine Zahl sein.`);
  }
  return parsed;
}

export function parseOptionalNumberField(value: string): number | undefined {
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

export function applyRealtimeRecord<T extends { id: string }>(
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
