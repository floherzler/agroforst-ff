import { Query } from "appwrite";
import { z } from "zod";

import {
  appwriteConfig,
  appwriteDatabases as databases,
  appwriteDocumentMetaSchema,
  ensureConfigured,
  parseOptionalString,
} from "@/lib/appwrite/shared";

const backofficeEventDocumentSchema = appwriteDocumentMetaSchema.extend({
  ereignistyp: z.string().min(1),
  bestellung_id: z.string().nullish(),
  angebot_id: z.string().nullish(),
  benutzer_id: z.string().nullish(),
  benutzer_email: z.string().nullish(),
  betreff: z.string().nullish(),
  nachricht: z.string().min(1),
  zugestellt: z.boolean(),
  erstellt_am: z.string().nullish(),
});

const backofficeEventListInputSchema = z.object({
  limit: z.number().int().positive().max(200).optional(),
});

export function normalizeBackofficeEvent(raw: unknown): BackofficeEvent {
  const parsed = backofficeEventDocumentSchema.parse(raw);

  return {
    id: parsed.$id,
    createdAt: parsed.erstellt_am ?? parsed.$createdAt,
    ereignistyp: parsed.ereignistyp,
    bestellungId: parseOptionalString(parsed.bestellung_id),
    angebotId: parseOptionalString(parsed.angebot_id),
    benutzerId: parseOptionalString(parsed.benutzer_id),
    benutzerEmail: parseOptionalString(parsed.benutzer_email),
    betreff: parseOptionalString(parsed.betreff),
    nachricht: parsed.nachricht.trim(),
    zugestellt: parsed.zugestellt,
  };
}

export async function listBackofficeEvents(input: {
  limit?: number;
} = {}): Promise<BackofficeEvent[]> {
  const parsedInput = backofficeEventListInputSchema.parse(input);

  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.eventTableId, "Backoffice-Ereignis-Tabelle"),
    [Query.orderDesc("erstellt_am"), Query.limit(parsedInput.limit ?? 100)],
  );

  return response.documents.map(normalizeBackofficeEvent);
}
