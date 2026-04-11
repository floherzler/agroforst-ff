import { Client, ID, TablesDB, Users } from "node-appwrite";

const DEFAULT_DATABASE_ID = "agroforst";
const DEFAULT_MEMBERSHIPS_TABLE_ID = "mitgliedschaften";
const DEFAULT_PAYMENTS_TABLE_ID = "mitgliedschaftszahlungen";
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

function normalizePaymentStatus(status) {
    const raw = String(status ?? "").trim().toLowerCase();
    switch (raw) {
        case "paid":
        case "bezahlt":
            return "bezahlt";
        case "pending":
        case "warten":
            return "warten";
        case "partial":
        case "teilbezahlt":
            return "teilbezahlt";
        case "open":
        case "offen":
            return "offen";
        case "failed":
        case "fehlgeschlagen":
            return "fehlgeschlagen";
        case "cancelled":
        case "storniert":
            return "storniert";
        default:
            return raw || "bezahlt";
    }
}

function paymentStatusToMembershipStatus(status) {
    switch (status) {
        case "bezahlt":
            return "bezahlt";
        case "teilbezahlt":
            return "teilbezahlt";
        default:
            return "beantragt";
    }
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

function compactObject(value) {
    return Object.fromEntries(
        Object.entries(value).filter(([, entry]) => entry !== undefined)
    );
}

function parseAmount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseRelationId(value) {
    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }

    if (value && typeof value === "object" && typeof value.$id === "string") {
        return value.$id.trim();
    }

    return "";
}

async function rollbackTransaction(tables, transactionId, log) {
    if (!transactionId) {
        return;
    }

    try {
        await tables.updateTransaction(transactionId, "rollback");
    } catch {
        log("[verifyPayment] Transaction rollback failed");
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

        const body = await extractBody(req);
        const paymentId = String(body.zahlung_id ?? body.payment_id ?? body.paymentId ?? "").trim();
        const membershipId = String(body.mitgliedschaft ?? body.mitgliedschaft_id ?? body.membership ?? body.membership_id ?? body.membershipId ?? "").trim() || undefined;
        const note = typeof (body.notiz ?? body.note) === "string" ? String(body.notiz ?? body.note).trim() : undefined;
        const force = Boolean(body.force);
        const status = normalizePaymentStatus(body.status);

        if (!paymentId) {
            return fail(res, "Missing zahlung_id", 400);
        }

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const apiKey =
            readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");
        const databaseId = readEnv("APPWRITE_DATABASE_ID") || DEFAULT_DATABASE_ID;
        const paymentsTableId = readEnv("APPWRITE_TABLE_PAYMENTS_ID") || DEFAULT_PAYMENTS_TABLE_ID;
        const membershipsTableId =
            readEnv("APPWRITE_TABLE_MEMBERSHIPS_ID") || DEFAULT_MEMBERSHIPS_TABLE_ID;
        const commerceEventsTableId =
            readEnv("APPWRITE_TABLE_COMMERCE_EVENTS_ID") || DEFAULT_COMMERCE_EVENTS_TABLE_ID;

        if (!endpoint || !projectId || !apiKey) {
            return fail(res, "Function endpoint, project ID, or API key is not configured", 500);
        }

        const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
        const users = new Users(client);
        const tables = new TablesDB(client);

        const caller = await ensureAdmin(users, callerId);
        log(`[verifyPayment] Caller ${caller.$id} validated as admin`);

        const existing = await tables.getRow({
            databaseId,
            tableId: paymentsTableId,
            rowId: paymentId,
        });
        const existingStatus = String(existing?.status ?? "").toLowerCase();
        if (existingStatus === status && !force) {
            return ok(res, {
                success: true,
                message: `Payment already marked as ${status}`,
                payment: existing,
                idempotent: true,
            });
        }

        const targetMembershipId =
            membershipId || parseRelationId(existing.mitgliedschaft) || undefined;
        const membership = targetMembershipId
            ? await tables.getRow({
                databaseId,
                tableId: membershipsTableId,
                rowId: targetMembershipId,
            })
            : null;

        const nowIso = new Date().toISOString();
        const tx = await tables.createTransaction();
        transactionId = tx?.$id ?? "";

        await tables.updateRow({
            databaseId,
            tableId: paymentsTableId,
            rowId: paymentId,
            transactionId,
            data: compactObject({
                status,
                verifiziert_am: nowIso,
                notiz: note,
            }),
        });

        if (membership && targetMembershipId) {
            const durationYears = Number(membership.dauer_jahre ?? 1) || 1;
            const startsAt = membership.startet_am ?? nowIso;
            const endsAt = (() => {
                const end = new Date(startsAt);
                end.setFullYear(end.getFullYear() + durationYears);
                return end.toISOString();
            })();
            const paymentAmount =
                parseAmount(body.betrag ?? body.amount) ??
                parseAmount(existing.betrag_eur);
            const currentStartCredit = parseAmount(membership.guthaben_start_eur) ?? 0;
            const currentBalance = parseAmount(membership.guthaben_aktuell_eur) ?? 0;
            const nextStartCredit =
                status === "bezahlt" && paymentAmount !== undefined
                    ? (currentStartCredit > 0 ? currentStartCredit : paymentAmount)
                    : undefined;
            const nextBalance =
                status === "bezahlt" && paymentAmount !== undefined
                    ? (currentBalance > 0 ? currentBalance : paymentAmount)
                    : undefined;

            await tables.updateRow({
                databaseId,
                tableId: membershipsTableId,
                rowId: targetMembershipId,
                transactionId,
                data: compactObject({
                    bezahl_status: paymentStatusToMembershipStatus(status),
                    letzte_zahlung_id: paymentId,
                    letzte_zahlung_am: nowIso,
                    status: status === "bezahlt"
                        ? "aktiv"
                        : (String(membership.status ?? "").trim().toLowerCase() === "aktiv" ? membership.status : "beantragt"),
                    bezahlt_am: status === "bezahlt" ? nowIso : undefined,
                    startet_am: status === "bezahlt" ? startsAt : undefined,
                    endet_am: status === "bezahlt" ? endsAt : undefined,
                    guthaben_start_eur: status === "bezahlt" ? nextStartCredit : undefined,
                    guthaben_aktuell_eur: status === "bezahlt" ? nextBalance : undefined,
                }),
            });
        }

        await writeCommerceEvent({
            tables,
            databaseId,
            tableId: commerceEventsTableId,
            transactionId,
            entityType: "payment",
            entityId: paymentId,
            action: `status:${status}`,
            actorType: "admin",
            actorId: callerId,
            requestId: undefined,
            payload: {
                membershipId: targetMembershipId,
                note,
            },
        });

        await tables.updateTransaction(transactionId, "commit");
        transactionId = "";

        const updatedPayment = await tables.getRow({
            databaseId,
            tableId: paymentsTableId,
            rowId: paymentId,
        });

        return ok(res, {
            success: true,
            message: `Payment ${paymentId} marked as ${status}`,
            payment: updatedPayment,
        });
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        error(`[verifyPayment] ${msg}`);

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
