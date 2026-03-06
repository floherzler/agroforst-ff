import { z } from "zod";

import {
  normalizeMembership,
  type MembershipRecord,
} from "@/lib/appwrite/appwriteMemberships";
import {
  appwriteConfig,
  appwriteFunctions as functions,
  ensureConfigured,
  parseExecutionPayload,
} from "@/lib/appwrite/shared";

const functionExecutionSchema = z.object({
  status: z.string().optional(),
  response: z.unknown().optional(),
  stderr: z.unknown().optional(),
});

const placeOrderInputSchema = z.object({
  angebotId: z.string().trim().min(1),
  menge: z.number().positive(),
  userMail: z.email(),
});

const membershipRequestInputSchema = z.object({
  type: z.enum(["privat", "business"]),
});

const verifyPaymentInputSchema = z.object({
  paymentId: z.string().trim().min(1),
  status: z.string().trim().min(1),
  membershipId: z.string().trim().optional(),
  amount: z.number().finite().optional(),
  note: z.string().trim().optional(),
});

const createProduktInputSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(1),
  sorte: z.string().trim().optional(),
  hauptkategorie: z.string().trim().min(1),
  unterkategorie: z.string().trim().optional(),
  lebensdauer: z.string().trim().optional(),
  fruchtfolgeVor: z.array(z.string()).optional(),
  fruchtfolgeNach: z.array(z.string()).optional(),
  bodenansprueche: z.array(z.string()).optional(),
  begleitpflanzen: z.array(z.string()).optional(),
});

const createAngebotInputSchema = z.object({
  produktId: z.string().trim().min(1),
  menge: z.number().positive(),
  mengeVerfuegbar: z.number().nonnegative(),
  einheit: z.string().trim().min(1),
  euroPreis: z.number().nonnegative(),
  saatPflanzDatum: z.string().trim().optional(),
  ernteProjektion: z.array(z.string()).optional(),
  mengeAbgeholt: z.number().nonnegative().optional(),
  beschreibung: z.string().trim().optional(),
});

type ExecutionPayload = {
  success?: boolean;
  error?: string;
  membership?: unknown;
};

function stringifyExecutionError(error: unknown): string {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  if (error && typeof error === "object") {
    return JSON.stringify(error);
  }
  return "Die Funktion konnte nicht ausgeführt werden.";
}

async function executeValidatedFunction<TOutput = unknown>(
  functionId: string,
  payload: Record<string, unknown>,
): Promise<TOutput> {
  const execution = functionExecutionSchema.parse(
    await functions.createExecution(
      ensureConfigured(functionId, "Appwrite Function-ID"),
      JSON.stringify(payload),
    ),
  );

  const parsedResponse = parseExecutionPayload(execution.response);
  const executionPayload =
    parsedResponse && typeof parsedResponse === "object"
      ? (parsedResponse as ExecutionPayload)
      : null;
  const status = String(execution.status ?? "").toLowerCase();

  if (status !== "completed" || executionPayload?.success === false) {
    throw new Error(
      executionPayload?.error ??
        stringifyExecutionError(execution.stderr ?? execution.response),
    );
  }

  return (parsedResponse ?? null) as TOutput;
}

export async function placeOrderRequest(input: {
  angebotId: string;
  menge: number;
  userMail: string;
}): Promise<void> {
  const parsedInput = placeOrderInputSchema.parse(input);

  await executeValidatedFunction<void>(appwriteConfig.orderFunctionId, {
    angebotID: parsedInput.angebotId,
    menge: parsedInput.menge,
    user_mail: parsedInput.userMail,
  });
}

export async function requestMembership(input: {
  type: "privat" | "business";
}): Promise<{ membership?: MembershipRecord }> {
  const parsedInput = membershipRequestInputSchema.parse(input);
  const payload = await executeValidatedFunction<ExecutionPayload>(
    appwriteConfig.membershipFunctionId,
    parsedInput,
  );

  return {
    membership: payload.membership
      ? normalizeMembership(payload.membership)
      : undefined,
  };
}

export async function verifyPayment(input: {
  paymentId: string;
  status: string;
  membershipId?: string;
  amount?: number;
  note?: string;
}): Promise<void> {
  const parsedInput = verifyPaymentInputSchema.parse(input);
  await executeValidatedFunction<void>(
    appwriteConfig.paymentVerifyFunctionId,
    parsedInput,
  );
}

export async function createProdukt(input: {
  id?: string;
  name: string;
  sorte?: string;
  hauptkategorie: string;
  unterkategorie?: string;
  lebensdauer?: string;
  fruchtfolgeVor?: string[];
  fruchtfolgeNach?: string[];
  bodenansprueche?: string[];
  begleitpflanzen?: string[];
}): Promise<void> {
  const parsedInput = createProduktInputSchema.parse(input);
  await executeValidatedFunction<void>(appwriteConfig.addProduktFunctionId, {
    id: parsedInput.id,
    name: parsedInput.name,
    sorte: parsedInput.sorte,
    hauptkategorie: parsedInput.hauptkategorie,
    unterkategorie: parsedInput.unterkategorie,
    lebensdauer: parsedInput.lebensdauer,
    fruchtfolge_vor: parsedInput.fruchtfolgeVor,
    fruchtfolge_nach: parsedInput.fruchtfolgeNach,
    bodenansprueche: parsedInput.bodenansprueche,
    begleitpflanzen: parsedInput.begleitpflanzen,
  });
}

export async function createAngebot(input: {
  produktId: string;
  menge: number;
  mengeVerfuegbar: number;
  einheit: string;
  euroPreis: number;
  saatPflanzDatum?: string;
  ernteProjektion?: string[];
  mengeAbgeholt?: number;
  beschreibung?: string;
}): Promise<void> {
  const parsedInput = createAngebotInputSchema.parse(input);
  await executeValidatedFunction<void>(appwriteConfig.addAngebotFunctionId, {
    menge: parsedInput.menge,
    mengeVerfuegbar: parsedInput.mengeVerfuegbar,
    einheit: parsedInput.einheit,
    euroPreis: parsedInput.euroPreis,
    saatPflanzDatum: parsedInput.saatPflanzDatum,
    ernteProjektion: parsedInput.ernteProjektion,
    mengeAbgeholt: parsedInput.mengeAbgeholt,
    beschreibung: parsedInput.beschreibung,
    produktID: parsedInput.produktId,
  });
}
