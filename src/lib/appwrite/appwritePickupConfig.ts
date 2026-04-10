import { Query } from "appwrite";
import { z } from "zod";

import {
  appwriteClient as client,
  appwriteConfig,
  appwriteDatabases as databases,
  appwriteDocumentMetaSchema,
  createRealtimeChangeType,
  ensureConfigured,
  parseOptionalString,
  RealtimeChange,
} from "@/lib/appwrite/shared";
import {
  createDefaultPickupConfig,
  PICKUP_CONFIG_DOCUMENT_ID,
  pickupWeeklySlotRuleSchema,
} from "@/features/pickup/pickup-schedule";

const pickupConfigDocumentSchema = appwriteDocumentMetaSchema.extend({
  horizon_tage: z.unknown().optional(),
  abholort: z.string().nullish(),
  notiz: z.string().nullish(),
  wochentermine_json: z.string().nullish(),
});

function parseWeeklySlots(value: string | null | undefined) {
  if (!value) {
    return createDefaultPickupConfig().weeklySlots;
  }

  try {
    const parsed = JSON.parse(value);
    return z.array(pickupWeeklySlotRuleSchema).parse(parsed);
  } catch {
    return createDefaultPickupConfig().weeklySlots;
  }
}

export function normalizePickupConfig(raw: unknown): PickupConfig {
  const parsed = pickupConfigDocumentSchema.parse(raw);
  const defaults = createDefaultPickupConfig();

  return {
    id: parsed.$id,
    createdAt: parsed.$createdAt,
    horizonDays: Number(parsed.horizon_tage) > 0 ? Number(parsed.horizon_tage) : defaults.horizonDays,
    location: parseOptionalString(parsed.abholort),
    note: parseOptionalString(parsed.notiz),
    weeklySlots: parseWeeklySlots(parsed.wochentermine_json),
  };
}

export async function getPickupConfig(): Promise<PickupConfig | null> {
  const tableId = ensureConfigured(appwriteConfig.pickupConfigTableId, "Abholkonfigurations-Tabelle");

  try {
    const response = await databases.getDocument(
      ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
      tableId,
      PICKUP_CONFIG_DOCUMENT_ID,
    );
    return normalizePickupConfig(response);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("document with the requested id could not be found")) {
      return null;
    }

    const fallback = await databases.listDocuments(
      ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
      tableId,
      [Query.limit(1)],
    );
    const first = fallback.documents[0];
    return first ? normalizePickupConfig(first) : null;
  }
}

export async function upsertPickupConfig(input: {
  horizonDays: number;
  location?: string;
  note?: string;
  weeklySlots: PickupWeeklySlotRule[];
}): Promise<PickupConfig> {
  const defaults = createDefaultPickupConfig();
  const payload = {
    horizon_tage: input.horizonDays || defaults.horizonDays,
    abholort: input.location?.trim() || undefined,
    notiz: input.note?.trim() || undefined,
    wochentermine_json: JSON.stringify(input.weeklySlots),
  };

  const response = await databases.upsertDocument(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.pickupConfigTableId, "Abholkonfigurations-Tabelle"),
    PICKUP_CONFIG_DOCUMENT_ID,
    payload,
  );

  return normalizePickupConfig(response);
}

export function subscribeToPickupConfig(
  onChange: (change: RealtimeChange<PickupConfig>) => void,
): () => void {
  const channel = `databases.${ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank")}.collections.${ensureConfigured(appwriteConfig.pickupConfigTableId, "Abholkonfigurations-Tabelle")}.documents`;

  return client.subscribe(channel, (response) => {
    const type = createRealtimeChangeType(response.events);
    if (!type) {
      return;
    }

    onChange({
      type,
      record: normalizePickupConfig(response.payload),
    });
  });
}
