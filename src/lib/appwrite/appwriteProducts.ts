import { ID, Query } from "appwrite";
import { z } from "zod";

import {
  appwriteClient as client,
  appwriteConfig,
  appwriteDatabases as databases,
  appwriteDocumentMetaSchema,
  appwriteStorage as storage,
  createRealtimeChangeType,
  ensureConfigured,
  parseNumber,
  parseOptionalNumber,
  parseOptionalString,
  parseRelationId,
  parseStringArray,
  RealtimeChange,
} from "@/lib/appwrite/shared";

const productDocumentSchema = appwriteDocumentMetaSchema.extend({
  name: z.string().min(1),
  sorte: z.string().optional().default(""),
  hauptkategorie: z.string().optional().default("Sonstiges"),
  unterkategorie: z.string().optional().default(""),
  lebensdauer: z.string().optional().default(""),
  fruchtfolge_vor: z.unknown().optional(),
  fruchtfolge_nach: z.unknown().optional(),
  bodenansprueche: z.unknown().optional(),
  begleitpflanzen: z.unknown().optional(),
  saisonalitaet: z.unknown().optional(),
  bild_datei_id: z.string().nullish(),
  notizen: z.string().nullish(),
});

const offerDocumentSchema = appwriteDocumentMetaSchema.extend({
  produkt: z.unknown().optional(),
  jahr: z.unknown().optional(),
  menge_verfuegbar: z.unknown().optional(),
  einheit: z.string().nullish().transform((value) => value ?? ""),
  menge: z.unknown().optional(),
  preis_pro_einheit_eur: z.unknown().optional(),
  saat_pflanz_datum: z.string().nullish().transform((value) => value ?? ""),
  ernte_projektion: z.unknown().optional(),
  menge_reserviert: z.unknown().optional(),
  erzeugerpreis_eur: z.unknown().optional(),
  standardpreis_eur: z.unknown().optional(),
  mitgliedspreis_eur: z.unknown().optional(),
  erwarteter_umsatz_eur: z.unknown().optional(),
  abholung_ab: z.string().nullish(),
  erstellt_von_user_id: z.string().nullish(),
  aktualisiert_von_user_id: z.string().nullish(),
  beschreibung: z.string().nullish(),
});

const blogPostDocumentSchema = appwriteDocumentMetaSchema.extend({
  titel: z.string().min(1),
  kurzbeschreibung: z.string().optional().default(""),
  inhalt: z.string().optional().default(""),
  schlagworte: z.unknown().optional(),
  autor_name: z.string().optional().default(""),
  veroeffentlicht_am: z.string().optional().default(""),
  aktualisiert_am: z.string().optional().default(""),
});

const feedbackInputSchema = z.object({
  userId: z.string().trim().min(1),
  text: z.string().trim().min(1),
});

const productListInputSchema = z.object({
  hauptkategorie: z.string().trim().optional(),
  search: z.string().trim().optional(),
  limit: z.number().int().positive().max(500).optional(),
});

const offerListInputSchema = z.object({
  produktId: z.string().trim().optional(),
  produktIds: z.array(z.string().trim().min(1)).optional(),
  limit: z.number().int().positive().max(500).optional(),
});

const previewImageInputSchema = z.object({
  imageId: z.string().trim().min(1),
  width: z.number().int().positive().max(4000).optional(),
  height: z.number().int().positive().max(4000).optional(),
});

const upsertProduktInputSchema = z.object({
  mode: z.enum(["create", "update"]).default("create"),
  id: z.string().trim().optional(),
  name: z.string().trim().min(1),
  sorte: z.string().trim().optional(),
  imageId: z.string().trim().optional(),
  hauptkategorie: z.string().trim().min(1),
  unterkategorie: z.string().trim().optional(),
  lebensdauer: z.string().trim().optional(),
  fruchtfolgeVor: z.array(z.string().trim()).optional(),
  fruchtfolgeNach: z.array(z.string().trim()).optional(),
  bodenansprueche: z.array(z.string().trim()).optional(),
  begleitpflanzen: z.array(z.string().trim()).optional(),
  saisonalitaet: z.array(z.number().int().min(1).max(12)).optional(),
  notes: z.string().trim().optional(),
});

const upsertAngebotInputSchema = z.object({
  id: z.string().trim().optional(),
  produktId: z.string().trim().min(1),
  year: z.number().int().min(2000).max(2100).optional(),
  menge: z.number().positive(),
  mengeVerfuegbar: z.number().nonnegative(),
  mengeAbgeholt: z.number().nonnegative().optional(),
  einheit: z.string().trim().min(1),
  euroPreis: z.number().nonnegative(),
  producerPreis: z.number().nonnegative().optional(),
  standardPreis: z.number().nonnegative().optional(),
  memberPreis: z.number().nonnegative().optional(),
  expectedRevenue: z.number().nonnegative().optional(),
  saatPflanzDatum: z.string().trim().optional(),
  ernteProjektion: z.array(z.string().trim()).optional(),
  pickupAt: z.string().trim().optional(),
  beschreibung: z.string().trim().optional(),
});

export type ProduktMitAngeboten = {
  produkt: Produkt;
  angebote: Angebot[];
};

function normalizeUnit(value: string): string {
  switch (value.trim().toLowerCase()) {
    case "stueck":
      return "Stück";
    case "kilogramm":
      return "Kilogramm";
    case "gramm":
      return "Kilogramm";
    case "bund":
      return "Bund";
    case "liter":
      return "Liter";
    default:
      return value;
  }
}

export function normalizeProdukt(raw: unknown): Produkt {
  const parsed = productDocumentSchema.parse(raw);
  const seasonalitaet = Array.from(
    new Set(
      (
        Array.isArray(parsed.saisonalitaet) ? parsed.saisonalitaet : []
      )
        .map((entry) => parseNumber(entry, Number.NaN))
        .filter((entry) => Number.isFinite(entry) && entry >= 1 && entry <= 12),
    ),
  ).sort((left, right) => left - right);

  return {
    id: parsed.$id,
    createdAt: parsed.$createdAt,
    name: parsed.name,
    sorte: parsed.sorte || "",
    hauptkategorie: parsed.hauptkategorie || "Sonstiges",
    unterkategorie: parsed.unterkategorie || "",
    lebensdauer: parsed.lebensdauer || "",
    fruchtfolgeVor: parseStringArray(parsed.fruchtfolge_vor),
    fruchtfolgeNach: parseStringArray(parsed.fruchtfolge_nach),
    bodenansprueche: parseStringArray(parsed.bodenansprueche),
    begleitpflanzen: parseStringArray(parsed.begleitpflanzen),
    saisonalitaet: seasonalitaet,
    imageId: parseOptionalString(parsed.bild_datei_id),
    notes: parseOptionalString(parsed.notizen),
  };
}

export function normalizeAngebot(raw: unknown): Angebot {
  const parsed = offerDocumentSchema.parse(raw);
  const parsedYear = parseOptionalNumber(parsed.jahr);
  return {
    id: parsed.$id,
    createdAt: parsed.$createdAt,
    produktId: parseRelationId(parsed.produkt) || "",
    year: parsedYear,
    mengeVerfuegbar: parseNumber(parsed.menge_verfuegbar),
    einheit: normalizeUnit(parsed.einheit || ""),
    menge: parseNumber(parsed.menge),
    euroPreis: parseNumber(parsed.preis_pro_einheit_eur),
    saatPflanzDatum: parsed.saat_pflanz_datum || "",
    ernteProjektion: parseStringArray(parsed.ernte_projektion),
    mengeAbgeholt: parseNumber(parsed.menge_reserviert),
    producerPreis: parseOptionalNumber(parsed.erzeugerpreis_eur),
    standardPreis: parseOptionalNumber(parsed.standardpreis_eur),
    memberPreis: parseOptionalNumber(parsed.mitgliedspreis_eur),
    expectedRevenue: parseOptionalNumber(parsed.erwarteter_umsatz_eur),
    pickupAt: parseOptionalString(parsed.abholung_ab),
    createdByUserId: parseOptionalString(parsed.erstellt_von_user_id),
    updatedByUserId: parseOptionalString(parsed.aktualisiert_von_user_id),
    beschreibung: parseOptionalString(parsed.beschreibung),
  };
}

export function normalizeBlogPost(raw: unknown): BlogPost {
  const parsed = blogPostDocumentSchema.parse(raw);
  return {
    id: parsed.$id,
    createdAt: parsed.$createdAt,
    title: parsed.titel,
    description: parsed.kurzbeschreibung || "",
    content: parsed.inhalt || "",
    tags: parseStringArray(parsed.schlagworte),
    writtenBy: parsed.autor_name || "",
    writtenAt: parsed.veroeffentlicht_am || parsed.$createdAt,
    updatedAt: parsed.aktualisiert_am || parsed.$createdAt,
  };
}

export async function listProdukte(
  input: {
    hauptkategorie?: string;
    search?: string;
    limit?: number;
  } = {},
): Promise<Produkt[]> {
  const parsedInput = productListInputSchema.parse(input);
  const queries = [Query.limit(parsedInput.limit ?? 200)];

  if (parsedInput.hauptkategorie) {
    queries.push(Query.equal("hauptkategorie", parsedInput.hauptkategorie));
  }

  if (parsedInput.search) {
    queries.push(Query.search("name", parsedInput.search));
  } else {
    queries.push(Query.orderAsc("name"));
  }

  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.productTableId, "Produkt-Tabelle"),
    queries,
  );

  return response.documents.map(normalizeProdukt);
}

export async function listAlleProdukte(): Promise<Produkt[]> {
  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.productTableId, "Produkt-Tabelle"),
    [Query.limit(500), Query.orderAsc("name")],
  );

  return response.documents.map(normalizeProdukt);
}

export async function listAngebote(
  input: {
    produktId?: string;
    produktIds?: string[];
    limit?: number;
  } = {},
): Promise<Angebot[]> {
  const parsedInput = offerListInputSchema.parse(input);
  const queries = [
    Query.limit(parsedInput.limit ?? 500),
    Query.orderDesc("$createdAt"),
  ];

  if (parsedInput.produktId) {
    queries.push(Query.equal("produkt", parsedInput.produktId));
  }

  if (parsedInput.produktIds && parsedInput.produktIds.length > 0) {
    queries.push(Query.equal("produkt", parsedInput.produktIds));
  }

  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.offerTableId, "Angebots-Tabelle"),
    queries,
  );

  return response.documents.map(normalizeAngebot);
}

export async function getAngebotById(id: string): Promise<Angebot> {
  const response = await databases.getDocument(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.offerTableId, "Angebots-Tabelle"),
    z.string().trim().min(1).parse(id),
  );

  return normalizeAngebot(response);
}

export async function listProdukteMitAngeboten(): Promise<
  ProduktMitAngeboten[]
> {
  const [produkte, angebote] = await Promise.all([
    listAlleProdukte(),
    listAngebote(),
  ]);
  const angeboteByProdukt = new Map<string, Angebot[]>();

  for (const angebot of angebote) {
    const existing = angeboteByProdukt.get(angebot.produktId) ?? [];
    existing.push(angebot);
    angeboteByProdukt.set(angebot.produktId, existing);
  }

  return produkte.map((produkt) => ({
    produkt,
    angebote: angeboteByProdukt.get(produkt.id) ?? [],
  }));
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.postTableId, "Blog-Tabelle"),
    [Query.limit(500), Query.orderDesc("$createdAt")],
  );

  return response.documents.map(normalizeBlogPost);
}

export async function upsertProdukt(input: {
  mode?: "create" | "update";
  id?: string;
  name: string;
  sorte?: string;
  imageId?: string;
  hauptkategorie: string;
  unterkategorie?: string;
  lebensdauer?: string;
  fruchtfolgeVor?: string[];
  fruchtfolgeNach?: string[];
  bodenansprueche?: string[];
  begleitpflanzen?: string[];
  saisonalitaet?: number[];
  notes?: string;
}): Promise<Produkt> {
  const parsedInput = upsertProduktInputSchema.parse(input);
  const documentId = parsedInput.id || ID.unique();
  const payload = {
    name: parsedInput.name,
    sorte: parsedInput.sorte?.trim() || "",
    hauptkategorie: parsedInput.hauptkategorie,
    unterkategorie: parsedInput.unterkategorie?.trim() || "",
    lebensdauer: parsedInput.lebensdauer?.trim() || "",
    fruchtfolge_vor: parsedInput.fruchtfolgeVor ?? [],
    fruchtfolge_nach: parsedInput.fruchtfolgeNach ?? [],
    bodenansprueche: parsedInput.bodenansprueche ?? [],
    begleitpflanzen: parsedInput.begleitpflanzen ?? [],
    saisonalitaet: parsedInput.saisonalitaet ?? [],
    bild_datei_id: parsedInput.imageId?.trim() || null,
    notizen: parsedInput.notes?.trim() || undefined,
  };

  const response =
    parsedInput.mode === "update"
      ? await databases.updateDocument(
          ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
          ensureConfigured(appwriteConfig.productTableId, "Produkt-Tabelle"),
          z.string().trim().min(1).parse(documentId),
          payload,
        )
      : await databases.createDocument(
          ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
          ensureConfigured(appwriteConfig.productTableId, "Produkt-Tabelle"),
          documentId,
          payload,
        );

  return normalizeProdukt(response);
}

export async function uploadProduktImage(file: File): Promise<string> {
  const response = await storage.createFile(
    ensureConfigured(appwriteConfig.storageId, "Storage-Bucket"),
    ID.unique(),
    file,
  );

  return response.$id;
}

export async function upsertAngebot(input: {
  id?: string;
  produktId: string;
  year?: number;
  menge: number;
  mengeVerfuegbar: number;
  mengeAbgeholt?: number;
  einheit: string;
  euroPreis: number;
  producerPreis?: number;
  standardPreis?: number;
  memberPreis?: number;
  expectedRevenue?: number;
  saatPflanzDatum?: string;
  ernteProjektion?: string[];
  pickupAt?: string;
  beschreibung?: string;
}): Promise<Angebot> {
  const parsedInput = upsertAngebotInputSchema.parse(input);
  const documentId = parsedInput.id || ID.unique();

  const response = await databases.upsertDocument(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.offerTableId, "Angebots-Tabelle"),
    documentId,
    {
      produkt: parsedInput.produktId,
      jahr: parsedInput.year,
      menge: parsedInput.menge,
      menge_verfuegbar: parsedInput.mengeVerfuegbar,
      menge_reserviert: parsedInput.mengeAbgeholt ?? 0,
      einheit: parsedInput.einheit,
      preis_pro_einheit_eur: parsedInput.euroPreis,
      erzeugerpreis_eur: parsedInput.producerPreis,
      standardpreis_eur: parsedInput.standardPreis,
      mitgliedspreis_eur: parsedInput.memberPreis,
      erwarteter_umsatz_eur: parsedInput.expectedRevenue,
      saat_pflanz_datum: parsedInput.saatPflanzDatum || undefined,
      ernte_projektion: parsedInput.ernteProjektion ?? [],
      abholung_ab: parsedInput.pickupAt || undefined,
      beschreibung: parsedInput.beschreibung?.trim() || undefined,
    },
  );

  return normalizeAngebot(response);
}

export async function submitFeedbackMessage(input: {
  userId: string;
  text: string;
}): Promise<void> {
  const parsedInput = feedbackInputSchema.parse(input);

  await databases.createDocument(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(
      appwriteConfig.feedbackTableId,
      "Nachrichten-Tabelle",
    ),
    ID.unique(),
    {
      benutzer_id: parsedInput.userId,
      nachrichtstyp: "feedback",
      nachricht: parsedInput.text,
      status: "neu",
    },
  );
}

export function getProduktImagePreviewUrl(input: {
  imageId: string;
  width?: number;
  height?: number;
}): string {
  const parsedInput = previewImageInputSchema.parse(input);
  return String(
    storage.getFilePreview(
      ensureConfigured(appwriteConfig.storageId, "Storage-Bucket"),
      parsedInput.imageId,
      parsedInput.width ?? 160,
      parsedInput.height ?? 160,
    ),
  );
}

function subscribeToChannel<T>(
  channel: string,
  normalize: (raw: unknown) => T,
  onChange: (change: RealtimeChange<T>) => void,
) {
  return client.subscribe(channel, (response) => {
    const type = createRealtimeChangeType(response.events);
    if (!type) {
      return;
    }
    onChange({
      type,
      record: normalize(response.payload),
    });
  });
}

export function subscribeToProdukte(
  onChange: (change: RealtimeChange<Produkt>) => void,
): () => void {
  const channel = `databases.${ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank")}.collections.${ensureConfigured(appwriteConfig.productTableId, "Produkt-Tabelle")}.documents`;
  return subscribeToChannel(channel, normalizeProdukt, onChange);
}

export function subscribeToAngebote(
  onChange: (change: RealtimeChange<Angebot>) => void,
): () => void {
  const channel = `databases.${ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank")}.collections.${ensureConfigured(appwriteConfig.offerTableId, "Angebots-Tabelle")}.documents`;
  return subscribeToChannel(channel, normalizeAngebot, onChange);
}

export function subscribeToAngebot(
  angebotId: string,
  onChange: (change: RealtimeChange<Angebot>) => void,
): () => void {
  const parsedId = z.string().trim().min(1).parse(angebotId);
  const channel = `databases.${ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank")}.collections.${ensureConfigured(appwriteConfig.offerTableId, "Angebots-Tabelle")}.documents.${parsedId}`;
  return subscribeToChannel(channel, normalizeAngebot, onChange);
}

export const normalizeStaffel = normalizeAngebot;
export const listStaffeln = listAngebote;
export const getStaffelById = getAngebotById;
export const listProdukteMitStaffeln = listProdukteMitAngeboten;
export const upsertStaffel = upsertAngebot;
export const subscribeToStaffeln = subscribeToAngebote;
export const subscribeToStaffel = subscribeToAngebot;

export function subscribeToBlogPosts(
  onChange: (change: RealtimeChange<BlogPost>) => void,
): () => void {
  const channel = `databases.${ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank")}.collections.${ensureConfigured(appwriteConfig.postTableId, "Blog-Tabelle")}.documents`;
  return subscribeToChannel(channel, normalizeBlogPost, onChange);
}
