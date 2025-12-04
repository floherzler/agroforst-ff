import { Client, Databases, Users, ID } from "https://deno.land/x/appwrite@7.0.0/mod.ts";

type Body = {
    id?: string;
    angebotId?: string;
    produktID?: string;
    menge?: number;
    mengeVerfuegbar?: number;
    einheit?: string;
    euroPreis?: number;
    saatPflanzDatum?: string;
    ernteProjektion?: string[];
    mengeAbgeholt?: number;
    beschreibung?: string;
    meta?: Record<string, unknown>;
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
        log(`[addAngebot] Incoming execution. Caller present: ${Boolean(callerId)} ✅`);
        if (!callerId) return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);

        const body = (await extractBody(req)) as Body;
        const produktID = (body.produktID ?? "").toString().trim();
        const menge = Number(body.menge ?? 0);
        const einheit = (body.einheit ?? "").toString().trim();
        const euroPreis = Number(body.euroPreis ?? 0);

        if (!produktID) return fail(res, "produktID is required", 400);
        if (!einheit) return fail(res, "einheit is required", 400);
        if (!Number.isFinite(menge) || menge <= 0) return fail(res, "menge must be a positive number", 400);

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const dbId = readEnv("APPWRITE_FUNCTION_DATABASE_ID");
        const collectionId = readEnv("APPWRITE_FUNCTION_STAFFEL_COLLECTION_ID");
        const productCollectionId = readEnv("APPWRITE_FUNCTION_PRODUCE_COLLECTION_ID");

        if (!dbId || !collectionId) {
            return fail(res, "Database or staffel collection is not configured", 500);
        }

        const client = new Client()
            .setEndpoint(endpoint)
            .setProject(projectId)
            .setKey(req.headers["x-appwrite-key"] ?? "");
        const users = new Users(client);
        const databases = new Databases(client);

        await ensureAdmin(users, callerId);

        if (productCollectionId) {
            try {
                await databases.getDocument(dbId, productCollectionId, produktID);
            } catch (_e) {
                return fail(res, "Referenced produktID does not exist", 404);
            }
        }

        const nowIso = new Date().toISOString();
        const data: Record<string, unknown> = {
            produktID,
            menge,
            mengeVerfuegbar: Number(body.mengeVerfuegbar ?? menge),
            einheit,
            euroPreis,
            saatPflanzDatum: body.saatPflanzDatum
                ? new Date(body.saatPflanzDatum).toISOString()
                : nowIso,
            ernteProjektion: Array.isArray(body.ernteProjektion)
                ? body.ernteProjektion.map((date) => new Date(date).toISOString())
                : [],
            mengeAbgeholt: Number(body.mengeAbgeholt ?? 0),
            beschreibung: body.beschreibung ?? null,
            meta: body.meta ?? {},
            createdBy: callerId,
            createdAt: nowIso,
        };

        const targetId = (body.angebotId ?? body.id ?? "").toString().trim() || ID.unique();
        let result;
        try {
            result = await databases.createDocument(dbId, collectionId, targetId, data);
            log(`[addAngebot] Created new offer ${result.$id}`);
        } catch (e: any) {
            if (e?.code === 409) {
                result = await databases.updateDocument(dbId, collectionId, targetId, {
                    ...data,
                    updatedBy: callerId,
                    updatedAt: nowIso,
                });
                log(`[addAngebot] Updated existing offer ${result.$id}`);
            } else {
                error(`[addAngebot] Failed storing offer: ${e?.message ?? e}`);
                return fail(res, "Failed to store offer", 500);
            }
        }

        return ok(res, { success: true, offer: result });
    } catch (e: any) {
        const msg = String(e?.message ?? e ?? "Unknown error");
        error(`[addAngebot] Uncaught error: ${msg}`);
        return fail(res, "Internal error", 500, { details: msg });
    }
};
