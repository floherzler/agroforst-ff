import { Client, Databases, Query } from "appwrite";
import { z } from "zod";

import {
  appwriteConfig,
  appwriteDocumentMetaSchema,
  ensureConfigured,
  parseOptionalNumber,
  parseOptionalString,
} from "@/lib/appwrite/shared";

const client = new Client()
  .setEndpoint(ensureConfigured(appwriteConfig.endpoint, "Appwrite Endpoint"))
  .setProject(ensureConfigured(appwriteConfig.projectId, "Appwrite Projekt-ID"));

const databases = new Databases(client);

const paymentDocumentSchema = appwriteDocumentMetaSchema.extend({
  status: z.string().optional(),
  state: z.string().optional(),
  ref: z.string().optional(),
  reference: z.string().optional(),
  verwendungszweck: z.string().optional(),
  betrag: z.unknown().optional(),
  betrag_eur: z.unknown().optional(),
  amount: z.unknown().optional(),
  rechnung: z
    .object({
      betrag_eur: z.unknown().optional(),
    })
    .optional(),
  faellig_am: z.string().optional(),
  due_at: z.string().optional(),
});

const membershipDocumentSchema = appwriteDocumentMetaSchema.extend({
  typ: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  state: z.string().optional(),
  beantragungs_datum: z.string().optional(),
  beantragt_am: z.string().optional(),
  dauer_jahre: z.unknown().optional(),
  dauer: z.unknown().optional(),
  laufzeit: z.unknown().optional(),
  bezahl_status: z.string().optional(),
  payment_status: z.string().optional(),
  paymentStatus: z.string().optional(),
  kontingent_aktuell: z.unknown().optional(),
  aktuelles_kontingent: z.unknown().optional(),
  kontingent: z.unknown().optional(),
  balance: z.unknown().optional(),
  guthaben: z.unknown().optional(),
  kontingent_start: z.unknown().optional(),
  start_kontingent: z.unknown().optional(),
  kontingent_gesamt: z.unknown().optional(),
  rechnungsadresse: z.string().optional(),
  adresse: z.string().optional(),
  address: z.string().optional(),
  zahlungen: z.unknown().optional(),
  payments: z.unknown().optional(),
  payment: z.unknown().optional(),
  rechnungen: z.unknown().optional(),
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
  status?: string;
  ref?: string;
  betrag?: number;
  betragEur?: number;
  faelligAm?: string;
  createdAt?: string;
};

export type MembershipRecord = {
  id: string;
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

export function normalizeMembershipPayment(raw: unknown): MembershipPayment {
  const parsed = paymentDocumentSchema.parse(raw);

  return {
    id: parsed.$id,
    status: parseOptionalString(parsed.status ?? parsed.state),
    ref: parseOptionalString(parsed.ref ?? parsed.reference ?? parsed.verwendungszweck),
    betrag: parseOptionalNumber(parsed.betrag ?? parsed.amount),
    betragEur: parseOptionalNumber(parsed.betrag_eur ?? parsed.rechnung?.betrag_eur),
    faelligAm: parseOptionalString(parsed.faellig_am ?? parsed.due_at),
    createdAt: parsed.$createdAt,
  };
}

export function normalizeMembership(raw: unknown): MembershipRecord {
  const parsed = membershipDocumentSchema.parse(raw);
  const paymentsRaw =
    parsed.zahlungen ??
    parsed.payments ??
    parsed.payment ??
    parsed.rechnungen ??
    [];

  return {
    id: parsed.$id,
    typ: parseOptionalString(parsed.typ ?? parsed.type),
    status: parseOptionalString(parsed.status ?? parsed.state),
    beantragungsDatum: parseOptionalString(parsed.beantragungs_datum ?? parsed.beantragt_am ?? parsed.$createdAt),
    createdAt: parsed.$createdAt,
    dauerJahre: parseOptionalNumber(parsed.dauer_jahre ?? parsed.dauer ?? parsed.laufzeit),
    bezahlStatus: parseOptionalString(parsed.bezahl_status ?? parsed.payment_status ?? parsed.paymentStatus),
    kontingentAktuell: parseOptionalNumber(
      parsed.kontingent_aktuell ?? parsed.aktuelles_kontingent ?? parsed.kontingent ?? parsed.balance ?? parsed.guthaben,
    ),
    kontingentStart: parseOptionalNumber(
      parsed.kontingent_start ?? parsed.start_kontingent ?? parsed.kontingent_gesamt,
    ),
    adresse: parseOptionalString(parsed.rechnungsadresse ?? parsed.adresse ?? parsed.address),
    payments: Array.isArray(paymentsRaw)
      ? paymentsRaw.map(normalizeMembershipPayment).filter((payment) => payment.id)
      : [],
  };
}

export async function listMembershipsByUserId(input: {
  userId: string;
  limit?: number;
}): Promise<MembershipRecord[]> {
  const parsedInput = membershipListInputSchema.parse(input);

  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.membershipCollectionId, "Mitgliedschafts-Collection"),
    [
      Query.equal("userID", parsedInput.userId),
      Query.orderDesc("$createdAt"),
      Query.limit(parsedInput.limit ?? 10),
      Query.select([
        "*",
        "zahlungen.$id",
        "zahlungen.status",
        "zahlungen.ref",
        "zahlungen.betrag",
        "zahlungen.betrag_eur",
        "zahlungen.amount",
        "zahlungen.rechnung.betrag_eur",
        "zahlungen.faellig_am",
        "zahlungen.due_at",
        "zahlungen.$createdAt",
      ]),
    ],
  );

  return response.documents.map(normalizeMembership);
}

export async function findPaymentIdByRef(ref: string): Promise<string | null> {
  const parsedInput = paymentRefInputSchema.parse({ ref });
  const response = await databases.listDocuments(
    ensureConfigured(appwriteConfig.databaseId, "Appwrite Datenbank"),
    ensureConfigured(appwriteConfig.paymentCollectionId, "Zahlungs-Collection"),
    [Query.equal("ref", parsedInput.ref), Query.limit(1)],
  );

  if (response.documents.length === 0) {
    return null;
  }

  return appwriteDocumentMetaSchema.parse(response.documents[0]).$id;
}
