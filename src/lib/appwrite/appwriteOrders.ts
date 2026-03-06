import { Query } from "appwrite";
import { z } from "zod";

import {
  appwriteClient as client,
  appwriteConfig,
  appwriteDatabases as databases,
  appwriteDocumentMetaSchema,
  createRealtimeChangeType,
  ensureConfigured,
  parseNumber,
  parseOptionalString,
  RealtimeChange,
} from "@/lib/appwrite/shared";

const orderDocumentSchema = appwriteDocumentMetaSchema.extend({
  angebotID: z.string().optional().default(""),
  userID: z.string().optional().default(""),
  mitgliedschaftID: z.string().optional(),
  menge: z.unknown().optional(),
  einheit: z.string().optional().default(""),
  abholung: z.boolean().optional(),
  produkt_name: z.string().optional(),
  preis_gesamt: z.unknown().optional(),
  preis_einheit: z.unknown().optional(),
  status: z.string().optional(),
});

const orderListInputSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(500).optional(),
});

export function normalizeBestellung(raw: unknown): Bestellung {
  const parsed = orderDocumentSchema.parse(raw);

  return {
    id: parsed.$id,
    createdAt: parsed.$createdAt,
    angebotId: parsed.angebotID || "",
    userId: parsed.userID || "",
    mitgliedschaftId: parseOptionalString(parsed.mitgliedschaftID),
    menge: parseNumber(parsed.menge),
    einheit: parsed.einheit || "",
    abholung: parsed.abholung ?? false,
    produktName: parseOptionalString(parsed.produkt_name),
    preisGesamt: parseNumber(parsed.preis_gesamt),
    preisEinheit: parseNumber(parsed.preis_einheit),
    status: parseOptionalString(parsed.status) ?? "",
  };
}

export async function listBestellungen(
  input: {
    userId?: string;
    limit?: number;
  } = {},
): Promise<Bestellung[]> {
  const parsedInput = orderListInputSchema.parse(input);
  const queries = [
    Query.orderDesc("$createdAt"),
    Query.limit(parsedInput.limit ?? 100),
  ];

  if (parsedInput.userId) {
    queries.push(Query.equal("userID", parsedInput.userId));
  }

  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(
      appwriteConfig.orderCollectionId,
      "Bestellungs-Collection",
    ),
    queries,
  );

  return response.documents.map(normalizeBestellung);
}

function subscribeToOrders(
  channel: string,
  onChange: (change: RealtimeChange<Bestellung>) => void,
) {
  return client.subscribe(channel, (response) => {
    const type = createRealtimeChangeType(response.events);
    if (!type) {
      return;
    }

    onChange({
      type,
      record: normalizeBestellung(response.payload),
    });
  });
}

export function subscribeToBestellungen(
  onChange: (change: RealtimeChange<Bestellung>) => void,
): () => void {
  const channel = `databases.${ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank")}.collections.${ensureConfigured(appwriteConfig.orderCollectionId, "Bestellungs-Collection")}.documents`;
  return subscribeToOrders(channel, onChange);
}
