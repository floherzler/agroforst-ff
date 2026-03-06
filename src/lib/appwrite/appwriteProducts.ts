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
  parseOptionalString,
  parseStringArray,
  RealtimeChange,
} from "@/lib/appwrite/shared";

const productDocumentSchema = appwriteDocumentMetaSchema.extend({
  name: z.string().min(1),
  variety: z.string().optional().default(""),
  sorte: z.string().optional().default(""),
  category: z.string().optional().default("other"),
  hauptkategorie: z.string().optional().default("Sonstiges"),
  subcategory: z.string().optional().default(""),
  unterkategorie: z.string().optional().default(""),
  lifespan: z.string().optional().default(""),
  lebensdauer: z.string().optional().default(""),
  crop_rotation_before: z.unknown().optional(),
  fruchtfolge_vor: z.unknown().optional(),
  crop_rotation_after: z.unknown().optional(),
  fruchtfolge_nach: z.unknown().optional(),
  soil_requirements: z.unknown().optional(),
  bodenansprueche: z.unknown().optional(),
  companion_plants: z.unknown().optional(),
  begleitpflanzen: z.unknown().optional(),
  seasonality_months: z.unknown().optional(),
  saisonalitaet: z.unknown().optional(),
  image_file_id: z.string().optional(),
  imageID: z.string().optional(),
});

const offerDocumentSchema = appwriteDocumentMetaSchema.extend({
  product_id: z.string().optional().default(""),
  produktID: z.string().optional().default(""),
  available_quantity: z.unknown().optional(),
  mengeVerfuegbar: z.unknown().optional(),
  unit: z.string().optional().default(""),
  einheit: z.string().optional().default(""),
  projected_quantity: z.unknown().optional(),
  menge: z.unknown().optional(),
  unit_price_eur: z.unknown().optional(),
  euroPreis: z.unknown().optional(),
  sowing_date: z.string().optional().default(""),
  saatPflanzDatum: z.string().optional().default(""),
  harvest_projection: z.unknown().optional(),
  ernteProjektion: z.unknown().optional(),
  allocated_quantity: z.unknown().optional(),
  mengeAbgeholt: z.unknown().optional(),
  beschreibung: z.string().optional(),
  description: z.string().optional(),
});

const blogPostDocumentSchema = appwriteDocumentMetaSchema.extend({
  title: z.string().min(1),
  summary: z.string().optional().default(""),
  description: z.string().optional().default(""),
  content: z.string().optional().default(""),
  tags: z.unknown().optional(),
  author_name: z.string().optional().default(""),
  writtenBy: z.string().optional().default(""),
  published_at: z.string().optional().default(""),
  writtenAt: z.string().optional().default(""),
  updated_at: z.string().optional().default(""),
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

function normalizeUnit(value: string): string {
  switch (value.trim().toLowerCase()) {
    case "piece":
      return "Stück";
    case "gram":
      return "Gramm";
    case "bundle":
      return "Bund";
    case "kilogram":
      return "kg";
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
        Array.isArray(parsed.seasonality_months)
          ? parsed.seasonality_months
          : Array.isArray(parsed.saisonalitaet)
            ? parsed.saisonalitaet
            : []
      )
        .map((entry) => parseNumber(entry, Number.NaN))
        .filter((entry) => Number.isFinite(entry) && entry >= 1 && entry <= 12),
    ),
  ).sort((left, right) => left - right);

  return {
    id: parsed.$id,
    createdAt: parsed.$createdAt,
    name: parsed.name,
    sorte: parsed.variety || parsed.sorte || "",
    hauptkategorie: parsed.category || parsed.hauptkategorie || "Sonstiges",
    unterkategorie: parsed.subcategory || parsed.unterkategorie || "",
    lebensdauer: parsed.lifespan || parsed.lebensdauer || "",
    fruchtfolgeVor: parseStringArray(
      parsed.crop_rotation_before ?? parsed.fruchtfolge_vor,
    ),
    fruchtfolgeNach: parseStringArray(
      parsed.crop_rotation_after ?? parsed.fruchtfolge_nach,
    ),
    bodenansprueche: parseStringArray(
      parsed.soil_requirements ?? parsed.bodenansprueche,
    ),
    begleitpflanzen: parseStringArray(
      parsed.companion_plants ?? parsed.begleitpflanzen,
    ),
    saisonalitaet: seasonalitaet,
    imageId: parseOptionalString(parsed.image_file_id ?? parsed.imageID),
  };
}

export function normalizeStaffel(raw: unknown): Staffel {
  const parsed = offerDocumentSchema.parse(raw);
  return {
    id: parsed.$id,
    createdAt: parsed.$createdAt,
    produktId: parsed.product_id || parsed.produktID,
    mengeVerfuegbar: parseNumber(
      parsed.available_quantity ?? parsed.mengeVerfuegbar,
    ),
    einheit: normalizeUnit(parsed.unit || parsed.einheit || ""),
    menge: parseNumber(parsed.projected_quantity ?? parsed.menge),
    euroPreis: parseNumber(parsed.unit_price_eur ?? parsed.euroPreis),
    saatPflanzDatum: parsed.sowing_date || parsed.saatPflanzDatum || "",
    ernteProjektion: parseStringArray(
      parsed.harvest_projection ?? parsed.ernteProjektion,
    ),
    mengeAbgeholt: parseNumber(
      parsed.allocated_quantity ?? parsed.mengeAbgeholt,
    ),
    beschreibung: parseOptionalString(parsed.description ?? parsed.beschreibung),
  };
}

export function normalizeBlogPost(raw: unknown): BlogPost {
  const parsed = blogPostDocumentSchema.parse(raw);
  return {
    id: parsed.$id,
    createdAt: parsed.$createdAt,
    title: parsed.title,
    description: parsed.summary || parsed.description || "",
    content: parsed.content || "",
    tags: parseStringArray(parsed.tags),
    writtenBy: parsed.author_name || parsed.writtenBy || "",
    writtenAt: parsed.published_at || parsed.writtenAt || parsed.$createdAt,
    updatedAt: parsed.updated_at || parsed.updatedAt || parsed.$createdAt,
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
    queries.push(Query.equal("category", parsedInput.hauptkategorie));
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

export async function listStaffeln(
  input: {
    produktId?: string;
    produktIds?: string[];
    limit?: number;
  } = {},
): Promise<Staffel[]> {
  const parsedInput = offerListInputSchema.parse(input);
  const queries = [
    Query.limit(parsedInput.limit ?? 500),
    Query.orderDesc("$createdAt"),
  ];

  if (parsedInput.produktId) {
    queries.push(Query.equal("product_id", parsedInput.produktId));
  }

  if (parsedInput.produktIds && parsedInput.produktIds.length > 0) {
    queries.push(Query.equal("product_id", parsedInput.produktIds));
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

export async function listProdukteMitStaffeln(): Promise<
  ProduktMitAngeboten[]
> {
  const [produkte, staffeln] = await Promise.all([
    listAlleProdukte(),
    listStaffeln(),
  ]);
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
    ensureConfigured(
      appwriteConfig.feedbackCollectionId,
      "Nachrichten-Collection",
    ),
    ID.unique(),
    {
      user_id: parsedInput.userId,
      message_type: "feedback",
      message: parsedInput.text,
      status: "new",
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
