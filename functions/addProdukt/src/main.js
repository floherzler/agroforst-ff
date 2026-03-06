import { Client, ID, TablesDB, Users } from "node-appwrite";

const DEFAULT_DATABASE_ID = "agroforst";
const DEFAULT_PRODUCTS_TABLE_ID = "products";

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

    for (const candidate of [req?.bodyJson, req?.bodyText, req?.bodyRaw, req?.payload]) {
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

function parseStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter((entry) => entry.length > 0);
}

function compactObject(value) {
    return Object.fromEntries(
        Object.entries(value).filter(([, entry]) => entry !== undefined)
    );
}

function cleanPayload(body) {
    const category = String(body.category ?? body.hauptkategorie ?? "").trim();
    if (!category) {
        throw new Error('Field "category" is required');
    }

    return compactObject({
        name: String(body.name ?? "").trim(),
        variety: String(body.variety ?? body.sorte ?? "").trim(),
        category,
        subcategory: String(body.subcategory ?? body.unterkategorie ?? "").trim(),
        lifespan: String(body.lifespan ?? body.lebensdauer ?? "").trim(),
        crop_rotation_before: parseStringArray(body.crop_rotation_before ?? body.fruchtfolge_vor),
        crop_rotation_after: parseStringArray(body.crop_rotation_after ?? body.fruchtfolge_nach),
        soil_requirements: parseStringArray(body.soil_requirements ?? body.bodenansprueche),
        companion_plants: parseStringArray(body.companion_plants ?? body.begleitpflanzen),
        seasonality_months: Array.isArray(body.seasonality_months ?? body.saisonalitaet)
            ? (body.seasonality_months ?? body.saisonalitaet)
                .map((entry) => Number(entry))
                .filter((entry) => Number.isInteger(entry) && entry >= 1 && entry <= 12)
            : [],
        image_file_id: String(body.image_file_id ?? body.imageID ?? "").trim() || undefined,
        notes: typeof body.notes === "string" ? body.notes : undefined,
    });
}

export default async ({ req, res, log, error }) => {
    const debugOn = readEnv("APPWRITE_FUNCTION_DEBUG", "APP_DEBUG") === "1";

    try {
        const callerId = readHeader(req, "x-appwrite-user-id");
        if (!callerId) {
            return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);
        }

        const body = await extractBody(req);
        const payload = cleanPayload(body);
        if (!payload.name) {
            return fail(res, 'Field "name" is required', 400);
        }

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const databaseId = readEnv("APPWRITE_DATABASE_ID") || DEFAULT_DATABASE_ID;
        const tableId = readEnv("APPWRITE_TABLE_PRODUCTS_ID") || DEFAULT_PRODUCTS_TABLE_ID;
        const apiKey =
            readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");

        if (!endpoint || !projectId || !apiKey) {
            return fail(res, "Function endpoint, project ID, or API key is not configured", 500);
        }

        const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
        const users = new Users(client);
        const tables = new TablesDB(client);

        await ensureAdmin(users, callerId);

        const targetId = typeof body.id === "string" && body.id.trim() ? body.id.trim() : ID.unique();
        let result;

        try {
            result = await tables.createRow({
                databaseId,
                tableId,
                rowId: targetId,
                data: payload,
            });
            log(`[addProdukt] Created product ${result.$id}`);
        } catch (appwriteError) {
            if (appwriteError?.code === 409) {
                result = await tables.updateRow({
                    databaseId,
                    tableId,
                    rowId: targetId,
                    data: payload,
                });
                log(`[addProdukt] Updated product ${result.$id}`);
            } else {
                throw appwriteError;
            }
        }

        return ok(res, { success: true, product: result });
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        error(`[addProdukt] ${msg}`);
        if (debugOn) {
            return fail(res, "Internal error", 500, { details: msg });
        }
        return fail(res, "Internal error", 500);
    }
};
