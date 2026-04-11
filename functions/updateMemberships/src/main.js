import { Client, ID, Query, TablesDB } from "node-appwrite";

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

function compactObject(value) {
    return Object.fromEntries(
        Object.entries(value).filter(([, entry]) => entry !== undefined)
    );
}

async function writeCommerceEvent({
    tables,
    databaseId,
    tableId,
    transactionId,
    entityId,
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
            action: "expire_by_system",
            actor_type: "system",
            payload_json: payload ? JSON.stringify(payload) : undefined,
            created_at: new Date().toISOString(),
        }),
    });
}

async function rollbackTransaction(tables, transactionId, log) {
    if (!transactionId) {
        return;
    }

    try {
        await tables.updateTransaction(transactionId, "rollback");
    } catch {
        log("[updateMemberships] Transaction rollback failed");
    }
}

export default async ({ res, log, error }) => {
    const expired = [];
    const failed = [];

    try {
        const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
        const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
        const apiKey = readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY");
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
        const nowIso = new Date().toISOString();

        const memberships = await tables.listRows({
            databaseId,
            tableId: membershipsTableId,
            queries: [
                Query.equal("status", "aktiv"),
                Query.lessThan("endet_am", nowIso),
                Query.limit(500),
            ],
        });

        for (const membership of memberships.rows) {
            let transactionId = "";

            try {
                const tx = await tables.createTransaction();
                transactionId = tx?.$id ?? "";

                await tables.updateRow({
                    databaseId,
                    tableId: membershipsTableId,
                    rowId: membership.$id,
                    transactionId,
                    data: {
                        status: "abgelaufen",
                    },
                });

                await writeCommerceEvent({
                    tables,
                    databaseId,
                    tableId: commerceEventsTableId,
                    transactionId,
                    entityId: membership.$id,
                    payload: {
                        endedAt: membership.endet_am,
                    },
                });

                await tables.updateTransaction(transactionId, "commit");
                expired.push(membership.$id);
            } catch (membershipError) {
                await rollbackTransaction(tables, transactionId, log);
                failed.push({
                    membershipId: membership.$id,
                    error: String(membershipError?.message ?? membershipError ?? "Unknown error"),
                });
            }
        }

        return ok(res, {
            success: true,
            expiredCount: expired.length,
            expiredMembershipIds: expired,
            failed,
        });
    } catch (caughtError) {
        const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
        error(`[updateMemberships] ${msg}`);
        return fail(res, "Internal error", 500, { details: msg });
    }
};
