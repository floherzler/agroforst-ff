import {
    Client,
    ID,
    Permission,
    Role,
    TablesDB,
    Users,
} from "node-appwrite";

const DEFAULT_DATABASE_ID = "agroforst";
const DEFAULT_PRODUCTS_TABLE_ID = "products";
const DEFAULT_OFFERS_TABLE_ID = "offers";
const DEFAULT_MEMBERSHIPS_TABLE_ID = "memberships";
const DEFAULT_ORDERS_TABLE_ID = "orders";
const DEFAULT_BACKOFFICE_EVENTS_TABLE_ID = "backoffice_events";
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
        log(`[placeOrder] Parsed JSON body keys: ${Object.keys(body).join(",")}`);
    } catch {
        log("[placeOrder] No JSON body provided");
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

function buildUserPermissions(userId) {
    return [
        Permission.read(Role.user(userId)),
        Permission.read(Role.label(ADMIN_LABEL)),
        Permission.update(Role.label(ADMIN_LABEL)),
        Permission.delete(Role.label(ADMIN_LABEL)),
    ];
}

function isActiveMembership(status) {
    const value = String(status ?? "").trim().toLowerCase();
    return value === "active" || value === "aktiv";
}

function normalizeWeightUnit(unit) {
    const value = String(unit ?? "").trim().toLowerCase();
    if (value === "kilogram") {
        return "gram";
    }
    return value;
}

function calculateTotalPrice(quantity, unit, unitPriceEur) {
    if (unit === "gram") {
        return Number(((quantity / 1000) * unitPriceEur).toFixed(2));
    }
    return Number((quantity * unitPriceEur).toFixed(2));
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
        const url = new URL(req?.url ?? "http://localhost/");
        const offerId = String(body.offer_id ?? body.angebotID ?? url.searchParams.get("angebotID") ?? "").trim();
        const membershipId = String(
            body.membership_id ?? body.mitgliedschaftID ?? url.searchParams.get("mitgliedschaftID") ?? ""
        ).trim();
        const quantity = Number(body.quantity ?? body.menge ?? url.searchParams.get("menge"));

        if (!offerId || !Number.isFinite(quantity) || quantity <= 0) {
            return fail(res, "Invalid input: require { offer_id, quantity > 0 }", 400);
        }

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const apiKey =
            readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");
        const databaseId = readEnv("APPWRITE_DATABASE_ID") || DEFAULT_DATABASE_ID;
        const productsTableId = readEnv("APPWRITE_TABLE_PRODUCTS_ID") || DEFAULT_PRODUCTS_TABLE_ID;
        const offersTableId = readEnv("APPWRITE_TABLE_OFFERS_ID") || DEFAULT_OFFERS_TABLE_ID;
        const membershipsTableId =
            readEnv("APPWRITE_TABLE_MEMBERSHIPS_ID") || DEFAULT_MEMBERSHIPS_TABLE_ID;
        const ordersTableId = readEnv("APPWRITE_TABLE_ORDERS_ID") || DEFAULT_ORDERS_TABLE_ID;
        const backofficeEventsTableId =
            readEnv("APPWRITE_TABLE_BACKOFFICE_EVENTS_ID") || DEFAULT_BACKOFFICE_EVENTS_TABLE_ID;

        if (!endpoint || !projectId || !apiKey) {
            return fail(res, "Function endpoint, project ID, or API key is not configured", 500);
        }

        const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
        const tables = new TablesDB(client);
        const users = new Users(client);

        let membership = null;
        if (membershipId) {
            membership = await tables.getRow({
                databaseId,
                tableId: membershipsTableId,
                rowId: membershipId,
            });
            if (membership.user_id !== callerId) {
                return fail(res, "Membership does not belong to caller", 403);
            }
            if (!isActiveMembership(membership.status)) {
                return fail(res, "Membership is not active", 409, { status: membership.status });
            }
        }

        const offer = await tables.getRow({
            databaseId,
            tableId: offersTableId,
            rowId: offerId,
        });

        const canonicalUnit = normalizeWeightUnit(offer.unit);
        const availableQuantity = Number(offer.available_quantity ?? 0);
        if (!Number.isFinite(availableQuantity) || availableQuantity < quantity) {
            return fail(res, "Not enough available", 409, {
                available: availableQuantity,
                requested: quantity,
            });
        }

        let productName = "";
        try {
            if (offer.product_id) {
                const product = await tables.getRow({
                    databaseId,
                    tableId: productsTableId,
                    rowId: offer.product_id,
                });
                productName = [product.name, product.variety].filter(Boolean).join(" - ");
            }
        } catch {
            log("[placeOrder] Product lookup failed, using fallback");
        }

        if (!productName) {
            productName = String(offer.product_name ?? `Produkt ${offer.product_id ?? ""}`).trim();
        }

        const unitPriceEur = Number(offer.unit_price_eur ?? 0);
        const totalPriceEur = calculateTotalPrice(quantity, canonicalUnit, unitPriceEur);
        const nextAvailableQuantity = availableQuantity - quantity;
        const nextAllocatedQuantity = Number(offer.allocated_quantity ?? 0) + quantity;

        await tables.updateRow({
            databaseId,
            tableId: offersTableId,
            rowId: offerId,
            data: {
                available_quantity: nextAvailableQuantity,
                allocated_quantity: nextAllocatedQuantity,
            },
        });

        const nowIso = new Date().toISOString();
        const order = await tables.createRow({
            databaseId,
            tableId: ordersTableId,
            rowId: ID.unique(),
            data: compactObject({
                user_id: callerId,
                user_email: "",
                membership_id: membershipId || undefined,
                offer_id: offerId,
                quantity,
                unit: canonicalUnit,
                unit_price_eur: unitPriceEur,
                total_price_eur: totalPriceEur,
                pickup_at: offer.pickup_at ?? undefined,
                product_name: productName,
                status: "requested",
            }),
            permissions: buildUserPermissions(callerId),
        });

        let userEmail = "";
        try {
            const user = await users.get(callerId);
            userEmail = user?.email ?? "";
            if (userEmail) {
                await tables.updateRow({
                    databaseId,
                    tableId: ordersTableId,
                    rowId: order.$id,
                    data: { user_email: userEmail },
                });
            }
        } catch {
            log("[placeOrder] Could not resolve user email");
        }

        try {
            await tables.createRow({
                databaseId,
                tableId: backofficeEventsTableId,
                rowId: ID.unique(),
                data: compactObject({
                    event_type: "order_created",
                    order_id: order.$id,
                    offer_id: offerId,
                    user_id: callerId,
                    user_email: userEmail || undefined,
                    subject: `Neue Bestellung: ${productName}`,
                    message: [
                        `Bestellung ${order.$id}`,
                        `Produkt: ${productName}`,
                        `Menge: ${quantity} ${canonicalUnit}`,
                        `Preis: ${unitPriceEur.toFixed(2)} EUR`,
                        `Gesamt: ${totalPriceEur.toFixed(2)} EUR`,
                    ].join("\n"),
                    delivered: false,
                    created_at: nowIso,
                }),
                permissions: [
                    Permission.read(Role.label(ADMIN_LABEL)),
                    Permission.update(Role.label(ADMIN_LABEL)),
                    Permission.delete(Role.label(ADMIN_LABEL)),
                ],
            });
        } catch {
            log("[placeOrder] Backoffice event write failed (non-fatal)");
        }

        return ok(
            res,
            {
                success: true,
                orderId: order.$id,
                offer: { before: availableQuantity, after: nextAvailableQuantity },
                total_price_eur: totalPriceEur,
                membership: membership ? membership.$id : null,
            },
            201,
        );
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        const stack = String(caughtError?.stack ?? "");
        error(`[placeOrder] ${msg}`);

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
