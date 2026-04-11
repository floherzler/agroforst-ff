import {
    Client,
    ID,
    Operator,
    TablesDB,
    Users,
} from "node-appwrite";

const DEFAULT_DATABASE_ID = "agroforst";
const DEFAULT_ORDERS_TABLE_ID = "bestellungen";
const DEFAULT_OFFERS_TABLE_ID = "angebote";
const DEFAULT_MEMBERSHIPS_TABLE_ID = "mitgliedschaften";
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
        log(`[manageOrder] Parsed JSON body keys: ${Object.keys(body).join(",")}`);
    } catch {
        log("[manageOrder] No JSON body provided");
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

function compactObject(value) {
    return Object.fromEntries(
        Object.entries(value).filter(([, entry]) => entry !== undefined)
    );
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

function normalizeAction(value) {
    return String(value ?? "").trim().toLowerCase();
}

function normalizeStatus(value) {
    return String(value ?? "").trim().toLowerCase();
}

function parseAmount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function isTerminalStatus(value) {
    const status = normalizeStatus(value);
    return status === "storniert" || status === "erfuellt";
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
        log("[manageOrder] Transaction rollback failed");
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
        const orderId = String(body.order_id ?? body.orderId ?? "").trim();
        const action = normalizeAction(body.action);
        const note = typeof (body.note ?? body.reason) === "string" ? String(body.note ?? body.reason).trim() : "";

        if (!orderId || !action) {
            return fail(res, "Missing order_id or action", 400);
        }

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const apiKey =
            readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");
        const databaseId = readEnv("APPWRITE_DATABASE_ID") || DEFAULT_DATABASE_ID;
        const ordersTableId = readEnv("APPWRITE_TABLE_ORDERS_ID") || DEFAULT_ORDERS_TABLE_ID;
        const offersTableId = readEnv("APPWRITE_TABLE_OFFERS_ID") || DEFAULT_OFFERS_TABLE_ID;
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

        const adminAction = action === "cancel_by_admin" || action === "confirm" || action === "mark_picked_up";
        if (adminAction) {
            await ensureAdmin(users, callerId);
        }

        const order = await tables.getRow({
            databaseId,
            tableId: ordersTableId,
            rowId: orderId,
        });

        if (action === "cancel_by_user" && order.benutzer_id !== callerId) {
            return fail(res, "Order does not belong to caller", 403);
        }

        const orderStatus = normalizeStatus(order.status);
        if (isTerminalStatus(orderStatus)) {
            return fail(res, "Order is already final", 409, { status: order.status });
        }

        const nowIso = new Date().toISOString();
        const membershipId = parseRelationId(order.mitgliedschaft);
        const offerId = parseRelationId(order.angebot);
        const reservedAmountEur = Number(order.reservierter_betrag_eur ?? 0);
        const orderQuantity = parseAmount(order.menge);

        if (!membershipId || !offerId) {
            return fail(res, "Order is missing linked membership or offer", 409);
        }

        const membership = await tables.getRow({
            databaseId,
            tableId: membershipsTableId,
            rowId: membershipId,
        });

        if (action === "confirm") {
            if (orderStatus !== "angefragt") {
                return fail(res, "Order cannot be confirmed from current state", 409, { status: order.status });
            }

            const tx = await tables.createTransaction();
            transactionId = tx?.$id ?? "";

            await tables.updateRow({
                databaseId,
                tableId: ordersTableId,
                rowId: orderId,
                transactionId,
                data: compactObject({
                    status: "bestaetigt",
                    confirmed_at: nowIso,
                    confirmed_by: callerId,
                }),
            });

            await writeCommerceEvent({
                tables,
                databaseId,
                tableId: commerceEventsTableId,
                transactionId,
                entityType: "order",
                entityId: orderId,
                action: "confirmed",
                actorType: "admin",
                actorId: callerId,
                payload: { note: note || undefined },
            });

            await tables.updateTransaction(transactionId, "commit");
            transactionId = "";

            const updated = await tables.getRow({
                databaseId,
                tableId: ordersTableId,
                rowId: orderId,
            });

            return ok(res, { success: true, order: updated }, 200);
        }

        if (action === "mark_picked_up") {
            if (orderStatus !== "bestaetigt") {
                return fail(res, "Order cannot be fulfilled from current state", 409, { status: order.status });
            }

            const tx = await tables.createTransaction();
            transactionId = tx?.$id ?? "";

            await tables.updateRow({
                databaseId,
                tableId: ordersTableId,
                rowId: orderId,
                transactionId,
                data: compactObject({
                    status: "erfuellt",
                    erfuellt_am: nowIso,
                    erfuellt_von: callerId,
                }),
            });

            await writeCommerceEvent({
                tables,
                databaseId,
                tableId: commerceEventsTableId,
                transactionId,
                entityType: "order",
                entityId: orderId,
                action: "picked_up",
                actorType: "admin",
                actorId: callerId,
                payload: { note: note || undefined },
            });

            await tables.updateTransaction(transactionId, "commit");
            transactionId = "";

            const updated = await tables.getRow({
                databaseId,
                tableId: ordersTableId,
                rowId: orderId,
            });

            return ok(res, { success: true, order: updated }, 200);
        }

        if (!["angefragt", "bestaetigt"].includes(orderStatus)) {
            return fail(res, "Order cannot be cancelled from current state", 409, { status: order.status });
        }

        if (action === "cancel_by_user") {
            const deadlineIso = String(order.cancel_deadline_at ?? "").trim();
            if (!deadlineIso) {
                return fail(res, "Cancellation deadline is missing", 409);
            }

            if (nowIso > deadlineIso) {
                return fail(res, "Cancellation deadline has passed", 409, { deadline: deadlineIso });
            }
        }

        if (action === "cancel_by_admin") {
            const pickupStartIso = String(order.pickup_slot_start ?? "").trim();
            if (pickupStartIso && nowIso > pickupStartIso) {
                return fail(res, "Pickup has already started", 409, { pickupStart: pickupStartIso });
            }
        }

        const tx = await tables.createTransaction();
        transactionId = tx?.$id ?? "";

        await tables.updateRow({
            databaseId,
            tableId: offersTableId,
            rowId: offerId,
            transactionId,
            data: {
                menge_verfuegbar: Operator.increment(orderQuantity),
                menge_reserviert: Operator.decrement(orderQuantity),
            },
        });

        if (String(membership?.mitgliedschaftstyp ?? "").trim().toLowerCase() === "privat" && reservedAmountEur > 0) {
            await tables.updateRow({
                databaseId,
                tableId: membershipsTableId,
                rowId: membershipId,
                transactionId,
                data: {
                    guthaben_aktuell_eur: Operator.increment(reservedAmountEur),
                },
            });
        }

        await tables.updateRow({
            databaseId,
            tableId: ordersTableId,
            rowId: orderId,
            transactionId,
            data: compactObject({
                status: "storniert",
                storniert_am: nowIso,
                storniert_von: callerId,
                storno_grund: note || (action === "cancel_by_admin" ? "Storno durch Admin." : "Storno durch Nutzer."),
            }),
        });

        await writeCommerceEvent({
            tables,
            databaseId,
            tableId: commerceEventsTableId,
            transactionId,
            entityType: "order",
            entityId: orderId,
            action: action,
            actorType: action === "cancel_by_user" ? "user" : "admin",
            actorId: callerId,
            payload: {
                reservedAmountEur,
                note: note || undefined,
            },
        });

        await tables.updateTransaction(transactionId, "commit");
        transactionId = "";

        const updatedOrder = await tables.getRow({
            databaseId,
            tableId: ordersTableId,
            rowId: orderId,
        });

        return ok(res, { success: true, order: updatedOrder }, 200);
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        const stack = String(caughtError?.stack ?? "");
        error(`[manageOrder] ${msg}`);

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
