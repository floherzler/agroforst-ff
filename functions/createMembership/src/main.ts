import { Client, Users, TablesDB, ID, Permission, Role, Query } from "npm:node-appwrite";

type Body = {
    type?: 'privat' | 'business';
};

function ok(res: any, data: unknown, status = 200) {
    return res.json(data, status);
}
function fail(res: any, msg: string, status = 400, extra: Record<string, unknown> = {}) {
    return res.json({ success: false, error: msg, ...extra }, status);
}

export default async ({ req, res, log, error }: any) => {
    try {
        // --- Caller auth (provided by Appwrite gateway) ---
        const callerId: string | undefined =
            req.headers["x-appwrite-user-id"] ?? req.headers["X-Appwrite-User-Id"];
        log(`[requestMembership] Incoming request. Caller present: ${Boolean(callerId)} 🔒`)
        if (!callerId) return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);

        // --- Inputs (body JSON or query string) ---
        let body: Body = {};
        // 1) Try the standard fetch-style JSON helper if available
        try {
            body = await req.json();
            log(`[requestMembership] Parsed JSON body keys: ${Object.keys(body).join(',')} 🧾`)
        } catch {
            // ignore if not JSON
            log("[requestMembership] No JSON body provided (or parse failed) 🧾")
        }
        // 2) Appwrite Functions v7: prefer bodyJson/bodyText on the request
        try {
            if (!Object.keys(body).length && req.bodyJson && typeof req.bodyJson === 'object') {
                body = req.bodyJson as Body;
                log(`[requestMembership] Parsed req.bodyJson keys: ${Object.keys(body).join(',')} 🧾`)
            } else if (!Object.keys(body).length && typeof req.bodyText === 'string' && req.bodyText.length > 0) {
                log(`[requestMembership] Found bodyText (length ${req.bodyText?.length ?? 0}) 🧾`)
                try {
                    const parsed = JSON.parse(req.bodyText);
                    if (parsed && typeof parsed === 'object') {
                        body = parsed as Body;
                        log(`[requestMembership] Parsed bodyText JSON keys: ${Object.keys(body).join(',')}`)
                    }
                } catch (e) {
                    log(`[requestMembership] bodyText is not valid JSON (parse error) ⚠️`)
                }
            }
        } catch (e) {
            log(`[requestMembership] Error reading request body (non-fatal) ⚠️`)
        }
        // 3) Legacy fallbacks sometimes seen (bodyRaw/payload)
        try {
            if (!Object.keys(body).length) {
                const raw: unknown = (typeof (req as any).bodyRaw === 'string')
                    ? (req as any).bodyRaw
                    : (typeof (req as any).payload === 'string' ? (req as any).payload : undefined);
                if (typeof raw === 'string' && raw.length > 0) {
                    log(`[requestMembership] Found raw payload (length ${String((raw as string)?.length ?? 0)}) 🧾`)
                    try {
                        const parsed = JSON.parse(raw);
                        if (parsed && typeof parsed === 'object') {
                            body = parsed as Body;
                            log(`[requestMembership] Parsed raw payload keys: ${Object.keys(body).join(',')} 🧾`)
                        }
                    } catch (e) {
                        log(`[requestMembership] Raw payload is not valid JSON (parse error) ⚠️`)
                    }
                }
            }
        } catch (e) {
            log(`[requestMembership] Error inspecting raw payload (non-fatal) ⚠️`)
        }

        if (!body?.type) return fail(res, "Missing required field: type");

        const type = body.type.trim();

        // --- Appwrite client ---
        const endpoint = Deno.env.get("APPWRITE_FUNCTION_API_ENDPOINT") ?? (process.env.APPWRITE_FUNCTION_API_ENDPOINT as string | undefined) ?? "";
        const projectId = Deno.env.get("APPWRITE_FUNCTION_PROJECT_ID") ?? (process.env.APPWRITE_FUNCTION_PROJECT_ID as string | undefined) ?? "";
        const client = new Client()
            .setEndpoint(endpoint)
            .setProject(projectId)
            .setKey(req.headers["x-appwrite-key"] ?? "");
        log(`[requestMembership] Appwrite client configured ✅`)

        const users = new Users(client);
        const caller = await users.get(callerId);
        if (!caller.email || !caller.emailVerification) return fail(res, "Forbidden: caller email not verified", 403);
        log(`[requestMembership] Caller user data loaded. Email verified: ${Boolean(caller.emailVerification)} ✅`)
        const tablesDB = new TablesDB(client);
        const databaseID = process.env.APPWRITE_FUNCTION_DATABASE_ID ?? "";
        const tableID = "mitgliedschaft";

        try {
            // Check for existing active membership
            const existing = await tablesDB.listRows({
                databaseId: databaseID,
                tableId: tableID,
                queries: [
                    Query.equal("userID", callerId),
                    Query.equal("typ", type),
                    Query.equal("status", ["aktiv", "beantragt"]),
                ]
            });
            if (existing.total > 0) {
                log(`[requestMembership] Caller already has an active or pending membership (total=${existing.total}) ❌`)
                return fail(res, "You already have an active or pending membership", 400);
            } else {
                log(`[requestMembership] No existing active or pending membership found for caller ✅`)
            }

            // --- Create membership row ---
            const membershipData = {
                userID: callerId,
                typ: type,
                status: "beantragt",
                beantragungs_datum: new Date().toISOString(),
                ...(type === "privat" ? { dauer_jahre: 1 } : {}), // default duration for privat
            };
            log(`[requestMembership] Creating membership record with data: ${JSON.stringify(membershipData)} 🆕`)
            const newMembership = await tablesDB.createRow(
                {
                    databaseId: databaseID,
                    tableId: tableID,
                    rowId: ID.unique(),
                    data: membershipData,
                    permissions: [
                        Permission.read(Role.user(callerId)),
                        Permission.read(Role.label("admin")),
                    ]
                }
            );
            log(`[requestMembership] Created new membership record (ID: ${newMembership.$id}) ✅`)
        } catch (e: any) {
            log(`[requestMembership] Error creating membership record: ${e.message} 🚨`)
            return fail(res, "Failed to create membership record", 500);
        }
    } catch (e: any) {
        // Log the error details to the function logs for debugging. We still return a generic
        // message to the caller to avoid leaking internal state to the client.
        try {
            const msg = String(e?.message ?? e ?? 'Unknown error');
            const stack = String(e?.stack ?? '');
            error(`[requestMembership] Uncaught error: ${msg} 🚨`);
            if (stack) error(`[requestMembership] Stack trace: ${stack.split('\n').slice(0, 5).join(' | ')} ...`);

            // If debug mode is enabled via env, include error details in the response (useful for debugging).
            const debugFlag = Deno.env.get('APPWRITE_FUNCTION_DEBUG') ?? Deno.env.get('APP_DEBUG') ?? process.env.APPWRITE_FUNCTION_DEBUG ?? process.env.APP_DEBUG;
            const debugOn = String(debugFlag ?? '').trim() === '1';
            if (debugOn) {
                return fail(res, "Internal error", 500, { details: msg, stack: stack.split('\n').slice(0, 5) });
            }
        } catch (_logErr) {
            // If logging itself fails, fall back to a minimal message
            error('[requestMembership] Uncaught error (failed to stringify) 🚨');
        }
        return fail(res, "Internal error", 500);
    }
};