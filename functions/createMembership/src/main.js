import {
    Client,
    ID,
    Permission,
    Query,
    Role,
    TablesDB,
    Users,
} from "node-appwrite";

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
        log(`[requestMembership] Parsed JSON body keys: ${Object.keys(body).join(",")}`);
    } catch {
        log("[requestMembership] No JSON body provided (or parse failed)");
    }

    if (!Object.keys(body).length && req?.bodyJson && typeof req.bodyJson === "object") {
        body = req.bodyJson;
        log(`[requestMembership] Parsed req.bodyJson keys: ${Object.keys(body).join(",")}`);
    }

    const raw = !Object.keys(body).length
        ? req?.bodyText ?? req?.bodyRaw ?? req?.payload
        : undefined;
    if (!Object.keys(body).length && typeof raw === "string" && raw.length > 0) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                body = parsed;
                log(`[requestMembership] Parsed raw payload keys: ${Object.keys(body).join(",")}`);
            }
        } catch {
            log("[requestMembership] Raw payload is not valid JSON");
        }
    }

    return body;
}

export default async ({ req, res, log, error }) => {
    try {
        const callerId = readHeader(req, "x-appwrite-user-id");
        log(`[requestMembership] Incoming request. Caller present: ${Boolean(callerId)}`);
        if (!callerId) {
            return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);
        }

        const body = await extractBody(req, log);
        if (!body?.type) {
            return fail(res, "Missing required field: type");
        }

        const type = String(body.type).trim();
        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const apiKey = readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");
        const databaseId = readEnv("APPWRITE_FUNCTION_DATABASE_ID");
        const membershipTableId = "mitgliedschaft";

        if (!endpoint || !projectId || !apiKey || !databaseId) {
            return fail(res, "Function endpoint, project ID, API key, or database ID is not configured", 500);
        }

        const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
        const users = new Users(client);
        const tablesDB = new TablesDB(client);

        const caller = await users.get(callerId);
        if (!caller.email || !caller.emailVerification) {
            return fail(res, "Forbidden: caller email not verified", 403);
        }

        const existing = await tablesDB.listRows({
            databaseId,
            tableId: membershipTableId,
            queries: [
                Query.equal("userID", callerId),
                Query.equal("typ", type),
                Query.equal("status", ["aktiv", "beantragt"]),
            ],
        });

        if (existing.total > 0) {
            return fail(res, "You already have an active or pending membership", 400);
        }

        const membershipData = {
            userID: callerId,
            typ: type,
            status: "beantragt",
            beantragungs_datum: new Date().toISOString(),
            ...(type === "privat" ? { dauer_jahre: 1 } : {}),
        };

        const newMembership = await tablesDB.createRow({
            databaseId,
            tableId: membershipTableId,
            rowId: ID.unique(),
            data: membershipData,
            permissions: [
                Permission.read(Role.user(callerId)),
                Permission.read(Role.team("admin")),
            ],
        });

        if (type === "privat") {
            const paymentTableId = "zahlungen";
            const newPayment = await tablesDB.createRow({
                databaseId,
                tableId: paymentTableId,
                rowId: ID.unique(),
                data: {
                    mitgliedschaft: newMembership.$id,
                    betrag_eur: 100.0,
                    status: "offen",
                    typ: "mitgliedschaft",
                    kunde_typ: type,
                },
                permissions: [
                    Permission.read(Role.user(callerId)),
                    Permission.read(Role.team("admin")),
                ],
            });

            const seqStr = String(newPayment.$sequence ?? "").padStart(3, "0");
            const ref = `MB${new Date().getFullYear()}-${seqStr}`;
            await tablesDB.updateRow({
                databaseId,
                tableId: paymentTableId,
                rowId: newPayment.$id,
                data: { ref },
            });
        }

        return ok(res, { success: true, membership: newMembership });
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        const stack = String(caughtError?.stack ?? "");
        error(`[requestMembership] Uncaught error: ${msg}`);
        if (stack) {
            error(`[requestMembership] Stack trace: ${stack.split("\n").slice(0, 5).join(" | ")} ...`);
        }

        const debugOn = readEnv("APPWRITE_FUNCTION_DEBUG", "APP_DEBUG") === "1";
        if (debugOn) {
            return fail(res, "Internal error", 500, {
                details: msg,
                stack: stack.split("\n").slice(0, 5),
            });
        }

        return fail(res, "Internal error", 500);
    }
};
