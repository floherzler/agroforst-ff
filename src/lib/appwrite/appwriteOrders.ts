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
  offer_id: z.string().optional().default(""),
  angebotID: z.string().optional().default(""),
  user_id: z.string().optional().default(""),
  userID: z.string().optional().default(""),
  membership_id: z.string().optional(),
  mitgliedschaftID: z.string().optional(),
  quantity: z.unknown().optional(),
  menge: z.unknown().optional(),
  unit: z.string().optional().default(""),
  einheit: z.string().optional().default(""),
  pickup_at: z.string().optional(),
  abholung: z.boolean().optional(),
  product_name: z.string().optional(),
  produkt_name: z.string().optional(),
  total_price_eur: z.unknown().optional(),
  preis_gesamt: z.unknown().optional(),
  unit_price_eur: z.unknown().optional(),
  preis_einheit: z.unknown().optional(),
  status: z.string().optional(),
});

const orderListInputSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(500).optional(),
});

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

function normalizeOrderStatus(value: string | undefined): string | undefined {
  switch ((value ?? "").trim().toLowerCase()) {
    case "requested":
      return "angefragt";
    case "confirmed":
      return "bestaetigt";
    case "fulfilled":
      return "erfuellt";
    case "cancelled":
      return "storniert";
    default:
      return parseOptionalString(value);
  }
}

export function normalizeBestellung(raw: unknown): Bestellung {
  const parsed = orderDocumentSchema.parse(raw);

  return {
    id: parsed.$id,
    createdAt: parsed.$createdAt,
    angebotId: parsed.offer_id || parsed.angebotID || "",
    userId: parsed.user_id || parsed.userID || "",
    mitgliedschaftId: parseOptionalString(
      parsed.membership_id ?? parsed.mitgliedschaftID,
    ),
    menge: parseNumber(parsed.quantity ?? parsed.menge),
    einheit: normalizeUnit(parsed.unit || parsed.einheit || ""),
    abholung: Boolean(parsed.pickup_at ?? parsed.abholung),
    produktName: parseOptionalString(parsed.product_name ?? parsed.produkt_name),
    preisGesamt: parseNumber(parsed.total_price_eur ?? parsed.preis_gesamt),
    preisEinheit: parseNumber(parsed.unit_price_eur ?? parsed.preis_einheit),
    status: normalizeOrderStatus(parsed.status) ?? "",
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
    queries.push(Query.equal("user_id", parsedInput.userId));
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
