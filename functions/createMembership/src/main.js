import {
    Client,
    ID,
    Permission,
    Query,
    Role,
    TablesDB,
    Users,
} from "node-appwrite";

const DEFAULT_DATABASE_ID = "agroforst";
const DEFAULT_MEMBERSHIPS_TABLE_ID = "memberships";
const DEFAULT_PAYMENTS_TABLE_ID = "membership_payments";
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
        log(`[createMembership] Parsed JSON body keys: ${Object.keys(body).join(",")}`);
    } catch {
        log("[createMembership] No JSON body provided");
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

function normalizeMembershipType(value) {
    const raw = String(value ?? "").trim().toLowerCase();
    if (raw === "privat" || raw === "private") {
        return "private";
    }
    if (raw === "business") {
        return "business";
    }
    return "";
}

function buildUserPermissions(userId) {
    return [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.read(Role.label(ADMIN_LABEL)),
        Permission.update(Role.label(ADMIN_LABEL)),
        Permission.delete(Role.label(ADMIN_LABEL)),
    ];
}

function compactObject(value) {
    return Object.fromEntries(
        Object.entries(value).filter(([, entry]) => entry !== undefined)
    );
}

export default async ({ req, res, log, error }) => {
    try {
        const callerId = readHeader(req, "x-appwrite-user-id");
        if (!callerId) {
            return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);
        }

        const body = await extractBody(req, log);
        const membershipType = normalizeMembershipType(body.membership_type ?? body.type);
        if (!membershipType) {
            return fail(res, "Missing or invalid membership_type", 400);
        }

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const apiKey =
            readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");
        const databaseId = readEnv("APPWRITE_DATABASE_ID") || DEFAULT_DATABASE_ID;
        const membershipsTableId =
            readEnv("APPWRITE_TABLE_MEMBERSHIPS_ID") || DEFAULT_MEMBERSHIPS_TABLE_ID;
        const paymentsTableId = readEnv("APPWRITE_TABLE_PAYMENTS_ID") || DEFAULT_PAYMENTS_TABLE_ID;

        if (!endpoint || !projectId || !apiKey) {
            return fail(res, "Function endpoint, project ID, or API key is not configured", 500);
        }

        const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
        const users = new Users(client);
        const tables = new TablesDB(client);

        const caller = await users.get(callerId);
        if (!caller.email || !caller.emailVerification) {
            return fail(res, "Forbidden: caller email not verified", 403);
        }

        const existing = await tables.listRows({
            databaseId,
            tableId: membershipsTableId,
            queries: [
                Query.equal("user_id", callerId),
                Query.equal("membership_type", membershipType),
                Query.equal("status", ["pending", "active"]),
                Query.limit(1),
            ],
        });

        if (existing.total > 0) {
            return fail(res, "You already have an active or pending membership", 400);
        }

        const now = new Date();
        const nowIso = now.toISOString();
        const durationYears = Number(body.duration_years ?? (membershipType === "private" ? 1 : 1));
        const requestedMembership = await tables.createRow({
            databaseId,
            tableId: membershipsTableId,
            rowId: ID.unique(),
            data: compactObject({
                user_id: callerId,
                membership_type: membershipType,
                duration_years: durationYears,
                requested_at: nowIso,
                status: "pending",
                payment_status: "pending",
                credit_start_eur: Number(body.credit_start_eur ?? 0) || 0,
                credit_balance_eur: Number(body.credit_balance_eur ?? 0) || 0,
                billing_address: typeof body.billing_address === "string" ? body.billing_address : undefined,
            }),
            permissions: buildUserPermissions(callerId),
        });

        const membershipNumber = `MB${now.getFullYear()}-${String(requestedMembership.$sequence ?? "").padStart(3, "0")}`;
        const membership = await tables.updateRow({
            databaseId,
            tableId: membershipsTableId,
            rowId: requestedMembership.$id,
            data: {
                membership_number: membershipNumber,
            },
        });

        if (membershipType === "private") {
            const payment = await tables.createRow({
                databaseId,
                tableId: paymentsTableId,
                rowId: ID.unique(),
                data: compactObject({
                    membership_id: membership.$id,
                    payment_type: "membership",
                    customer_type: membershipType,
                    amount_eur: Number(body.amount_eur ?? 100),
                    status: "open",
                    reference: membershipNumber,
                    due_at: nowIso,
                }),
                permissions: buildUserPermissions(callerId),
            });

            await tables.updateRow({
                databaseId,
                tableId: membershipsTableId,
                rowId: membership.$id,
                data: {
                    last_payment_id: payment.$id,
                    last_payment_at: payment.$createdAt ?? nowIso,
                },
            });
        }

        return ok(res, { success: true, membership });
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        const stack = String(caughtError?.stack ?? "");
        error(`[createMembership] ${msg}`);

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
