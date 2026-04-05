import { Account, Client, Databases, Functions, Storage } from "appwrite";
import { z } from "zod";

import env from "@/app/env";
import managedAppwrite from "../../../appwrite.config.json";

const managedDatabase = managedAppwrite.tablesDB?.[0];
const managedTables = new Map(
  (managedAppwrite.tables ?? []).map((table) => [table.$id, table]),
);
const managedBucket = managedAppwrite.buckets?.[0];
const managedFunctions = new Map(
  (managedAppwrite.functions ?? []).map((fn) => [fn.$id || fn.name, fn]),
);

export const appwriteConfig = {
  endpoint: String(env.appwrite.endpoint ?? "").trim(),
  projectId: String(env.appwrite.project_id ?? "").trim(),
  databaseId: String(managedDatabase?.$id ?? "").trim(),
  storageId: String(managedBucket?.$id ?? "").trim(),
  eventTableId: getManagedTableId("backoffice_ereignisse"),
  productTableId: getManagedTableId("produkte"),
  offerTableId: getManagedTableId("angebote"),
  orderTableId: getManagedTableId("bestellungen"),
  postTableId: getManagedTableId("blog_beitraege"),
  membershipTableId: getManagedTableId("mitgliedschaften"),
  paymentTableId: getManagedTableId("mitgliedschaftszahlungen"),
  feedbackTableId: getManagedTableId("kunden_nachrichten"),
  orderFunctionId: getManagedFunctionId("createOrder"),
  membershipFunctionId: getManagedFunctionId("createMembership"),
  paymentVerifyFunctionId: getManagedFunctionId("verifyPayment"),
};

export const appwriteDocumentMetaSchema = z.object({
  $id: z.string().min(1),
  $createdAt: z.string().min(1),
});

const endpoint = ensureConfigured(appwriteConfig.endpoint, "Appwrite Endpoint");
const projectId = ensureConfigured(
  appwriteConfig.projectId,
  "Appwrite Projekt-ID",
);

export const appwriteClient = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);
export const appwriteAccount = new Account(appwriteClient);
export const appwriteDatabases = new Databases(appwriteClient);
export const appwriteFunctions = new Functions(appwriteClient);
export const appwriteStorage = new Storage(appwriteClient);

export type RealtimeChangeType = "create" | "update" | "delete";

export type RealtimeChange<T> = {
  type: RealtimeChangeType;
  record: T;
};

export function createRealtimeChangeType(
  events: unknown,
): RealtimeChangeType | null {
  if (!Array.isArray(events)) {
    return null;
  }

  const joinedEvents = events
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (joinedEvents.includes(".create")) {
    return "create";
  }
  if (joinedEvents.includes(".update")) {
    return "update";
  }
  if (joinedEvents.includes(".delete")) {
    return "delete";
  }
  return null;
}

export function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = parseNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseOptionalString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

export function parseRelationId(value: unknown): string | undefined {
  if (typeof value === "string") {
    return parseOptionalString(value);
  }

  if (value && typeof value === "object") {
    const candidate = (value as { $id?: unknown }).$id;
    if (typeof candidate === "string") {
      return parseOptionalString(candidate);
    }
  }

  return undefined;
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

export function ensureConfigured(value: string, label: string): string {
  if (!value || value === "undefined") {
    throw new Error(`${label} ist nicht konfiguriert.`);
  }
  return value;
}

export function parseExecutionPayload(rawResponse: unknown): unknown {
  if (typeof rawResponse !== "string") {
    return rawResponse;
  }

  const trimmed = rawResponse.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return rawResponse;
  }
}

function getManagedTableId(id: string): string {
  return String(managedTables.get(id)?.$id ?? "").trim();
}

function getManagedFunctionId(id: string): string {
  return String(managedFunctions.get(id)?.$id ?? "").trim();
}
