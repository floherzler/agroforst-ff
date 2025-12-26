import { Client, Databases, ID } from "https://deno.land/x/appwrite@7.0.0/mod.ts";

type Body = {
    id?: string;
    name?: string;
    sorte?: string;
    hauptkategorie?: string;
    unterkategorie?: string;
    lebensdauer?: string;
    fruchtfolge_vor?: string[];
    fruchtfolge_nach?: string[];
    bodenansprueche?: string[];
    begleitpflanzen?: string[];
    meta?: Record<string, unknown>;
    [key: string]: unknown;
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

const getApiKey = (req: any, log: (msg: string) => void): string => {
    const envKey =
        readEnv("APPWRITE_FUNCTION_KEY") ||
        readEnv("APPWRITE_FUNCTION_API_KEY") ||
        readEnv("APPWRITE_API_KEY") ||
        "";

    if (envKey) return envKey;

    const headerKey = req.headers["x-appwrite-key"] ?? req.headers["X-Appwrite-Key"] ?? "";
    if (headerKey) {
        log("[addProdukt] Falling back to x-appwrite-key header (env key missing)");
        return headerKey;
    }

    log("[addProdukt] Warning: no API key found in env or headers");
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

const allowedFields = [
    "name",
    "sorte",
    "hauptkategorie",
    "unterkategorie",
    "lebensdauer",
    "fruchtfolge_vor",
    "fruchtfolge_nach",
    "bodenansprueche",
    "begleitpflanzen",
    "meta",
];

const cleanPayload = (body: Body): Record<string, unknown> => {
    const data: Record<string, unknown> = {};
    for (const key of allowedFields) {
        if (body[key as keyof Body] !== undefined) {
            data[key] = body[key as keyof Body] as unknown;
        }
    }
    if (body.meta && typeof body.meta === "object") {
        data.meta = body.meta;
    }
    return data;
};

export default async ({ req, res, log, error }: any) => {
    const debugFlag = readEnv("APPWRITE_FUNCTION_DEBUG") || readEnv("APP_DEBUG");
    const debugOn = String(debugFlag ?? "").trim() === "1";
    try {
        const callerId: string | undefined =
            req.headers["x-appwrite-user-id"] ?? req.headers["X-Appwrite-User-Id"];
        log(`[addProdukt] Execution triggered. Caller present: ${Boolean(callerId)} ✅`);
        if (!callerId) return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);

        const body = (await extractBody(req)) as Body;
        const payload = cleanPayload(body);
        const docId = (body.id as string)?.trim() || "";
        if (!payload.name) {
            return fail(res, "Field \"name\" is required", 400);
        }

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const dbId = readEnv("APPWRITE_FUNCTION_DATABASE_ID");
        const collectionId = readEnv("APPWRITE_FUNCTION_PRODUCE_COLLECTION_ID");
        const apiKey = getApiKey(req, log);

        if (!endpoint || !projectId) {
            return fail(res, "Function endpoint or project ID is not configured", 500);
        }
        if (!dbId || !collectionId) {
            return fail(res, "Database or produce collection is not configured", 500);
        }
        if (!apiKey) {
            return fail(res, "Missing Appwrite API key for function", 500);
        }

        const client = new Client()
            .setEndpoint(endpoint)
            .setProject(projectId)
            .setKey(apiKey);
        const databases = new Databases(client);

        const targetId = docId || ID.unique();
        let result;
        try {
            result = await databases.createDocument(dbId, collectionId, targetId, {
                ...payload,
                createdBy: callerId,
            });
            log(`[addProdukt] Created new product ${result.$id}`);
        } catch (e: any) {
            if (e?.code === 409) {
                result = await databases.updateDocument(dbId, collectionId, targetId, {
                    ...payload,
                    updatedBy: callerId,
                    updatedAt: new Date().toISOString(),
                });
                log(`[addProdukt] Upserted existing product ${result.$id}`);
            } else {
                error(`[addProdukt] Failed saving product: ${e?.message ?? e}`);
                return fail(res, "Failed to save product", 500);
            }
        }

        return ok(res, { success: true, product: result });
    } catch (e: any) {
        const msg = String(e?.message ?? e ?? "Unknown error");
        error(`[addProdukt] Uncaught error: ${msg}`);
        if (debugOn) {
            return fail(res, "Internal error", 500, { details: msg });
        }
        return fail(res, "Internal error", 500);
    }
};
