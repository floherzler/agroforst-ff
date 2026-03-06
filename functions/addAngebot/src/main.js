import { Client, Databases, ID, Users } from "node-appwrite";

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
        log(`[addAngebot] Incoming execution. Caller present: ${Boolean(callerId)}`);
        if (!callerId) {
            return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);
        }

        const body = await extractBody(req);
        const produktID = String(body.produktID ?? "").trim();
        const menge = Number(body.menge ?? 0);
        const einheit = String(body.einheit ?? "").trim();
        const euroPreis = Number(body.euroPreis ?? 0);

        if (!produktID) {
            return fail(res, "produktID is required", 400);
        }
        if (!einheit) {
            return fail(res, "einheit is required", 400);
        }
        if (!Number.isFinite(menge) || menge <= 0) {
            return fail(res, "menge must be a positive number", 400);
        }

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const dbId = readEnv("APPWRITE_FUNCTION_DATABASE_ID");
        const collectionId = readEnv("APPWRITE_FUNCTION_STAFFEL_COLLECTION_ID");
        const productCollectionId = readEnv("APPWRITE_FUNCTION_PRODUCE_COLLECTION_ID");
        const apiKey = readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");

        if (!endpoint || !projectId || !apiKey) {
            return fail(res, "Function endpoint, project ID, or API key is not configured", 500);
        }
        if (!dbId || !collectionId) {
            return fail(res, "Database or staffel collection is not configured", 500);
        }

        const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
        const users = new Users(client);
        const databases = new Databases(client);

        await ensureAdmin(users, callerId);

        if (productCollectionId) {
            try {
                await databases.getDocument(dbId, productCollectionId, produktID);
            } catch {
                return fail(res, "Referenced produktID does not exist", 404);
            }
        }

        const nowIso = new Date().toISOString();
        const data = {
            produktID,
            menge,
            mengeVerfuegbar: Number(body.mengeVerfuegbar ?? menge),
            einheit,
            euroPreis,
            saatPflanzDatum: body.saatPflanzDatum ? new Date(body.saatPflanzDatum).toISOString() : nowIso,
            ernteProjektion: Array.isArray(body.ernteProjektion)
                ? body.ernteProjektion.map((date) => new Date(date).toISOString())
                : [],
            mengeAbgeholt: Number(body.mengeAbgeholt ?? 0),
            beschreibung: body.beschreibung ?? null,
            meta: body.meta ?? {},
            createdBy: callerId,
            createdAt: nowIso,
        };

        const targetId = String(body.angebotId ?? body.id ?? "").trim() || ID.unique();
        let result;

        try {
            result = await databases.createDocument(dbId, collectionId, targetId, data);
            log(`[addAngebot] Created new offer ${result.$id}`);
        } catch (appwriteError) {
            if (appwriteError?.code === 409) {
                result = await databases.updateDocument(dbId, collectionId, targetId, {
                    ...data,
                    updatedBy: callerId,
                    updatedAt: nowIso,
                });
                log(`[addAngebot] Updated existing offer ${result.$id}`);
            } else {
                error(`[addAngebot] Failed storing offer: ${appwriteError?.message ?? appwriteError}`);
                return fail(res, "Failed to store offer", 500);
            }
        }

        return ok(res, { success: true, offer: result });
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        error(`[addAngebot] Uncaught error: ${msg}`);
        return fail(res, "Internal error", 500, { details: msg });
    }
};
