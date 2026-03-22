import { Query } from "appwrite";
import { z } from "zod";

import {
  appwriteConfig,
  appwriteDatabases as databases,
  appwriteDocumentMetaSchema,
  ensureConfigured,
  parseOptionalNumber,
  parseRelationId,
  parseOptionalString,
} from "@/lib/appwrite/shared";

const paymentDocumentSchema = appwriteDocumentMetaSchema.extend({
  membership: z.unknown().optional(),
  membership_id: z.string().optional(),
  membershipId: z.string().optional(),
  status: z.string().optional(),
  state: z.string().optional(),
  reference: z.string().optional(),
  ref: z.string().optional(),
  verwendungszweck: z.string().optional(),
  amount_eur: z.unknown().optional(),
  betrag_eur: z.unknown().optional(),
  amount: z.unknown().optional(),
  due_at: z.string().optional(),
  faellig_am: z.string().optional(),
  verified_at: z.string().optional(),
});

const membershipDocumentSchema = appwriteDocumentMetaSchema.extend({
  membership_number: z.string().optional(),
  typ: z.string().optional(),
  membership_type: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  state: z.string().optional(),
  requested_at: z.string().optional(),
  beantragungs_datum: z.string().optional(),
  beantragt_am: z.string().optional(),
  duration_years: z.unknown().optional(),
  dauer_jahre: z.unknown().optional(),
  dauer: z.unknown().optional(),
  laufzeit: z.unknown().optional(),
  payment_status: z.string().optional(),
  bezahl_status: z.string().optional(),
  paymentStatus: z.string().optional(),
  credit_balance_eur: z.unknown().optional(),
  kontingent_aktuell: z.unknown().optional(),
  aktuelles_kontingent: z.unknown().optional(),
  kontingent: z.unknown().optional(),
  balance: z.unknown().optional(),
  guthaben: z.unknown().optional(),
  credit_start_eur: z.unknown().optional(),
  kontingent_start: z.unknown().optional(),
  start_kontingent: z.unknown().optional(),
  kontingent_gesamt: z.unknown().optional(),
  billing_address: z.string().optional(),
  rechnungsadresse: z.string().optional(),
  adresse: z.string().optional(),
  address: z.string().optional(),
});

const membershipListInputSchema = z.object({
  userId: z.string().trim().min(1),
  limit: z.number().int().positive().max(100).optional(),
});

const paymentRefInputSchema = z.object({
  ref: z.string().trim().min(1),
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
  payments: MembershipPayment[];
};

function normalizeMembershipType(value: string | undefined): string | undefined {
  switch ((value ?? "").trim().toLowerCase()) {
    case "private":
      return "privat";
    case "business":
      return "business";
    default:
      return parseOptionalString(value);
  }
}

function normalizeMembershipStatus(value: string | undefined): string | undefined {
  switch ((value ?? "").trim().toLowerCase()) {
    case "pending":
      return "beantragt";
    case "active":
      return "aktiv";
    case "expired":
      return "abgelaufen";
    case "cancelled":
      return "storniert";
    default:
      return parseOptionalString(value);
  }
}

function normalizePaymentStatus(value: string | undefined): string | undefined {
  switch ((value ?? "").trim().toLowerCase()) {
    case "open":
      return "offen";
    case "pending":
      return "warten";
    case "partial":
      return "teilbezahlt";
    case "paid":
      return "bezahlt";
    case "failed":
      return "fehlgeschlagen";
    case "cancelled":
      return "storniert";
    default:
      return parseOptionalString(value);
  }
}

export function normalizeMembershipPayment(raw: unknown): MembershipPayment {
  const parsed = paymentDocumentSchema.parse(raw);

  return {
    id: parsed.$id,
    membershipId: parseOptionalString(
      parseRelationId(parsed.membership) ??
        parsed.membership_id ??
        parsed.membershipId,
    ),
    status: normalizePaymentStatus(parsed.status ?? parsed.state),
    ref: parseOptionalString(
      parsed.reference ?? parsed.ref ?? parsed.verwendungszweck,
    ),
    betrag: parseOptionalNumber(parsed.amount ?? parsed.amount_eur),
    betragEur: parseOptionalNumber(parsed.amount_eur ?? parsed.betrag_eur),
    faelligAm: parseOptionalString(parsed.due_at ?? parsed.faellig_am),
    createdAt: parsed.verified_at ?? parsed.$createdAt,
  };
}

export function normalizeMembership(raw: unknown): MembershipRecord {
  const parsed = membershipDocumentSchema.parse(raw);

  return {
    id: parsed.$id,
    membershipNumber: parseOptionalString(parsed.membership_number),
    typ: normalizeMembershipType(parsed.membership_type ?? parsed.typ ?? parsed.type),
    status: normalizeMembershipStatus(parsed.status ?? parsed.state),
    beantragungsDatum: parseOptionalString(
      parsed.requested_at ??
        parsed.beantragungs_datum ??
        parsed.beantragt_am ??
        parsed.$createdAt,
    ),
    createdAt: parsed.$createdAt,
    dauerJahre: parseOptionalNumber(
      parsed.duration_years ?? parsed.dauer_jahre ?? parsed.dauer ?? parsed.laufzeit,
    ),
    bezahlStatus: normalizePaymentStatus(
      parsed.payment_status ?? parsed.bezahl_status ?? parsed.paymentStatus,
    ),
    kontingentAktuell: parseOptionalNumber(
      parsed.credit_balance_eur ??
        parsed.kontingent_aktuell ??
        parsed.aktuelles_kontingent ??
        parsed.kontingent ??
        parsed.balance ??
        parsed.guthaben,
    ),
    kontingentStart: parseOptionalNumber(
      parsed.credit_start_eur ??
        parsed.kontingent_start ??
        parsed.start_kontingent ??
        parsed.kontingent_gesamt,
    ),
    adresse: parseOptionalString(
      parsed.billing_address ??
        parsed.rechnungsadresse ??
        parsed.adresse ??
        parsed.address,
    ),
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
    ensureConfigured(
      appwriteConfig.membershipTableId,
      "Mitgliedschafts-Tabelle",
    ),
    [
      Query.equal("user_id", parsedInput.userId),
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
    [Query.equal("membership", membershipIds), Query.limit(200)],
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
    [Query.equal("reference", parsedInput.ref), Query.limit(1)],
  );

  if (response.documents.length === 0) {
    return null;
  }

  return appwriteDocumentMetaSchema.parse(response.documents[0]).$id;
}
