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
  parseRelationId,
  RealtimeChange,
} from "@/lib/appwrite/shared";

const orderDocumentSchema = appwriteDocumentMetaSchema.extend({
  angebot: z.unknown().optional(),
  benutzer_id: z.string().optional().default(""),
  mitgliedschaft: z.unknown().optional(),
  menge: z.unknown().optional(),
  einheit: z.string().optional().default(""),
  abholung_ab: z.string().optional(),
  produkt_name: z.string().optional(),
  gesamtpreis_eur: z.unknown().optional(),
  preis_pro_einheit_eur: z.unknown().optional(),
  bestellte_teilungen: z.unknown().optional(),
  bestellte_teilungs_anzahlen: z.unknown().optional(),
  bestellte_teilpreise_eur: z.unknown().optional(),
  status: z.string().optional(),
});

const orderListInputSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(500).optional(),
});

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

function normalizeOrderStatus(value: string | undefined): string | undefined {
  switch ((value ?? "").trim().toLowerCase()) {
    case "angefragt":
    case "requested":
      return "angefragt";
    case "bestaetigt":
    case "confirmed":
      return "bestaetigt";
    case "erfuellt":
    case "fulfilled":
      return "erfuellt";
    case "storniert":
    case "cancelled":
      return "storniert";
    default:
      return parseOptionalString(value);
  }
}

function parseNumericArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => parseNumber(entry, Number.NaN))
    .filter((entry) => Number.isFinite(entry));
}

export function normalizeBestellung(raw: unknown): Bestellung {
  const parsed = orderDocumentSchema.parse(raw);

  return {
    id: parsed.$id,
    createdAt: parsed.$createdAt,
    angebotId: parseRelationId(parsed.angebot) || "",
    userId: parsed.benutzer_id || "",
    mitgliedschaftId: parseOptionalString(parseRelationId(parsed.mitgliedschaft)),
    menge: parseNumber(parsed.menge),
    einheit: normalizeUnit(parsed.einheit || ""),
    abholung: Boolean(parsed.abholung_ab),
    produktName: parseOptionalString(parsed.produkt_name),
    preisGesamt: parseNumber(parsed.gesamtpreis_eur),
    preisEinheit: parseNumber(parsed.preis_pro_einheit_eur),
    status: normalizeOrderStatus(parsed.status) ?? "",
    bestellteTeilungen: parseNumericArray(parsed.bestellte_teilungen),
    bestellteTeilungsAnzahlen: parseNumericArray(parsed.bestellte_teilungs_anzahlen),
    bestellteTeilpreiseEur: parseNumericArray(parsed.bestellte_teilpreise_eur),
  };
}

export async function listBestellungen(
  input: {
    userId?: string;
    limit?: number;
  } = {},
): Promise<Bestellung[]> {
  const parsedInput = orderListInputSchema.parse(input);
  const queries = [Query.orderDesc("$createdAt"), Query.limit(parsedInput.limit ?? 100)];

  if (parsedInput.userId) {
    queries.push(Query.equal("benutzer_id", parsedInput.userId));
  }

  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.orderTableId, "Bestellungs-Tabelle"),
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
  const channel = `databases.${ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank")}.collections.${ensureConfigured(appwriteConfig.orderTableId, "Bestellungs-Tabelle")}.documents`;
  return subscribeToOrders(channel, onChange);
}
