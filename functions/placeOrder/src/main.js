import {
    Client,
    Databases,
    ID,
    Permission,
    Role,
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
        log(`[placeOrder] Parsed JSON body keys: ${Object.keys(body).join(",")}`);
    } catch {
        log("[placeOrder] No JSON body provided (or parse failed)");
    }

    if (!Object.keys(body).length && req?.bodyJson && typeof req.bodyJson === "object") {
        body = req.bodyJson;
        log(`[placeOrder] Parsed req.bodyJson keys: ${Object.keys(body).join(",")}`);
    }

    const raw = !Object.keys(body).length
        ? req?.bodyText ?? req?.bodyRaw ?? req?.payload
        : undefined;
    if (!Object.keys(body).length && typeof raw === "string" && raw.length > 0) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                body = parsed;
                log(`[placeOrder] Parsed raw payload keys: ${Object.keys(body).join(",")}`);
            }
        } catch {
            log("[placeOrder] Raw payload is not valid JSON");
        }
    }

    return body;
}

export default async ({ req, res, log, error }) => {
    try {
        const callerId = readHeader(req, "x-appwrite-user-id");
        log(`[placeOrder] Incoming request. Caller present: ${Boolean(callerId)}`);
        if (!callerId) {
            return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);
        }

        const body = await extractBody(req, log);
        const url = new URL(req?.url ?? "http://localhost/");
        const angebotID = String(body.angebotID ?? url.searchParams.get("angebotID") ?? "").trim();
        const mitgliedschaftID = String(
            body.mitgliedschaftID ?? url.searchParams.get("mitgliedschaftID") ?? ""
        ).trim();
        const menge = Number(body.menge ?? url.searchParams.get("menge"));

        if (!angebotID || !Number.isFinite(menge) || menge <= 0) {
            return fail(res, "Invalid input: require { angebotID, menge > 0 }");
        }

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const apiKey = readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");
        const databaseId = readEnv("DB_ID");
        const angeboteCollection = readEnv("COLL_ANGEBOTE");
        const bestellungCollection = readEnv("COLL_BESTELLUNG");
        const membershipCollection = readEnv("COLL_MITGLIEDSCHAFT");
        const produkteCollection = readEnv("COLL_PRODUKTE");
        const notificationsCollection = readEnv("COLL_NOTIFICATIONS");
        const adminEmail = readEnv("ADMIN_EMAIL");

        if (!endpoint || !projectId || !apiKey) {
            return fail(res, "Function endpoint, project ID, or API key is not configured", 500);
        }
        if (!databaseId || !angeboteCollection || !bestellungCollection || !membershipCollection) {
            return fail(res, "Order collections are not fully configured", 500);
        }

        const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
        const db = new Databases(client);
        const users = new Users(client);

        let membership = null;
        if (mitgliedschaftID) {
            membership = await db.getDocument(databaseId, membershipCollection, mitgliedschaftID);
            if (membership.userID !== callerId) {
                return fail(res, "Membership does not belong to caller", 403);
            }
            if (membership.status !== "aktiv") {
                return fail(res, "Membership is not active", 409, { status: membership.status });
            }
        }

        let angebot;
        try {
            angebot = await db.getDocument(databaseId, angeboteCollection, angebotID);
        } catch (appwriteError) {
            error(`[placeOrder] Failed fetching angebot: ${String(appwriteError?.message ?? appwriteError)}`);
            return fail(res, "Failed to fetch angebot", 500);
        }

        const verfuegbar = Number(angebot.mengeVerfuegbar ?? 0);
        if (!Number.isFinite(verfuegbar) || verfuegbar < menge) {
            return fail(res, "Not enough available", 409, {
                available: verfuegbar,
                requested: menge,
            });
        }

        let produktName = "";
        try {
            if (produkteCollection && angebot.produktID) {
                const produkt = await db.getDocument(databaseId, produkteCollection, angebot.produktID);
                produktName = [produkt.name, produkt.sorte].filter(Boolean).join(" - ");
            }
        } catch {
            log("[placeOrder] Product resolution failed, will use fallback name");
        }

        if (!produktName) {
            produktName = (
                angebot.produktName ??
                angebot.produkt ??
                `Produkt ${angebot.produktID ?? ""}`
            ).trim();
        }

        const einheit = String(angebot.einheit ?? "");
        const preisEinheit = Number(angebot.euroPreis ?? 0);
        const preisGesamt =
            einheit === "Gramm" && Number(angebot.menge) === 1000
                ? Number(((menge / 1000) * preisEinheit).toFixed(2))
                : Number((menge * preisEinheit).toFixed(2));

        const nextVerfuegbar = verfuegbar - menge;
        const nextAbgeholt = Number(angebot.mengeAbgeholt ?? 0) + menge;

        try {
            await db.updateDocument(databaseId, angeboteCollection, angebotID, {
                mengeVerfuegbar: nextVerfuegbar,
                mengeAbgeholt: nextAbgeholt,
            });
        } catch (appwriteError) {
            error(
                `[placeOrder] Failed updating angebot availability: ${String(appwriteError?.message ?? appwriteError)}`
            );
            return fail(res, "Failed to update angebot availability", 500);
        }

        const nowIso = new Date().toISOString();
        let bestellung;
        try {
            bestellung = await db.createDocument(
                databaseId,
                bestellungCollection,
                ID.unique(),
                {
                    userID: callerId,
                    mitgliedschaftID: mitgliedschaftID || null,
                    angebotID,
                    menge,
                    einheit,
                    preis_einheit: preisEinheit,
                    preis_gesamt: preisGesamt,
                    produkt_name: produktName,
                    abholung: angebot.abholung ?? null,
                    status: "angefragt",
                    user_mail: "",
                },
                [Permission.read(Role.user(callerId))]
            );
        } catch (appwriteError) {
            error(`[placeOrder] Failed creating order document: ${String(appwriteError?.message ?? appwriteError)}`);
            return fail(res, "Failed to create order", 500);
        }

        let userEmail = "";
        try {
            const user = await users.get(callerId);
            userEmail = user?.email ?? "";
            if (userEmail) {
                await db.updateDocument(databaseId, bestellungCollection, bestellung.$id, {
                    user_mail: userEmail,
                });
            }
        } catch {
            log("[placeOrder] Could not fetch user or write email (non-fatal)");
        }

        if (notificationsCollection) {
            try {
                await db.createDocument(databaseId, notificationsCollection, ID.unique(), {
                    type: "order_created",
                    order_id: bestellung.$id,
                    angebot_id: angebotID,
                    user_id: callerId,
                    user_email: userEmail,
                    admin_email: adminEmail || null,
                    subject: `Neue Bestellung: ${produktName}`,
                    message: [
                        `Bestellung ${bestellung.$id}`,
                        `Produkt: ${produktName}`,
                        `Menge: ${menge} ${einheit}`,
                        `Preis: ${preisEinheit.toFixed(2)} EUR / ${einheit}`,
                        `Gesamt: ${preisGesamt.toFixed(2)} EUR`,
                    ].join("\n"),
                    created_at: nowIso,
                    delivered: false,
                });
            } catch {
                log("[placeOrder] Notification write failed (non-fatal)");
            }
        }

        return ok(
            res,
            {
                success: true,
                orderId: bestellung.$id,
                angebot: { vorher: verfuegbar, nachher: nextVerfuegbar },
                preis_gesamt: preisGesamt,
                membership: membership ? membership.$id : null,
            },
            201
        );
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        const stack = String(caughtError?.stack ?? "");
        error(`[placeOrder] Uncaught error: ${msg}`);
        if (stack) {
            error(`[placeOrder] Stack trace: ${stack.split("\n").slice(0, 5).join(" | ")} ...`);
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
