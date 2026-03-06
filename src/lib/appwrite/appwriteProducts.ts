import { Client, Databases, ID, Query, Storage } from "appwrite";
import { z } from "zod";

import {
  appwriteConfig,
  appwriteDocumentMetaSchema,
  createRealtimeChangeType,
  ensureConfigured,
  parseNumber,
  parseOptionalString,
  parseStringArray,
  RealtimeChange,
} from "@/lib/appwrite/shared";

const client = new Client()
  .setEndpoint(ensureConfigured(appwriteConfig.endpoint, "Appwrite Endpoint"))
  .setProject(ensureConfigured(appwriteConfig.projectId, "Appwrite Projekt-ID"));

const databases = new Databases(client);
const storage = new Storage(client);

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
  imageID: z.string().optional(),
});

const offerDocumentSchema = appwriteDocumentMetaSchema.extend({
  produktID: z.string().min(1),
  mengeVerfuegbar: z.unknown().optional(),
  einheit: z.string().optional().default(""),
  menge: z.unknown().optional(),
  euroPreis: z.unknown().optional(),
  saatPflanzDatum: z.string().optional().default(""),
  ernteProjektion: z.unknown().optional(),
  mengeAbgeholt: z.unknown().optional(),
  beschreibung: z.string().optional(),
});

const blogPostDocumentSchema = appwriteDocumentMetaSchema.extend({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  content: z.string().optional().default(""),
  tags: z.unknown().optional(),
  writtenBy: z.string().optional().default(""),
  writtenAt: z.string().optional().default(""),
  updatedAt: z.string().optional().default(""),
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

export type ProduktMitAngeboten = {
  produkt: Produkt;
  angebote: Staffel[];
};

export function normalizeProdukt(raw: unknown): Produkt {
  const parsed = productDocumentSchema.parse(raw);
  const seasonalitaet = Array.from(
    new Set(
      (Array.isArray(parsed.saisonalitaet) ? parsed.saisonalitaet : [])
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
    imageId: parseOptionalString(parsed.imageID),
  };
}

export function normalizeStaffel(raw: unknown): Staffel {
  const parsed = offerDocumentSchema.parse(raw);
  return {
    id: parsed.$id,
    createdAt: parsed.$createdAt,
    produktId: parsed.produktID,
    mengeVerfuegbar: parseNumber(parsed.mengeVerfuegbar),
    einheit: parsed.einheit || "",
    menge: parseNumber(parsed.menge),
    euroPreis: parseNumber(parsed.euroPreis),
    saatPflanzDatum: parsed.saatPflanzDatum || "",
    ernteProjektion: parseStringArray(parsed.ernteProjektion),
    mengeAbgeholt: parseNumber(parsed.mengeAbgeholt),
    beschreibung: parseOptionalString(parsed.beschreibung),
  };
}

export function normalizeBlogPost(raw: unknown): BlogPost {
  const parsed = blogPostDocumentSchema.parse(raw);
  return {
    id: parsed.$id,
    createdAt: parsed.$createdAt,
    title: parsed.title,
    description: parsed.description || "",
    content: parsed.content || "",
    tags: parseStringArray(parsed.tags),
    writtenBy: parsed.writtenBy || "",
    writtenAt: parsed.writtenAt || parsed.$createdAt,
    updatedAt: parsed.updatedAt || parsed.$createdAt,
  };
}

export async function listProdukte(input: {
  hauptkategorie?: string;
  search?: string;
  limit?: number;
} = {}): Promise<Produkt[]> {
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
    ensureConfigured(appwriteConfig.productCollectionId, "Produkt-Collection"),
    queries,
  );

  return response.documents.map(normalizeProdukt);
}

export async function listAlleProdukte(): Promise<Produkt[]> {
  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.productCollectionId, "Produkt-Collection"),
    [Query.limit(500), Query.orderAsc("name")],
  );

  return response.documents.map(normalizeProdukt);
}

export async function listStaffeln(input: {
  produktId?: string;
  produktIds?: string[];
  limit?: number;
} = {}): Promise<Staffel[]> {
  const parsedInput = offerListInputSchema.parse(input);
  const queries = [Query.limit(parsedInput.limit ?? 500), Query.orderDesc("$createdAt")];

  if (parsedInput.produktId) {
    queries.push(Query.equal("produktID", parsedInput.produktId));
  }

  if (parsedInput.produktIds && parsedInput.produktIds.length > 0) {
    queries.push(Query.equal("produktID", parsedInput.produktIds));
  }

  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.offerCollectionId, "Angebots-Collection"),
    queries,
  );

  return response.documents.map(normalizeStaffel);
}

export async function getStaffelById(id: string): Promise<Staffel> {
  const response = await databases.getDocument(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.offerCollectionId, "Angebots-Collection"),
    z.string().trim().min(1).parse(id),
  );

  return normalizeStaffel(response);
}

export async function listProdukteMitStaffeln(): Promise<ProduktMitAngeboten[]> {
  const [produkte, staffeln] = await Promise.all([listAlleProdukte(), listStaffeln()]);
  const staffelnByProdukt = new Map<string, Staffel[]>();

  for (const staffel of staffeln) {
    const existing = staffelnByProdukt.get(staffel.produktId) ?? [];
    existing.push(staffel);
    staffelnByProdukt.set(staffel.produktId, existing);
  }

  return produkte.map((produkt) => ({
    produkt,
    angebote: staffelnByProdukt.get(produkt.id) ?? [],
  }));
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.postCollectionId, "Blog-Collection"),
    [Query.limit(500), Query.orderDesc("$createdAt")],
  );

  return response.documents.map(normalizeBlogPost);
}

export async function submitFeedbackMessage(input: {
  userId: string;
  text: string;
}): Promise<void> {
  const parsedInput = feedbackInputSchema.parse(input);

  await databases.createDocument(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.feedbackCollectionId, "Nachrichten-Collection"),
    ID.unique(),
    {
      text: parsedInput.text,
      userID: parsedInput.userId,
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
  const channel = `databases.${ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank")}.collections.${ensureConfigured(appwriteConfig.productCollectionId, "Produkt-Collection")}.documents`;
  return subscribeToChannel(channel, normalizeProdukt, onChange);
}

export function subscribeToStaffeln(
  onChange: (change: RealtimeChange<Staffel>) => void,
): () => void {
  const channel = `databases.${ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank")}.collections.${ensureConfigured(appwriteConfig.offerCollectionId, "Angebots-Collection")}.documents`;
  return subscribeToChannel(channel, normalizeStaffel, onChange);
}

export function subscribeToStaffel(
  staffelId: string,
  onChange: (change: RealtimeChange<Staffel>) => void,
): () => void {
  const parsedId = z.string().trim().min(1).parse(staffelId);
  const channel = `databases.${ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank")}.collections.${ensureConfigured(appwriteConfig.offerCollectionId, "Angebots-Collection")}.documents.${parsedId}`;
  return subscribeToChannel(channel, normalizeStaffel, onChange);
}

export function subscribeToBlogPosts(
  onChange: (change: RealtimeChange<BlogPost>) => void,
): () => void {
  const channel = `databases.${ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank")}.collections.${ensureConfigured(appwriteConfig.postCollectionId, "Blog-Collection")}.documents`;
  return subscribeToChannel(channel, normalizeBlogPost, onChange);
}
