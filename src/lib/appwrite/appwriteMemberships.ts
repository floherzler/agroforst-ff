import { Query } from "appwrite";
import { z } from "zod";

import {
  appwriteConfig,
  appwriteDatabases as databases,
  appwriteDocumentMetaSchema,
  ensureConfigured,
  parseOptionalNumber,
  parseOptionalString,
  parseRelationId,
} from "@/lib/appwrite/shared";

const zahlungDocumentSchema = appwriteDocumentMetaSchema.extend({
  mitgliedschaft: z.unknown().optional(),
  status: z.string().nullable().optional(),
  referenz: z.string().nullable().optional(),
  betrag_eur: z.unknown().optional(),
  faellig_am: z.string().nullable().optional(),
  verifiziert_am: z.string().nullable().optional(),
});

const mitgliedschaftDocumentSchema = appwriteDocumentMetaSchema.extend({
  mitgliedsnummer: z.string().nullable().optional(),
  mitgliedschaftstyp: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  beantragt_am: z.string().nullable().optional(),
  dauer_jahre: z.unknown().optional(),
  bezahl_status: z.string().nullable().optional(),
  guthaben_aktuell_eur: z.unknown().optional(),
  guthaben_start_eur: z.unknown().optional(),
  rechnungsadresse: z.string().nullable().optional(),
  agb_version: z.string().nullable().optional(),
  agb_accepted_at: z.string().nullable().optional(),
});

const membershipListInputSchema = z.object({
  userId: z.string().trim().min(1),
  limit: z.number().int().positive().max(100).optional(),
});

const paymentRefInputSchema = z.object({
  ref: z.string().trim().min(1),
});

const adminPaymentListInputSchema = z.object({
  limit: z.number().int().positive().max(200).optional(),
});

export type MembershipPayment = {
  id: string;
  membershipId?: string;
  status?: string;
  ref?: string;
  betrag?: number;
  betragEur?: number;
  faelligAm?: string;
  createdAt?: string;
};

export type MembershipRecord = {
  id: string;
  membershipNumber?: string;
  typ?: string;
  status?: string;
  beantragungsDatum?: string;
  createdAt?: string;
  dauerJahre?: number;
  bezahlStatus?: string;
  kontingentAktuell?: number;
  kontingentStart?: number;
  adresse?: string;
  agbVersion?: string;
  agbAcceptedAt?: string;
  payments: MembershipPayment[];
};

function normalizeMembershipType(value: string | undefined): string | undefined {
  switch ((value ?? "").trim().toLowerCase()) {
    case "private":
    case "privat":
      return "privat";
    case "business":
    case "betrieb":
      return "betrieb";
    default:
      return parseOptionalString(value);
  }
}

function normalizeMembershipStatus(value: string | undefined): string | undefined {
  switch ((value ?? "").trim().toLowerCase()) {
    case "pending":
    case "beantragt":
      return "beantragt";
    case "active":
    case "aktiv":
      return "aktiv";
    case "expired":
    case "abgelaufen":
      return "abgelaufen";
    case "cancelled":
    case "storniert":
      return "storniert";
    default:
      return parseOptionalString(value);
  }
}

function normalizePaymentStatus(value: string | undefined): string | undefined {
  switch ((value ?? "").trim().toLowerCase()) {
    case "open":
    case "offen":
      return "offen";
    case "pending":
    case "warten":
      return "warten";
    case "partial":
    case "teilbezahlt":
      return "teilbezahlt";
    case "paid":
    case "bezahlt":
      return "bezahlt";
    case "failed":
    case "fehlgeschlagen":
      return "fehlgeschlagen";
    case "cancelled":
    case "storniert":
      return "storniert";
    default:
      return parseOptionalString(value);
  }
}

export function normalizeMembershipPayment(raw: unknown): MembershipPayment {
  const parsed = zahlungDocumentSchema.parse(raw);

  return {
    id: parsed.$id,
    membershipId: parseRelationId(parsed.mitgliedschaft),
    status: normalizePaymentStatus(parsed.status ?? undefined),
    ref: parseOptionalString(parsed.referenz ?? undefined),
    betrag: parseOptionalNumber(parsed.betrag_eur),
    betragEur: parseOptionalNumber(parsed.betrag_eur),
    faelligAm: parseOptionalString(parsed.faellig_am ?? undefined),
    createdAt: parsed.verifiziert_am ?? parsed.$createdAt,
  };
}

export function normalizeMembership(raw: unknown): MembershipRecord {
  const parsed = mitgliedschaftDocumentSchema.parse(raw);

  return {
    id: parsed.$id,
    membershipNumber: parseOptionalString(parsed.mitgliedsnummer ?? undefined),
    typ: normalizeMembershipType(parsed.mitgliedschaftstyp ?? undefined),
    status: normalizeMembershipStatus(parsed.status ?? undefined),
    beantragungsDatum: parseOptionalString(parsed.beantragt_am ?? parsed.$createdAt),
    createdAt: parsed.$createdAt,
    dauerJahre: parseOptionalNumber(parsed.dauer_jahre),
    bezahlStatus: normalizePaymentStatus(parsed.bezahl_status ?? undefined),
    kontingentAktuell: parseOptionalNumber(parsed.guthaben_aktuell_eur),
    kontingentStart: parseOptionalNumber(parsed.guthaben_start_eur),
    adresse: parseOptionalString(parsed.rechnungsadresse ?? undefined),
    agbVersion: parseOptionalString(parsed.agb_version ?? undefined),
    agbAcceptedAt: parseOptionalString(parsed.agb_accepted_at ?? undefined),
    payments: [],
  };
}

export async function listMembershipsByUserId(input: {
  userId: string;
  limit?: number;
}): Promise<MembershipRecord[]> {
  const parsedInput = membershipListInputSchema.parse(input);

  const membershipsResponse = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.membershipTableId, "Mitgliedschafts-Tabelle"),
    [
      Query.equal("benutzer_id", parsedInput.userId),
      Query.orderDesc("$createdAt"),
      Query.limit(parsedInput.limit ?? 10),
    ],
  );

  const memberships = membershipsResponse.documents.map(normalizeMembership);
  const membershipIds = memberships.map((membership) => membership.id);

  if (membershipIds.length === 0) {
    return memberships;
  }

  const paymentsResponse = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.paymentTableId, "Zahlungs-Tabelle"),
    [Query.equal("mitgliedschaft", membershipIds), Query.limit(200)],
  );

  const paymentsByMembership = new Map<string, MembershipPayment[]>();
  for (const rawPayment of paymentsResponse.documents) {
    const payment = normalizeMembershipPayment(rawPayment);
    if (!payment.membershipId) {
      continue;
    }

    const existing = paymentsByMembership.get(payment.membershipId) ?? [];
    existing.push(payment);
    paymentsByMembership.set(payment.membershipId, existing);
  }

  return memberships.map((membership) => ({
    ...membership,
    payments: paymentsByMembership.get(membership.id) ?? [],
  }));
}

export async function findPaymentIdByRef(ref: string): Promise<string | null> {
  const parsedInput = paymentRefInputSchema.parse({ ref });
  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.paymentTableId, "Zahlungs-Tabelle"),
    [Query.equal("referenz", parsedInput.ref), Query.limit(1)],
  );

  if (response.documents.length === 0) {
    return null;
  }

  return appwriteDocumentMetaSchema.parse(response.documents[0]).$id;
}

export async function listAdminMembershipPayments(input: {
  limit?: number;
} = {}): Promise<MembershipPayment[]> {
  const parsedInput = adminPaymentListInputSchema.parse(input);

  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.paymentTableId, "Zahlungs-Tabelle"),
    [Query.orderDesc("$createdAt"), Query.limit(parsedInput.limit ?? 50)],
  );

  return response.documents.map(normalizeMembershipPayment);
}

export async function listAdminMemberships(input: {
  limit?: number;
} = {}): Promise<MembershipRecord[]> {
  const parsedInput = adminPaymentListInputSchema.parse(input);

  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.membershipTableId, "Mitgliedschafts-Tabelle"),
    [Query.orderDesc("$createdAt"), Query.limit(parsedInput.limit ?? 200)],
  );

  return response.documents.map(normalizeMembership);
}
