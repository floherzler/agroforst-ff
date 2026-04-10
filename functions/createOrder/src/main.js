import {
    Client,
    ID,
    Permission,
    Role,
    TablesDB,
    Users,
} from "node-appwrite";

const DEFAULT_DATABASE_ID = "agroforst";
const DEFAULT_PRODUCTS_TABLE_ID = "produkte";
const DEFAULT_OFFERS_TABLE_ID = "angebote";
const DEFAULT_MEMBERSHIPS_TABLE_ID = "mitgliedschaften";
const DEFAULT_ORDERS_TABLE_ID = "bestellungen";
const DEFAULT_BACKOFFICE_EVENTS_TABLE_ID = "backoffice_ereignisse";
const DEFAULT_PICKUP_CONFIG_TABLE_ID = "abholkonfiguration";
const ADMIN_LABEL = "admin";
const PICKUP_CONFIG_DOCUMENT_ID = "global";
const PICKUP_TIMEZONE = "Europe/Berlin";

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
    if (value === "bundle") {
        return "bund";
    }
    if (value === "piece") {
        return "stueck";
    }
    return value;
}

function calculateTotalPrice(quantity, unit, unitPriceEur) {
    return Number((quantity * unitPriceEur).toFixed(2));
}

function parseNumericArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry));
}

function normalizeStaffelInput(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => ({
            teilung: Number(entry?.teilung),
            anzahl: Number(entry?.anzahl),
        }))
        .filter(
            (entry) =>
                Number.isFinite(entry.teilung) &&
                entry.teilung > 0 &&
                Number.isInteger(entry.anzahl) &&
                entry.anzahl > 0
        );
}

function createPreisstaffelMap(offer) {
    const teilungen = parseNumericArray(offer.teilungen);
    const paketPreise = parseNumericArray(offer.preise_pro_teilung_eur);
    const pairCount = Math.min(teilungen.length, paketPreise.length);
    const result = new Map();

    for (let index = 0; index < pairCount; index += 1) {
        result.set(teilungen[index], paketPreise[index]);
    }

    return result;
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

function parseWeeklySlots(value) {
    if (typeof value !== "string" || !value.trim()) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((entry) => ({
                weekday: Number(entry?.weekday),
                startTime: String(entry?.startTime ?? "").trim(),
                endTime: String(entry?.endTime ?? "").trim(),
                active: entry?.active !== false,
            }))
            .filter((entry) =>
                Number.isInteger(entry.weekday) &&
                entry.weekday >= 1 &&
                entry.weekday <= 7 &&
                /^\d{2}:\d{2}$/.test(entry.startTime) &&
                /^\d{2}:\d{2}$/.test(entry.endTime)
            );
    } catch {
        return [];
    }
}

function formatOffset(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "shortOffset",
        hour: "2-digit",
    }).formatToParts(date);
    return parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+0";
}

function getOffsetMilliseconds(date, timeZone) {
    const raw = formatOffset(date, timeZone);
    const match = raw.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
    if (!match) {
        return 0;
    }

    const sign = match[1] === "-" ? -1 : 1;
    const hours = Number(match[2] ?? 0);
    const minutes = Number(match[3] ?? 0);
    return sign * ((hours * 60) + minutes) * 60 * 1000;
}

function zonedDateParts(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).formatToParts(date);

    const valueOf = (type) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    return {
        year: valueOf("year"),
        month: valueOf("month"),
        day: valueOf("day"),
    };
}

function berlinLocalToUtc(year, month, day, hours, minutes) {
    let guess = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);

    for (let index = 0; index < 3; index += 1) {
        const offset = getOffsetMilliseconds(new Date(guess), PICKUP_TIMEZONE);
        const nextGuess = Date.UTC(year, month - 1, day, hours, minutes, 0, 0) - offset;
        if (nextGuess === guess) {
            break;
        }
        guess = nextGuess;
    }

    return new Date(guess);
}

function isoWeekdayFromLocalDate(year, month, day) {
    const weekday = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)).getUTCDay();
    return weekday === 0 ? 7 : weekday;
}

function parseTime(value) {
    const [hours, minutes] = String(value ?? "").split(":").map((entry) => Number(entry));
    return { hours, minutes };
}

function formatPickupSlotLabel(startIso, endIso) {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const startText = new Intl.DateTimeFormat("de-DE", {
        timeZone: PICKUP_TIMEZONE,
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(start);
    const endText = new Intl.DateTimeFormat("de-DE", {
        timeZone: PICKUP_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
    }).format(end);
    return `${startText} bis ${endText} Uhr`;
}

function generateUpcomingPickupSlots(config, now = new Date()) {
    const horizonDays = Number(config?.horizonDays ?? 0);
    const weeklySlots = Array.isArray(config?.weeklySlots) ? config.weeklySlots : [];
    const today = zonedDateParts(now, PICKUP_TIMEZONE);
    const result = [];

    for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
        const anchor = new Date(Date.UTC(today.year, today.month - 1, today.day + dayOffset, 12, 0, 0, 0));
        const local = zonedDateParts(anchor, PICKUP_TIMEZONE);
        const weekday = isoWeekdayFromLocalDate(local.year, local.month, local.day);

        for (const rule of weeklySlots) {
            if (!rule.active || rule.weekday !== weekday) {
                continue;
            }

            const startTime = parseTime(rule.startTime);
            const endTime = parseTime(rule.endTime);
            const start = berlinLocalToUtc(local.year, local.month, local.day, startTime.hours, startTime.minutes);
            const end = berlinLocalToUtc(local.year, local.month, local.day, endTime.hours, endTime.minutes);

            if (end.getTime() <= start.getTime() || end.getTime() <= now.getTime()) {
                continue;
            }

            result.push({
                start: start.toISOString(),
                end: end.toISOString(),
                label: formatPickupSlotLabel(start.toISOString(), end.toISOString()),
            });
        }
    }

    return result.sort((left, right) => left.start.localeCompare(right.start));
}

async function readPickupConfig(tables, databaseId, tableId) {
    try {
        const document = await tables.getRow({
            databaseId,
            tableId,
            rowId: PICKUP_CONFIG_DOCUMENT_ID,
        });

        return {
            horizonDays: Number(document.horizon_tage ?? 0),
            location: String(document.abholort ?? "").trim(),
            note: String(document.notiz ?? "").trim(),
            weeklySlots: parseWeeklySlots(document.wochentermine_json),
        };
    } catch {
        return null;
    }
}

export default async ({ req, res, log, error }) => {
    try {
        const callerId = readHeader(req, "x-appwrite-user-id");
        if (!callerId) {
            return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);
        }

        const body = await extractBody(req, log);
        const url = new URL(req?.url ?? "http://localhost/");
        const offerId = String(body.angebot_id ?? body.offer_id ?? body.angebotID ?? url.searchParams.get("angebotID") ?? "").trim();
        const membershipId = String(
            body.mitgliedschaft ?? body.mitgliedschaft_id ?? body.membership ?? body.membership_id ?? body.mitgliedschaftID ?? url.searchParams.get("mitgliedschaftID") ?? ""
        ).trim();
        const quantity = Number(body.menge ?? body.quantity ?? url.searchParams.get("menge"));
        const requestedStaffeln = normalizeStaffelInput(body.staffeln);
        const requestedPickupSlot =
            body.pickup_slot && typeof body.pickup_slot === "object"
                ? body.pickup_slot
                : {};
        const pickupSlotStart = String(requestedPickupSlot.start ?? "").trim();
        const pickupSlotEnd = String(requestedPickupSlot.end ?? "").trim();
        const pickupSlotLabel = String(requestedPickupSlot.label ?? "").trim();
        const rawStaffeln = Array.isArray(body.staffeln) ? body.staffeln : [];
        const hasLegacyQuantity = Number.isFinite(quantity) && quantity > 0;
        const hasStaffeln = requestedStaffeln.length > 0;

        if (rawStaffeln.length > 0 && requestedStaffeln.length !== rawStaffeln.length) {
            return fail(res, "Ungueltige Preisstaffeln im Request.", 400);
        }

        if (!offerId || !membershipId || (!hasLegacyQuantity && !hasStaffeln)) {
            return fail(res, "Invalid input: require { angebot_id, mitgliedschaft_id, menge > 0 } or { staffeln[] }", 400);
        }

        if (!pickupSlotStart || !pickupSlotEnd || !pickupSlotLabel) {
            return fail(res, "Pickup slot is required.", 400);
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
        const pickupConfigTableId =
            readEnv("APPWRITE_TABLE_PICKUP_CONFIG_ID") || DEFAULT_PICKUP_CONFIG_TABLE_ID;

        if (!endpoint || !projectId || !apiKey) {
            return fail(res, "Function endpoint, project ID, or API key is not configured", 500);
        }

        const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
        const tables = new TablesDB(client);
        const users = new Users(client);
        const pickupConfig = await readPickupConfig(tables, databaseId, pickupConfigTableId);

        if (!pickupConfig || pickupConfig.weeklySlots.length === 0 || pickupConfig.horizonDays <= 0) {
            return fail(res, "Pickup configuration is missing.", 409);
        }

        const matchingPickupSlot = generateUpcomingPickupSlots(pickupConfig).find(
            (slot) => slot.start === pickupSlotStart && slot.end === pickupSlotEnd
        );

        if (!matchingPickupSlot) {
            return fail(res, "Ungueltiger Abholslot.", 409);
        }

        if (new Date(pickupSlotStart).getTime() >= new Date(pickupSlotEnd).getTime()) {
            return fail(res, "Ungueltiger Abholslot-Zeitraum.", 400);
        }

        const membership = await tables.getRow({
            databaseId,
            tableId: membershipsTableId,
            rowId: membershipId,
        });
        if (membership.benutzer_id !== callerId) {
            return fail(res, "Membership does not belong to caller", 403);
        }
        if (!isActiveMembership(membership.status)) {
            return fail(res, "Membership is not active", 409, { status: membership.status });
        }

        const offer = await tables.getRow({
            databaseId,
            tableId: offersTableId,
            rowId: offerId,
        });

        const canonicalUnit = normalizeWeightUnit(offer.einheit);
        const preisstaffelMap = createPreisstaffelMap(offer);
        const offerHasPreisstaffeln = preisstaffelMap.size > 0;
        const orderBreakdown = hasStaffeln
            ? requestedStaffeln
            : [];
        if (hasStaffeln && !offerHasPreisstaffeln) {
            return fail(res, "Dieses Angebot hat keine Preisstaffeln.", 409);
        }

        if (offerHasPreisstaffeln && !hasStaffeln) {
            return fail(res, "Preisstaffeln muessen explizit ausgewaehlt werden.", 400);
        }

        if (offerHasPreisstaffeln && hasStaffeln) {
            for (const entry of orderBreakdown) {
                if (!preisstaffelMap.has(entry.teilung)) {
                    return fail(res, "Ungueltige Preisstaffel angefordert.", 400, { teilung: entry.teilung });
                }
            }
        }

        const effectiveQuantity = hasStaffeln
            ? orderBreakdown.reduce((sum, entry) => sum + entry.teilung * entry.anzahl, 0)
            : quantity;
        const availableQuantity = Number(offer.menge_verfuegbar ?? 0);
        if (!Number.isFinite(availableQuantity) || availableQuantity < effectiveQuantity) {
            return fail(res, "Not enough available", 409, {
                available: availableQuantity,
                requested: effectiveQuantity,
            });
        }

        let productName = "";
        try {
            const productId = parseRelationId(offer.produkt);
            if (productId) {
                const product = await tables.getRow({
                    databaseId,
                    tableId: productsTableId,
                    rowId: productId,
                });
                productName = [product.name, product.sorte].filter(Boolean).join(" - ");
            }
        } catch {
            log("[placeOrder] Product lookup failed, using fallback");
        }

        if (!productName) {
            const productId = parseRelationId(offer.produkt);
            productName = String(offer.produkt_name ?? `Produkt ${productId}`).trim();
        }

        const bestellteTeilungen = orderBreakdown.map((entry) => entry.teilung);
        const bestellteTeilungsAnzahlen = orderBreakdown.map((entry) => entry.anzahl);
        const bestellteTeilpreiseEur = orderBreakdown.map((entry) => Number(preisstaffelMap.get(entry.teilung) ?? 0));
        const totalPriceEur = hasStaffeln
            ? Number(
                orderBreakdown
                    .reduce((sum, entry) => sum + (Number(preisstaffelMap.get(entry.teilung) ?? 0) * entry.anzahl), 0)
                    .toFixed(2)
            )
            : calculateTotalPrice(effectiveQuantity, canonicalUnit, Number(offer.preis_pro_einheit_eur ?? 0));
        const unitPriceEur = Number((totalPriceEur / effectiveQuantity).toFixed(4));
        const nextAvailableQuantity = availableQuantity - effectiveQuantity;
        const nextAllocatedQuantity = Number(offer.menge_reserviert ?? 0) + effectiveQuantity;

        await tables.updateRow({
            databaseId,
            tableId: offersTableId,
            rowId: offerId,
            data: {
                menge_verfuegbar: nextAvailableQuantity,
                menge_reserviert: nextAllocatedQuantity,
            },
        });

        const nowIso = new Date().toISOString();
        const order = await tables.createRow({
            databaseId,
            tableId: ordersTableId,
            rowId: ID.unique(),
            data: compactObject({
                benutzer_id: callerId,
                benutzer_email: "",
                mitgliedschaft: membershipId,
                angebot: offerId,
                menge: effectiveQuantity,
                einheit: canonicalUnit,
                preis_pro_einheit_eur: unitPriceEur,
                bestellte_teilungen: bestellteTeilungen.length > 0 ? bestellteTeilungen : undefined,
                bestellte_teilungs_anzahlen: bestellteTeilungsAnzahlen.length > 0 ? bestellteTeilungsAnzahlen : undefined,
                bestellte_teilpreise_eur: bestellteTeilpreiseEur.length > 0 ? bestellteTeilpreiseEur : undefined,
                gesamtpreis_eur: totalPriceEur,
                abholung_ab: offer.abholung_ab ?? undefined,
                pickup_slot_start: matchingPickupSlot.start,
                pickup_slot_end: matchingPickupSlot.end,
                pickup_slot_label: pickupSlotLabel || matchingPickupSlot.label,
                pickup_location: pickupConfig.location || undefined,
                pickup_note: pickupConfig.note || undefined,
                produkt_name: productName,
                status: "angefragt",
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
                    data: { benutzer_email: userEmail },
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
                    ereignistyp: "bestellung_erstellt",
                    bestellung_id: order.$id,
                    angebot_id: offerId,
                    benutzer_id: callerId,
                    benutzer_email: userEmail || undefined,
                    betreff: `Neue Bestellung: ${productName}`,
                    nachricht: [
                        `Bestellung ${order.$id}`,
                        `Produkt: ${productName}`,
                        `Menge: ${effectiveQuantity} ${canonicalUnit}`,
                        `Preis: ${unitPriceEur.toFixed(2)} EUR`,
                        `Gesamt: ${totalPriceEur.toFixed(2)} EUR`,
                        `Abholung: ${pickupSlotLabel || matchingPickupSlot.label}`,
                        pickupConfig.location ? `Ort: ${pickupConfig.location}` : undefined,
                        bestellteTeilungen.length > 0
                            ? `Staffeln: ${bestellteTeilungen.map((teilung, index) => `${teilung} x ${bestellteTeilungsAnzahlen[index]}`).join(", ")}`
                            : undefined,
                    ].filter(Boolean).join("\n"),
                    zugestellt: false,
                    erstellt_am: nowIso,
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
                gesamtpreis_eur: totalPriceEur,
                membership: membership.$id,
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
