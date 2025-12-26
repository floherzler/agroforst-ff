import { Client, TablesDB, ID } from "npm:node-appwrite";

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

const getApiKey = (req: any, log: (msg: string) => void): string => {
    const envKey =
        (Deno.env.get("APPWRITE_FUNCTION_KEY") ?? process.env.APPWRITE_FUNCTION_KEY ?? "") ||
        (Deno.env.get("APPWRITE_FUNCTION_API_KEY") ?? process.env.APPWRITE_FUNCTION_API_KEY ?? "") ||
        (Deno.env.get("APPWRITE_API_KEY") ?? process.env.APPWRITE_API_KEY ?? "");

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
    "saisonalitaet",
    "imageID",
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
    const debugFlag =
        Deno.env.get("APPWRITE_FUNCTION_DEBUG") ??
        Deno.env.get("APP_DEBUG") ??
        process.env.APPWRITE_FUNCTION_DEBUG ??
        process.env.APP_DEBUG;
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
        if (!payload.hauptkategorie || typeof payload.hauptkategorie !== "string") {
            return fail(res, "Field \"hauptkategorie\" is required", 400);
        }

        const endpoint =
            Deno.env.get("APPWRITE_FUNCTION_API_ENDPOINT") ??
            (process.env.APPWRITE_FUNCTION_API_ENDPOINT as string | undefined) ??
            "";
        const projectId =
            Deno.env.get("APPWRITE_FUNCTION_PROJECT_ID") ??
            (process.env.APPWRITE_FUNCTION_PROJECT_ID as string | undefined) ??
            "";
        const dbId = Deno.env.get("APPWRITE_FUNCTION_DATABASE_ID") ?? process.env.APPWRITE_FUNCTION_DATABASE_ID ?? "";
        const collectionId =
            Deno.env.get("APPWRITE_FUNCTION_PRODUCE_COLLECTION_ID") ??
            process.env.APPWRITE_FUNCTION_PRODUCE_COLLECTION_ID ??
            "";
        const apiKey = getApiKey(req, log);

        log(`[addProdukt] Configuration: endpoint=${endpoint ? "set" : "missing"} projectId=${projectId ? "set" : "missing"} dbId=${dbId ? "set" : "missing"} collectionId=${collectionId ? "set" : "missing"} apiKey=${apiKey ? "set" : "missing"}`);

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
        log(`[addProdukt] Appwrite client configured ✅`);
        const tables = new TablesDB(client);
        log(`[addProdukt] TablesDB instance created ✅`);

        const targetId = docId || ID.unique();
        log(`[addProdukt] Using targetId=${targetId} project=${projectId} db=${dbId} collection=${collectionId}`);
        log(`[addProdukt] Payload keys: ${Object.keys(payload).join(", ")}`);
        let result;
        try {
            result = await tables.createRow({
                databaseId: dbId,
                tableId: collectionId,
                rowId: targetId,
                data: {
                    ...payload,
                },
            });
            log(`[addProdukt] Created new product ${result.$id}`);
        } catch (e: any) {
            if (e?.code === 409) {
                result = await tables.updateRow({
                    databaseId: dbId,
                    tableId: collectionId,
                    rowId: targetId,
                    data: {
                        ...payload,
                    },
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
