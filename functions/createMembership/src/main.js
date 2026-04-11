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
const DEFAULT_MEMBERSHIPS_TABLE_ID = "mitgliedschaften";
const DEFAULT_PAYMENTS_TABLE_ID = "mitgliedschaftszahlungen";
const DEFAULT_COMMERCE_EVENTS_TABLE_ID = "commerce_events";
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
        return "privat";
    }
    if (raw === "business" || raw === "betrieb") {
        return "betrieb";
    }
    return "";
}

function buildUserPermissions(userId) {
    return [
        Permission.read(Role.user(userId)),
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

function readRequiredString(value) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function parseAmount(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

async function rollbackTransaction(tables, transactionId, log, prefix) {
    if (!transactionId) {
        return;
    }

    try {
        await tables.updateTransaction(transactionId, "rollback");
    } catch {
        log(`[${prefix}] Transaction rollback failed`);
    }
}

async function writeCommerceEvent({
    tables,
    databaseId,
    tableId,
    transactionId,
    entityType,
    entityId,
    action,
    actorType,
    actorId,
    requestId,
    payload,
}) {
    await tables.createRow({
        databaseId,
        tableId,
        rowId: ID.unique(),
        transactionId,
        data: compactObject({
            entity_type: entityType,
            entity_id: entityId,
            action,
            actor_type: actorType,
            actor_id: actorId,
            request_id: requestId,
            payload_json: payload ? JSON.stringify(payload) : undefined,
            created_at: new Date().toISOString(),
        }),
    });
}

export default async ({ req, res, log, error }) => {
    let transactionId = "";

    try {
        const callerId = readHeader(req, "x-appwrite-user-id");
        if (!callerId) {
            return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);
        }

        const body = await extractBody(req, log);
        const membershipType = normalizeMembershipType(body.mitgliedschaftstyp ?? body.membership_type ?? body.type);
        const clientRequestId = readRequiredString(body.client_request_id ?? body.clientRequestId);
        if (!membershipType) {
            return fail(res, "Missing or invalid mitgliedschaftstyp", 400);
        }
        if (!clientRequestId) {
            return fail(res, "Missing client_request_id", 400);
        }

        const agbVersion = readRequiredString(body.agb_version ?? body.agbVersion ?? body.terms_version);
        const agbAcceptedAtRaw = readRequiredString(body.agb_accepted_at ?? body.agbAcceptedAt ?? body.terms_accepted_at);
        if (!agbVersion || !agbAcceptedAtRaw) {
            return fail(res, "Missing AGB acceptance metadata", 400);
        }
        const agbAcceptedDate = new Date(agbAcceptedAtRaw);
        if (Number.isNaN(agbAcceptedDate.getTime())) {
            return fail(res, "Missing AGB acceptance metadata", 400);
        }
        const agbAcceptedAt = agbAcceptedDate.toISOString();

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const apiKey =
            readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");
        const databaseId = readEnv("APPWRITE_DATABASE_ID") || DEFAULT_DATABASE_ID;
        const membershipsTableId =
            readEnv("APPWRITE_TABLE_MEMBERSHIPS_ID") || DEFAULT_MEMBERSHIPS_TABLE_ID;
        const paymentsTableId = readEnv("APPWRITE_TABLE_PAYMENTS_ID") || DEFAULT_PAYMENTS_TABLE_ID;
        const commerceEventsTableId =
            readEnv("APPWRITE_TABLE_COMMERCE_EVENTS_ID") || DEFAULT_COMMERCE_EVENTS_TABLE_ID;

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

        const existingByRequest = await tables.listRows({
            databaseId,
            tableId: membershipsTableId,
            queries: [
                Query.equal("benutzer_id", callerId),
                Query.equal("client_request_id", clientRequestId),
                Query.limit(1),
            ],
        });

        if (existingByRequest.total > 0) {
            return ok(res, { success: true, membership: existingByRequest.rows[0], idempotent: true });
        }

        const existingMembership = await tables.listRows({
            databaseId,
            tableId: membershipsTableId,
            queries: [
                Query.equal("benutzer_id", callerId),
                Query.equal("mitgliedschaftstyp", membershipType),
                Query.equal("status", ["beantragt", "aktiv"]),
                Query.limit(1),
            ],
        });

        if (existingMembership.total > 0) {
            return fail(res, "You already have an active or pending membership", 400);
        }

        const now = new Date();
        const nowIso = now.toISOString();
        const durationYears = Number(body.dauer_jahre ?? body.duration_years ?? 1);
        const paymentAmount = parseAmount(body.betrag_eur ?? body.amount_eur, 100);

        const tx = await tables.createTransaction();
        transactionId = tx?.$id ?? "";

        const createdMembership = await tables.createRow({
            databaseId,
            tableId: membershipsTableId,
            rowId: ID.unique(),
            transactionId,
            data: compactObject({
                benutzer_id: callerId,
                mitgliedschaftstyp: membershipType,
                dauer_jahre: durationYears,
                beantragt_am: nowIso,
                status: "beantragt",
                bezahl_status: "beantragt",
                guthaben_start_eur: parseAmount(body.guthaben_start_eur ?? body.credit_start_eur, 0),
                guthaben_aktuell_eur: parseAmount(body.guthaben_aktuell_eur ?? body.credit_balance_eur, 0),
                rechnungsadresse: typeof (body.rechnungsadresse ?? body.billing_address) === "string"
                    ? String(body.rechnungsadresse ?? body.billing_address)
                    : undefined,
                agb_version: agbVersion,
                agb_accepted_at: agbAcceptedAt,
                client_request_id: clientRequestId,
            }),
            permissions: buildUserPermissions(callerId),
        });

        const membershipNumber = `MB${now.getFullYear()}-${String(createdMembership.$sequence ?? "").padStart(3, "0")}`;
        const membership = await tables.updateRow({
            databaseId,
            tableId: membershipsTableId,
            rowId: createdMembership.$id,
            transactionId,
            data: {
                mitgliedsnummer: membershipNumber,
            },
        });

        let payment = null;
        if (membershipType === "privat") {
            payment = await tables.createRow({
                databaseId,
                tableId: paymentsTableId,
                rowId: ID.unique(),
                transactionId,
                data: compactObject({
                    mitgliedschaft: membership.$id,
                    zahlungsart: "mitgliedschaft",
                    kundentyp: membershipType,
                    betrag_eur: paymentAmount,
                    status: "offen",
                    referenz: membershipNumber,
                    faellig_am: nowIso,
                }),
                permissions: buildUserPermissions(callerId),
            });

            await tables.updateRow({
                databaseId,
                tableId: membershipsTableId,
                rowId: membership.$id,
                transactionId,
                data: {
                    letzte_zahlung_id: payment.$id,
                    letzte_zahlung_am: payment.$createdAt ?? nowIso,
                },
            });
        }

        await writeCommerceEvent({
            tables,
            databaseId,
            tableId: commerceEventsTableId,
            transactionId,
            entityType: "membership",
            entityId: membership.$id,
            action: "requested",
            actorType: "user",
            actorId: callerId,
            requestId: clientRequestId,
            payload: {
                membershipType,
                paymentId: payment?.$id,
            },
        });

        await tables.updateTransaction(transactionId, "commit");
        transactionId = "";

        const committedMembership = await tables.getRow({
            databaseId,
            tableId: membershipsTableId,
            rowId: membership.$id,
        });

        return ok(res, {
            success: true,
            membership: committedMembership,
            paymentId: payment?.$id,
        });
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        const stack = String(caughtError?.stack ?? "");
        error(`[createMembership] ${msg}`);

        try {
            const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
            const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
            const apiKey = readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY");
            if (transactionId && endpoint && projectId && apiKey) {
                const rollbackClient = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
                const rollbackTables = new TablesDB(rollbackClient);
                await rollbackTransaction(rollbackTables, transactionId, log, "createMembership");
            }
        } catch {
            // ignore rollback boot errors
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
