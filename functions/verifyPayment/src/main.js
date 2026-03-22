import { Client, TablesDB, Users } from "node-appwrite";

const DEFAULT_DATABASE_ID = "agroforst";
const DEFAULT_MEMBERSHIPS_TABLE_ID = "memberships";
const DEFAULT_PAYMENTS_TABLE_ID = "membership_payments";

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
        case "bezahlt":
            return "paid";
        case "warten":
            return "pending";
        case "teilbezahlt":
            return "partial";
        case "offen":
            return "open";
        case "storniert":
            return "cancelled";
        default:
            return raw || "paid";
    }
}

function paymentStatusToMembershipStatus(status) {
    switch (status) {
        case "paid":
            return "paid";
        case "partial":
            return "partial";
        default:
            return "pending";
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

function parseRelationId(value) {
    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }

    if (value && typeof value === "object" && typeof value.$id === "string") {
        return value.$id.trim();
    }

    return "";
}

export default async ({ req, res, log, error }) => {
    try {
        const callerId = readHeader(req, "x-appwrite-user-id");
        if (!callerId) {
            return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);
        }

        const body = await extractBody(req);
        const paymentId = String(body.payment_id ?? body.paymentId ?? "").trim();
        const membershipId = String(body.membership ?? body.membership_id ?? body.membershipId ?? "").trim() || undefined;
        const note = typeof body.note === "string" ? body.note : undefined;
        const force = Boolean(body.force);
        const status = normalizePaymentStatus(body.status);

        if (!paymentId) {
            return fail(res, "Missing payment_id", 400);
        }

        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const apiKey =
            readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");
        const databaseId = readEnv("APPWRITE_DATABASE_ID") || DEFAULT_DATABASE_ID;
        const paymentsTableId = readEnv("APPWRITE_TABLE_PAYMENTS_ID") || DEFAULT_PAYMENTS_TABLE_ID;
        const membershipsTableId =
            readEnv("APPWRITE_TABLE_MEMBERSHIPS_ID") || DEFAULT_MEMBERSHIPS_TABLE_ID;

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
            });
        }

        const nowIso = new Date().toISOString();
        const updatedPayment = await tables.updateRow({
            databaseId,
            tableId: paymentsTableId,
            rowId: paymentId,
            data: compactObject({
                status,
                verified_at: nowIso,
                note,
            }),
        });

        const targetMembershipId =
            membershipId || parseRelationId(existing.membership) || String(existing.membership_id ?? "").trim() || undefined;
        if (targetMembershipId) {
            try {
                const membership = await tables.getRow({
                    databaseId,
                    tableId: membershipsTableId,
                    rowId: targetMembershipId,
                });

                const durationYears = Number(membership.duration_years ?? 1) || 1;
                const startsAt = membership.starts_at ?? nowIso;
                const endsAt = (() => {
                    const end = new Date(startsAt);
                    end.setFullYear(end.getFullYear() + durationYears);
                    return end.toISOString();
                })();

                await tables.updateRow({
                    databaseId,
                    tableId: membershipsTableId,
                    rowId: targetMembershipId,
                    data: compactObject({
                        payment_status: paymentStatusToMembershipStatus(status),
                        last_payment_id: paymentId,
                        last_payment_at: nowIso,
                        ...(status === "paid"
                            ? {
                                  status: "active",
                                  paid_at: nowIso,
                                  starts_at: startsAt,
                                  ends_at: endsAt,
                              }
                            : {}),
                    }),
                });
            } catch (membershipError) {
                log(`[verifyPayment] Membership update failed: ${membershipError?.message ?? membershipError}`);
            }
        }

        return ok(res, {
            success: true,
            message: `Payment ${paymentId} marked as ${status}`,
            payment: updatedPayment,
        });
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        error(`[verifyPayment] ${msg}`);
        return fail(res, "Internal error", 500, { details: msg });
    }
};
