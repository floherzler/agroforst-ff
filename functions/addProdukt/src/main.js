import { Client, ID, TablesDB } from "node-appwrite";

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

function getApiKey(req, log) {
    const envKey = readEnv(
        "APPWRITE_FUNCTION_KEY",
        "APPWRITE_FUNCTION_API_KEY",
        "APPWRITE_API_KEY"
    );
    if (envKey) {
        return envKey;
    }

    const headerKey = readHeader(req, "x-appwrite-key");
    if (headerKey) {
        log("[addProdukt] Falling back to x-appwrite-key header (env key missing)");
        return headerKey;
    }

    log("[addProdukt] Warning: no API key found in env or headers");
    return "";
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

function cleanPayload(body) {
    const data = {};
    for (const key of allowedFields) {
        if (body[key] !== undefined) {
            data[key] = body[key];
        }
    }
    if (body.meta && typeof body.meta === "object") {
        data.meta = body.meta;
    }
    return data;
}

export default async ({ req, res, log, error }) => {
    const debugOn = readEnv("APPWRITE_FUNCTION_DEBUG", "APP_DEBUG") === "1";

    try {
        const callerId = readHeader(req, "x-appwrite-user-id");
        log(`[addProdukt] Execution triggered. Caller present: ${Boolean(callerId)}`);
        if (!callerId) {
            return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);
        }

        const body = await extractBody(req);
        const payload = cleanPayload(body);
        const docId = typeof body.id === "string" ? body.id.trim() : "";

        if (!payload.name) {
            return fail(res, 'Field "name" is required', 400);
        }
        if (!payload.hauptkategorie || typeof payload.hauptkategorie !== "string") {
            return fail(res, 'Field "hauptkategorie" is required', 400);
        }

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const dbId = readEnv("APPWRITE_FUNCTION_DATABASE_ID");
        const collectionId = readEnv("APPWRITE_FUNCTION_PRODUCE_COLLECTION_ID");
        const apiKey = getApiKey(req, log);

        log(
            `[addProdukt] Configuration: endpoint=${endpoint ? "set" : "missing"} projectId=${projectId ? "set" : "missing"} dbId=${dbId ? "set" : "missing"} collectionId=${collectionId ? "set" : "missing"} apiKey=${apiKey ? "set" : "missing"}`
        );

        if (!endpoint || !projectId) {
            return fail(res, "Function endpoint or project ID is not configured", 500);
        }
        if (!dbId || !collectionId) {
            return fail(res, "Database or produce collection is not configured", 500);
        }
        if (!apiKey) {
            return fail(res, "Missing Appwrite API key for function", 500);
        }

        const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
        const tables = new TablesDB(client);

        const targetId = docId || ID.unique();
        let result;

        try {
            result = await tables.createRow({
                databaseId: dbId,
                tableId: collectionId,
                rowId: targetId,
                data: payload,
            });
            log(`[addProdukt] Created new product ${result.$id}`);
        } catch (appwriteError) {
            if (appwriteError?.code === 409) {
                result = await tables.updateRow({
                    databaseId: dbId,
                    tableId: collectionId,
                    rowId: targetId,
                    data: payload,
                });
                log(`[addProdukt] Upserted existing product ${result.$id}`);
            } else {
                error(`[addProdukt] Failed saving product: ${appwriteError?.message ?? appwriteError}`);
                return fail(res, "Failed to save product", 500);
            }
        }

        return ok(res, { success: true, product: result });
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        error(`[addProdukt] Uncaught error: ${msg}`);
        if (debugOn) {
            return fail(res, "Internal error", 500, { details: msg });
        }
        return fail(res, "Internal error", 500);
    }
};
