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
  membershipId: z.string().trim().min(1),
  menge: z.number().positive().optional(),
  staffeln: z.array(
    z.object({
      teilung: z.number().positive(),
      anzahl: z.number().int().positive(),
    }),
  ).optional(),
  userMail: z.email(),
}).superRefine((value, context) => {
  if (!value.menge && (!value.staffeln || value.staffeln.length === 0)) {
    context.addIssue({
      code: "custom",
      message: "Entweder eine Menge oder Preisstaffeln sind erforderlich.",
      path: ["menge"],
    });
  }
});

const membershipRequestInputSchema = z.object({
  type: z.enum(["privat", "business", "betrieb"]),
});

const verifyPaymentInputSchema = z.object({
  paymentId: z.string().trim().min(1),
  status: z.string().trim().min(1),
  membershipId: z.string().trim().optional(),
  amount: z.number().finite().optional(),
  note: z.string().trim().optional(),
  force: z.boolean().optional(),
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
      false,
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

  if (parsedResponse === null) {
    throw new Error("Die Funktion hat keine auswertbare Antwort geliefert.");
  }

  return parsedResponse as TOutput;
}

export async function placeOrderRequest(input: {
  angebotId: string;
  membershipId: string;
  menge?: number;
  staffeln?: Array<{ teilung: number; anzahl: number }>;
  userMail: string;
}): Promise<void> {
  const parsedInput = placeOrderInputSchema.parse(input);

  await executeValidatedFunction<void>(appwriteConfig.orderFunctionId, {
    angebot_id: parsedInput.angebotId,
    mitgliedschaft_id: parsedInput.membershipId,
    menge: parsedInput.menge,
    staffeln: parsedInput.staffeln,
    benutzer_email: parsedInput.userMail,
  });
}

export async function requestMembership(input: {
  type: "privat" | "business" | "betrieb";
}): Promise<{ membership?: MembershipRecord }> {
  const parsedInput = membershipRequestInputSchema.parse(input);
  const payload = await executeValidatedFunction<ExecutionPayload>(
    appwriteConfig.membershipFunctionId,
    {
      mitgliedschaftstyp:
        parsedInput.type === "business" ? "betrieb" : parsedInput.type,
    },
  );

  return {
    membership: payload?.membership
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
  force?: boolean;
}): Promise<void> {
  const parsedInput = verifyPaymentInputSchema.parse(input);
  await executeValidatedFunction<void>(
    appwriteConfig.paymentVerifyFunctionId,
    {
      zahlung_id: parsedInput.paymentId,
      status: parsedInput.status,
      mitgliedschaft_id: parsedInput.membershipId,
      betrag: parsedInput.amount,
      notiz: parsedInput.note,
      force: parsedInput.force,
    },
  );
}
