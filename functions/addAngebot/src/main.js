import { Client, ID, TablesDB, Users } from "node-appwrite";

const DEFAULT_DATABASE_ID = "agroforst";
const DEFAULT_PRODUCTS_TABLE_ID = "products";
const DEFAULT_OFFERS_TABLE_ID = "offers";

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

function parseDateArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => {
            const date = new Date(entry);
            return Number.isNaN(date.getTime()) ? "" : date.toISOString();
        })
        .filter(Boolean);
}

function compactObject(value) {
    return Object.fromEntries(
        Object.entries(value).filter(([, entry]) => entry !== undefined)
    );
}

function normalizeUnit(rawUnit, quantityFields) {
    const value = String(rawUnit ?? "").trim().toLowerCase();
    const isKilogramInput = ["kg", "kilogram", "kilogramm"].includes(value);
    const multiplier = isKilogramInput ? 1000 : 1;

    let unit = value;
    switch (value) {
        case "stück":
        case "stueck":
        case "piece":
            unit = "piece";
            break;
        case "gramm":
        case "gram":
        case "g":
        case "kg":
        case "kilogram":
        case "kilogramm":
            unit = "gram";
            break;
        case "bund":
        case "bundle":
            unit = "bundle";
            break;
        case "liter":
        case "l":
            unit = "liter";
            break;
        default:
            unit = value;
            break;
    }

    return {
        unit,
        quantityMultiplier: multiplier,
        quantities: Object.fromEntries(
            Object.entries(quantityFields).map(([key, fieldValue]) => {
                const numeric = Number(fieldValue ?? 0);
                return [key, Number.isFinite(numeric) ? numeric * multiplier : 0];
            }),
        ),
    };
}

export default async ({ req, res, log, error }) => {
    try {
        const callerId = readHeader(req, "x-appwrite-user-id");
        if (!callerId) {
            return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);
        }

        const body = await extractBody(req);
        const productId = String(body.product_id ?? body.produktID ?? "").trim();
        const rawUnit = String(body.unit ?? body.einheit ?? "").trim();
        if (!productId) {
            return fail(res, "product_id is required", 400);
        }
        if (!rawUnit) {
            return fail(res, "unit is required", 400);
        }

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const databaseId = readEnv("APPWRITE_DATABASE_ID") || DEFAULT_DATABASE_ID;
        const offersTableId = readEnv("APPWRITE_TABLE_OFFERS_ID") || DEFAULT_OFFERS_TABLE_ID;
        const productsTableId = readEnv("APPWRITE_TABLE_PRODUCTS_ID") || DEFAULT_PRODUCTS_TABLE_ID;
        const apiKey =
            readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");

        if (!endpoint || !projectId || !apiKey) {
            return fail(res, "Function endpoint, project ID, or API key is not configured", 500);
        }

        const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
        const users = new Users(client);
        const tables = new TablesDB(client);

        await ensureAdmin(users, callerId);

        try {
            await tables.getRow({
                databaseId,
                tableId: productsTableId,
                rowId: productId,
            });
        } catch {
            return fail(res, "Referenced product_id does not exist", 404);
        }

        const normalizedUnit = normalizeUnit(rawUnit, {
            projected_quantity: body.projected_quantity ?? body.menge,
            available_quantity: body.available_quantity ?? body.mengeVerfuegbar ?? body.menge,
            allocated_quantity: body.allocated_quantity ?? body.mengeAbgeholt ?? 0,
        });

        const sowingSource = body.sowing_date ?? body.saatPflanzDatum;
        const data = compactObject({
            product_id: productId,
            year: Number.isFinite(Number(body.year)) ? Number(body.year) : new Date().getFullYear(),
            sowing_date: sowingSource ? new Date(sowingSource).toISOString() : undefined,
            harvest_projection: parseDateArray(body.harvest_projection ?? body.ernteProjektion),
            projected_quantity: normalizedUnit.quantities.projected_quantity,
            available_quantity: normalizedUnit.quantities.available_quantity,
            allocated_quantity: normalizedUnit.quantities.allocated_quantity,
            unit: normalizedUnit.unit,
            unit_price_eur: Number(body.unit_price_eur ?? body.euroPreis ?? 0),
            producer_price_eur: Number(body.producer_price_eur ?? body.preis_produzent ?? 0) || undefined,
            standard_price_eur: Number(body.standard_price_eur ?? body.preis_standard ?? 0) || undefined,
            member_price_eur: Number(body.member_price_eur ?? body.preis_sonder ?? 0) || undefined,
            expected_revenue_eur: Number(body.expected_revenue_eur ?? body.erwarteter_umsatz ?? 0) || undefined,
            pickup_at: body.pickup_at ? new Date(body.pickup_at).toISOString() : undefined,
            description: typeof body.description === "string" ? body.description : body.beschreibung,
            created_by_user_id: callerId,
            updated_by_user_id: callerId,
        });

        const targetId = String(body.offer_id ?? body.angebotId ?? body.id ?? "").trim() || ID.unique();
        let result;

        try {
            result = await tables.createRow({
                databaseId,
                tableId: offersTableId,
                rowId: targetId,
                data,
            });
            log(`[addAngebot] Created offer ${result.$id}`);
        } catch (appwriteError) {
            if (appwriteError?.code === 409) {
                result = await tables.updateRow({
                    databaseId,
                    tableId: offersTableId,
                    rowId: targetId,
                    data,
                });
                log(`[addAngebot] Updated offer ${result.$id}`);
            } else {
                throw appwriteError;
            }
        }

        return ok(res, { success: true, offer: result });
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        error(`[addAngebot] ${msg}`);
        return fail(res, "Internal error", 500, { details: msg });
    }
};
