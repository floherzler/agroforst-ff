import { Client, Databases, Users } from "https://deno.land/x/appwrite@7.0.0/mod.ts";

type Body = {
    paymentId?: string;
    membershipId?: string;
    status?: string;
    amount?: number;
    note?: string;
    force?: boolean;
};

function ok(res: any, data: unknown, status = 200) {
    return res.json(data, status);
}

function fail(res: any, msg: string, status = 400, extra: Record<string, unknown> = {}) {
    return res.json({ success: false, error: msg, ...extra }, status);
}

const readEnv = (key: string): string => {
    const deno = (globalThis as any)?.Deno;
    if (deno?.env?.get) {
        const fromDeno = deno.env.get(key);
        if (fromDeno) return fromDeno;
    }
    if (typeof process !== "undefined" && process.env) {
        const fromProcess = process.env[key];
        if (fromProcess) return fromProcess;
    }
    return "";
};

async function extractBody(req: any): Promise<Record<string, unknown>> {
    const tryParse = async (source: any) => {
        if (typeof source === "string" && source.length > 0) {
            try {
                return JSON.parse(source);
            } catch {
                return undefined;
            }
        }
        if (typeof source === "object" && source !== null) {
            return source;
        }
        return undefined;
    };

    try {
        const body = await req.json();
        if (body && typeof body === "object") return body;
    } catch {
        // ignore
    }

    const candidates = [req.bodyJson, req.bodyText, req.bodyRaw, req.payload];
    for (const candidate of candidates) {
        const parsed = await tryParse(candidate);
        if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    }

    return {};
}

function normalizeStatus(status: unknown): string {
    const raw = (typeof status === "string" ? status : "")
        .trim()
        .toLowerCase();
    if (!raw) return "bezahlt";
    return raw;
}

async function ensureAdmin(users: Users, callerId: string) {
    const caller = await users.get(callerId);
    const labels = Array.isArray(caller.labels) ? (caller.labels as string[]) : [];
    const isAdmin = labels.some((label) => label.toLowerCase() === "admin");
    if (!isAdmin) {
        throw new Error("Caller must be an admin");
    }
    return caller;
}

export default async ({ req, res, log, error }: any) => {
    try {
        const callerId: string | undefined =
            req.headers["x-appwrite-user-id"] ?? req.headers["X-Appwrite-User-Id"];
        log(`[verifyPayment] Received execution. Caller present: ${Boolean(callerId)} ✅`);
        if (!callerId) return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);

        const body = await extractBody(req);
        const paymentId = (
            (body.paymentId as string) ?? (body.payment_id as string) ?? ""
        ).trim();
        const membershipId = (
            (body.membershipId as string) ?? (body.membership_id as string) ?? ""
        ).trim() || undefined;
        const note = (body.note as string) ?? undefined;
        const amountRaw = body.amount ?? body.betrag ?? body.value;
        const amount = typeof amountRaw === "number" ? amountRaw : Number(amountRaw);
        const force = Boolean(body.force);
        const status = normalizeStatus(body.status);

        if (!paymentId) return fail(res, "Missing paymentId", 400);

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const dbId = readEnv("APPWRITE_FUNCTION_DATABASE_ID");
        const paymentsCollection = readEnv("APPWRITE_FUNCTION_PAYMENT_COLLECTION_ID");
        const membershipCollection = readEnv("APPWRITE_FUNCTION_MEMBERSHIP_COLLECTION_ID");

        if (!dbId || !paymentsCollection) {
            return fail(res, "Payment collection or database is not configured", 500);
        }

        const client = new Client()
            .setEndpoint(endpoint)
            .setProject(projectId)
            .setKey(req.headers["x-appwrite-key"] ?? "");
        const users = new Users(client);
        const databases = new Databases(client);

        const caller = await ensureAdmin(users, callerId);
        log(`[verifyPayment] Caller ${caller.$id} validated as admin (${caller.email ?? "n/a"}) 🔐`);

        const nowIso = new Date().toISOString();

        const existing = await databases.getDocument(dbId, paymentsCollection, paymentId);
        const existingStatus = ((existing as any)?.status ?? "").toString().toLowerCase();
        if (existingStatus === status && !force) {
            return ok(res, {
                success: true,
                message: `Payment already marked as ${status}`,
                payment: existing,
            });
        }

        const updatePayload: Record<string, unknown> = {
            status,
            verifiedAt: nowIso,
            verifiedBy: {
                userId: caller.$id,
                email: caller.email ?? null,
            },
            ...(note ? { note } : {}),
        };
        if (Number.isFinite(amount)) {
            updatePayload.amount = amount;
        }

        let updatedPayment: any;
        try {
            updatedPayment = await databases.updateDocument(
                dbId,
                paymentsCollection,
                paymentId,
                updatePayload
            );
            log(`[verifyPayment] Updated payment ${paymentId} -> ${status}`);
        } catch (e: any) {
            error(`[verifyPayment] Failed updating payment: ${e.message}`);
            return fail(res, "Failed to update payment", 500);
        }

        if (membershipId && membershipCollection) {
            try {
                const membershipPayload: Record<string, unknown> = {
                    bezahl_status: status,
                    letzte_zahlung_id: paymentId,
                    letzte_zahlung_zeit: nowIso,
                };
                if (Number.isFinite(amount)) {
                    membershipPayload.lastPaymentAmount = amount;
                }
                await databases.updateDocument(
                    dbId,
                    membershipCollection,
                    membershipId,
                    membershipPayload
                );
                log(`[verifyPayment] Updated membership ${membershipId} embark status=${status}`);
            } catch (e: any) {
                log(`[verifyPayment] Warning: membership update failed: ${e.message}`);
            }
        }

        return ok(res, {
            success: true,
            message: `Payment ${paymentId} marked as ${status}`,
            payment: updatedPayment,
        });
    } catch (e: any) {
        const msg = String(e?.message ?? e ?? "Unknown error");
        error(`[verifyPayment] Uncaught error: ${msg}`);
        return fail(res, "Internal error", 500, { details: msg });
    }
};
