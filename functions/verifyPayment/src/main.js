import { Client, Databases, Users } from "node-appwrite";

function ok(res, data, status = 200) {
    return res.json(data, status);
}

function fail(res, msg, status = 400, extra = {}) {
    return res.json({ success: false, error: msg, ...extra }, status);
}

function readEnv(...keys) {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === "string" && value.length > 0) {
            return value;
        }
    }
    return "";
}

function readHeader(req, key) {
    const headers = req?.headers ?? {};
    if (typeof headers.get === "function") {
        return headers.get(key) ?? headers.get(key.toLowerCase()) ?? "";
    }
    return headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()] ?? "";
}

async function extractBody(req) {
    const tryParse = (source) => {
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
        if (body && typeof body === "object") {
            return body;
        }
    } catch {
        // ignore
    }

    const candidates = [req?.bodyJson, req?.bodyText, req?.bodyRaw, req?.payload];
    for (const candidate of candidates) {
        const parsed = tryParse(candidate);
        if (parsed && typeof parsed === "object") {
            return parsed;
        }
    }

    return {};
}

function normalizeStatus(status) {
    const raw = typeof status === "string" ? status.trim().toLowerCase() : "";
    return raw || "bezahlt";
}

async function ensureAdmin(users, callerId) {
    const caller = await users.get(callerId);
    const labels = Array.isArray(caller.labels) ? caller.labels : [];
    const isAdmin = labels.some((label) => String(label).toLowerCase() === "admin");
    if (!isAdmin) {
        throw new Error("Caller must be an admin");
    }
    return caller;
}

export default async ({ req, res, log, error }) => {
    try {
        const callerId = readHeader(req, "x-appwrite-user-id");
        log(`[verifyPayment] Received execution. Caller present: ${Boolean(callerId)}`);
        if (!callerId) {
            return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);
        }

        const body = await extractBody(req);
        const paymentId = String(body.paymentId ?? body.payment_id ?? "").trim();
        const membershipId = String(body.membershipId ?? body.membership_id ?? "").trim() || undefined;
        const note = typeof body.note === "string" ? body.note : undefined;
        const force = Boolean(body.force);
        const status = normalizeStatus(body.status);

        if (!paymentId) {
            return fail(res, "Missing paymentId", 400);
        }

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const apiKey = readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");
        const dbId = readEnv("APPWRITE_FUNCTION_DATABASE_ID");
        const paymentsCollection = readEnv("APPWRITE_FUNCTION_PAYMENT_COLLECTION_ID");
        const membershipCollection = readEnv("APPWRITE_FUNCTION_MEMBERSHIP_COLLECTION_ID");

        if (!endpoint || !projectId || !apiKey) {
            return fail(res, "Function endpoint, project ID, or API key is not configured", 500);
        }
        if (!dbId || !paymentsCollection) {
            return fail(res, "Payment collection or database is not configured", 500);
        }

        const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
        const users = new Users(client);
        const databases = new Databases(client);

        const caller = await ensureAdmin(users, callerId);
        log(`[verifyPayment] Caller ${caller.$id} validated as admin (${caller.email ?? "n/a"})`);

        const nowIso = new Date().toISOString();
        const existing = await databases.getDocument(dbId, paymentsCollection, paymentId);
        const existingStatus = String(existing?.status ?? "").toLowerCase();
        if (existingStatus === status && !force) {
            return ok(res, {
                success: true,
                message: `Payment already marked as ${status}`,
                payment: existing,
            });
        }

        let updatedPayment;
        try {
            updatedPayment = await databases.updateDocument(dbId, paymentsCollection, paymentId, {
                status,
                verifiedAt: nowIso,
                ...(note ? { note } : {}),
            });
            log(`[verifyPayment] Updated payment ${paymentId} -> ${status}`);
        } catch (appwriteError) {
            error(`[verifyPayment] Failed updating payment: ${appwriteError?.message ?? appwriteError}`);
            return fail(res, "Failed to update payment", 500);
        }

        if (membershipId && membershipCollection) {
            try {
                await databases.updateDocument(dbId, membershipCollection, membershipId, {
                    bezahl_status: status,
                    letzte_zahlung_id: paymentId,
                    letzte_zahlung_zeit: nowIso,
                });
                log(`[verifyPayment] Updated membership ${membershipId} status=${status}`);
            } catch (appwriteError) {
                log(`[verifyPayment] Warning: membership update failed: ${appwriteError?.message ?? appwriteError}`);
            }
        }

        return ok(res, {
            success: true,
            message: `Payment ${paymentId} marked as ${status}`,
            payment: updatedPayment,
        });
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        error(`[verifyPayment] Uncaught error: ${msg}`);
        return fail(res, "Internal error", 500, { details: msg });
    }
};
