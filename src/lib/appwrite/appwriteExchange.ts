import { ID, Query } from "appwrite";
import { z } from "zod";

import {
  appwriteClient as client,
  appwriteConfig,
  appwriteDatabases as databases,
  appwriteDocumentMetaSchema,
  createRealtimeChangeType,
  ensureConfigured,
  parseOptionalString,
  parseStringArray,
  RealtimeChange,
} from "@/lib/appwrite/shared";

const exchangeDocumentSchema = appwriteDocumentMetaSchema.extend({
  titel: z.string().min(1),
  modus: z.enum(["biete", "suche"]).catch("biete"),
  beschreibung: z.string().nullish(),
  tags: z.unknown().optional(),
  hinweis: z.string().nullish(),
});

const exchangeListInputSchema = z.object({
  mode: z.enum(["biete", "suche"]).optional(),
  limit: z.number().int().positive().max(500).optional(),
});

const upsertExchangeInputSchema = z.object({
  id: z.string().trim().optional(),
  titel: z.string().trim().min(1),
  modus: z.enum(["biete", "suche"]),
  beschreibung: z.string().trim().optional(),
  tags: z.array(z.string().trim()).optional(),
  hinweis: z.string().trim().optional(),
});

export function normalizeBieteSucheEintrag(raw: unknown): BieteSucheEintrag {
  const parsed = exchangeDocumentSchema.parse(raw);

  return {
    id: parsed.$id,
    createdAt: parsed.$createdAt,
    titel: parsed.titel,
    modus: parsed.modus,
    beschreibung: parseOptionalString(parsed.beschreibung),
    tags: parseStringArray(parsed.tags),
    hinweis: parseOptionalString(parsed.hinweis),
  };
}

export async function listBieteSucheEintraege(
  input: {
    mode?: BieteSucheModus;
    limit?: number;
  } = {},
): Promise<BieteSucheEintrag[]> {
  const parsedInput = exchangeListInputSchema.parse(input);
  const queries = [Query.limit(parsedInput.limit ?? 500), Query.orderDesc("$createdAt")];

  if (parsedInput.mode) {
    queries.push(Query.equal("modus", parsedInput.mode));
  }

  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.exchangeTableId, "Biete/Suche-Tabelle"),
    queries,
  );

  return response.documents.map(normalizeBieteSucheEintrag);
}

export async function upsertBieteSucheEintrag(input: {
  id?: string;
  titel: string;
  modus: BieteSucheModus;
  beschreibung?: string;
  tags?: string[];
  hinweis?: string;
}): Promise<BieteSucheEintrag> {
  const parsedInput = upsertExchangeInputSchema.parse(input);
  const documentId = parsedInput.id || ID.unique();

  const response = await databases.upsertDocument(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.exchangeTableId, "Biete/Suche-Tabelle"),
    documentId,
    {
      titel: parsedInput.titel,
      modus: parsedInput.modus,
      beschreibung: parsedInput.beschreibung?.trim() || undefined,
      tags: (parsedInput.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
      hinweis: parsedInput.hinweis?.trim() || undefined,
    },
  );

  return normalizeBieteSucheEintrag(response);
}

export function subscribeToBieteSucheEintraege(
  onChange: (change: RealtimeChange<BieteSucheEintrag>) => void,
): () => void {
  const channel = `databases.${ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank")}.collections.${ensureConfigured(appwriteConfig.exchangeTableId, "Biete/Suche-Tabelle")}.documents`;

  return client.subscribe(channel, (response) => {
    const type = createRealtimeChangeType(response.events);
    if (!type) {
      return;
    }

    onChange({
      type,
      record: normalizeBieteSucheEintrag(response.payload),
    });
  });
}
