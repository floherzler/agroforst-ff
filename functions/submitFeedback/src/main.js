import {
    Client,
    ID,
    Permission,
    Role,
    TablesDB,
    Users,
} from "node-appwrite";

const DEFAULT_DATABASE_ID = "agroforst";
const DEFAULT_MESSAGES_TABLE_ID = "kunden_nachrichten";
const ADMIN_LABEL = "admin";

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

async function extractBody(req, log) {
    let body = {};

    try {
        body = await req.json();
        log(`[submitFeedback] Parsed JSON body keys: ${Object.keys(body).join(",")}`);
    } catch {
        log("[submitFeedback] No JSON body provided");
    }

    if (!Object.keys(body).length && req?.bodyJson && typeof req.bodyJson === "object") {
        body = req.bodyJson;
    }

    const raw = !Object.keys(body).length
        ? req?.bodyText ?? req?.bodyRaw ?? req?.payload
        : undefined;
    if (!Object.keys(body).length && typeof raw === "string" && raw.length > 0) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                body = parsed;
            }
        } catch {
            // ignore
        }
    }

    return body;
}

function readRequiredString(value) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

export default async ({ req, res, log, error }) => {
    try {
        const callerId = readHeader(req, "x-appwrite-user-id");
        if (!callerId) {
            return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);
        }

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const apiKey =
            readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");
        const databaseId = readEnv("APPWRITE_DATABASE_ID") || DEFAULT_DATABASE_ID;
        const messagesTableId =
            readEnv("APPWRITE_TABLE_CUSTOMER_MESSAGES_ID") || DEFAULT_MESSAGES_TABLE_ID;

        if (!endpoint || !projectId || !apiKey) {
            return fail(res, "Function endpoint, project ID, or API key is not configured", 500);
        }

        const body = await extractBody(req, log);
        const text = readRequiredString(body.text ?? body.message);
        if (!text) {
            return fail(res, "Missing feedback text", 400);
        }

        const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
        const users = new Users(client);
        const tables = new TablesDB(client);

        const caller = await users.get(callerId);
        if (!caller.email || !caller.emailVerification) {
            return fail(res, "Forbidden: caller email not verified", 403);
        }

        const entry = await tables.createRow({
            databaseId,
            tableId: messagesTableId,
            rowId: ID.unique(),
            data: {
                benutzer_id: callerId,
                nachrichtstyp: "feedback",
                nachricht: text,
                status: "neu",
            },
            permissions: [
                Permission.read(Role.label(ADMIN_LABEL)),
                Permission.update(Role.label(ADMIN_LABEL)),
                Permission.delete(Role.label(ADMIN_LABEL)),
            ],
        });

        return ok(res, { success: true, messageId: entry.$id }, 201);
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        error(`[submitFeedback] ${msg}`);

        const debugOn = readEnv("APPWRITE_FUNCTION_DEBUG", "APP_DEBUG") === "1";
        if (debugOn) {
            return fail(res, "Internal error", 500, { details: msg });
        }
        return fail(res, "Internal error", 500);
    }
};
