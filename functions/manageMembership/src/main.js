import { Client, ID, TablesDB, Users } from "node-appwrite";

const DEFAULT_DATABASE_ID = "agroforst";
const DEFAULT_MEMBERSHIPS_TABLE_ID = "mitgliedschaften";
const DEFAULT_COMMERCE_EVENTS_TABLE_ID = "commerce_events";

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
    try {
        const body = await req.json();
        if (body && typeof body === "object") {
            return body;
        }
    } catch {
        // ignore
    }

    for (const candidate of [req?.bodyJson, req?.bodyText, req?.bodyRaw, req?.payload]) {
        if (typeof candidate === "string" && candidate.length > 0) {
            try {
                return JSON.parse(candidate);
            } catch {
                continue;
            }
        }
        if (candidate && typeof candidate === "object") {
            return candidate;
        }
    }

    return {};
}

function compactObject(value) {
    return Object.fromEntries(
        Object.entries(value).filter(([, entry]) => entry !== undefined)
    );
}

function normalizeAction(value) {
    return String(value ?? "").trim().toLowerCase();
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

async function rollbackTransaction(tables, transactionId, log) {
    if (!transactionId) {
        return;
    }

    try {
        await tables.updateTransaction(transactionId, "rollback");
    } catch {
        log("[manageMembership] Transaction rollback failed");
    }
}

async function writeCommerceEvent({
    tables,
    databaseId,
    tableId,
    transactionId,
    entityId,
    action,
    actorType,
    actorId,
    payload,
}) {
    await tables.createRow({
        databaseId,
        tableId,
        rowId: ID.unique(),
        transactionId,
        data: compactObject({
            entity_type: "membership",
            entity_id: entityId,
            action,
            actor_type: actorType,
            actor_id: actorId,
            payload_json: payload ? JSON.stringify(payload) : undefined,
            created_at: new Date().toISOString(),
        }),
    });
}

export default async ({ req, res, log, error }) => {
    let transactionId = "";

    try {
        const body = await extractBody(req);
        const action = normalizeAction(body.action);
        const membershipId = String(body.membership_id ?? body.membershipId ?? "").trim();
        const note = typeof (body.note ?? body.reason) === "string" ? String(body.note ?? body.reason).trim() : undefined;
        const callerId = readHeader(req, "x-appwrite-user-id");

        if (!membershipId || !action) {
            return fail(res, "Missing membership_id or action", 400);
        }

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const apiKey =
            readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");
        const databaseId = readEnv("APPWRITE_DATABASE_ID") || DEFAULT_DATABASE_ID;
        const membershipsTableId =
            readEnv("APPWRITE_TABLE_MEMBERSHIPS_ID") || DEFAULT_MEMBERSHIPS_TABLE_ID;
        const commerceEventsTableId =
            readEnv("APPWRITE_TABLE_COMMERCE_EVENTS_ID") || DEFAULT_COMMERCE_EVENTS_TABLE_ID;

        if (!endpoint || !projectId || !apiKey) {
            return fail(res, "Function endpoint, project ID, or API key is not configured", 500);
        }

        const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
        const tables = new TablesDB(client);
        const users = new Users(client);

        const isSystemAction = action === "expire_by_system";
        if (!isSystemAction) {
            if (!callerId) {
                return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);
            }
            await ensureAdmin(users, callerId);
        }

        const membership = await tables.getRow({
            databaseId,
            tableId: membershipsTableId,
            rowId: membershipId,
        });

        const nowIso = new Date().toISOString();
        const durationYears = Number(membership.dauer_jahre ?? 1) || 1;
        const startsAt = membership.startet_am ?? nowIso;
        const endsAt = (() => {
            const end = new Date(startsAt);
            end.setFullYear(end.getFullYear() + durationYears);
            return end.toISOString();
        })();
        const membershipType = String(membership.mitgliedschaftstyp ?? "").trim().toLowerCase();

        if (action === "activate_by_admin" && String(membership.status ?? "").trim().toLowerCase() === "aktiv") {
            return ok(res, { success: true, membership, idempotent: true });
        }
        if (action === "cancel_by_admin" && String(membership.status ?? "").trim().toLowerCase() === "storniert") {
            return ok(res, { success: true, membership, idempotent: true });
        }
        if (action === "expire_by_system" && String(membership.status ?? "").trim().toLowerCase() === "abgelaufen") {
            return ok(res, { success: true, membership, idempotent: true });
        }

        if (action === "activate_by_admin") {
            if (!["beantragt", "aktiv"].includes(String(membership.status ?? "").trim().toLowerCase())) {
                return fail(res, "Membership cannot be activated from current state", 409, { status: membership.status });
            }
            if (membershipType === "privat" && String(membership.bezahl_status ?? "").trim().toLowerCase() !== "bezahlt") {
                return fail(res, "Private membership requires verified payment", 409, { bezahl_status: membership.bezahl_status });
            }
        } else if (action === "cancel_by_admin") {
        } else if (action === "expire_by_system") {
            if (String(membership.status ?? "").trim().toLowerCase() !== "aktiv") {
                return fail(res, "Membership cannot be expired from current state", 409, { status: membership.status });
            }
            if (!membership.endet_am || membership.endet_am >= nowIso) {
                return fail(res, "Membership is not yet due for expiry", 409, { endet_am: membership.endet_am });
            }
        } else {
            return fail(res, "Unsupported action", 400);
        }

        const tx = await tables.createTransaction();
        transactionId = tx?.$id ?? "";

        if (action === "activate_by_admin") {
            await tables.updateRow({
                databaseId,
                tableId: membershipsTableId,
                rowId: membershipId,
                transactionId,
                data: compactObject({
                    status: "aktiv",
                    startet_am: startsAt,
                    endet_am: endsAt,
                    bezahlt_am: membershipType === "betrieb" ? nowIso : undefined,
                }),
            });
        } else if (action === "cancel_by_admin") {
            await tables.updateRow({
                databaseId,
                tableId: membershipsTableId,
                rowId: membershipId,
                transactionId,
                data: compactObject({
                    status: "storniert",
                    storno_grund: note || "Storno durch Admin.",
                }),
            });
        } else if (action === "expire_by_system") {
            await tables.updateRow({
                databaseId,
                tableId: membershipsTableId,
                rowId: membershipId,
                transactionId,
                data: compactObject({
                    status: "abgelaufen",
                    storno_grund: note || membership.storno_grund,
                }),
            });
        }

        await writeCommerceEvent({
            tables,
            databaseId,
            tableId: commerceEventsTableId,
            transactionId,
            entityId: membershipId,
            action,
            actorType: isSystemAction ? "system" : "admin",
            actorId: isSystemAction ? undefined : callerId,
            payload: note ? { note } : undefined,
        });

        await tables.updateTransaction(transactionId, "commit");
        transactionId = "";

        const updatedMembership = await tables.getRow({
            databaseId,
            tableId: membershipsTableId,
            rowId: membershipId,
        });

        return ok(res, { success: true, membership: updatedMembership });
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        error(`[manageMembership] ${msg}`);

        try {
            const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
            const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
            const apiKey = readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY");
            if (transactionId && endpoint && projectId && apiKey) {
                const rollbackClient = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
                const rollbackTables = new TablesDB(rollbackClient);
                await rollbackTransaction(rollbackTables, transactionId, log);
            }
        } catch {
            // ignore rollback boot errors
        }

        return fail(res, "Internal error", 500, { details: msg });
    }
};
