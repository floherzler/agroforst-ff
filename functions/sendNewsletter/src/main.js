import { Client, ID, Messaging, Users } from "node-appwrite";

const DEFAULT_NEWSLETTER_TOPIC_ID = "Newsletter";

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
    log(`[sendNewsletter] Parsed JSON body keys: ${Object.keys(body).join(",")}`);
  } catch {
    log("[sendNewsletter] No JSON body provided");
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

function readRequiredString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function readOptionalString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function ensureAdmin(caller) {
  const labels = Array.isArray(caller.labels) ? caller.labels : [];
  const isAdmin = labels.some((label) => String(label).toLowerCase() === "admin");
  if (!isAdmin) {
    throw new Error("Caller must be an admin");
  }
}

export default async ({ req, res, log, error }) => {
  try {
    const callerId = readHeader(req, "x-appwrite-user-id");
    if (!callerId) {
      return fail(res, "Unauthenticated: missing x-appwrite-user-id header", 401);
    }

    const endpoint = readEnv("APPWRITE_FUNCTION_API_ENDPOINT");
    const projectId = readEnv("APPWRITE_FUNCTION_PROJECT_ID");
    const apiKey =
      readEnv("APPWRITE_FUNCTION_API_KEY", "APPWRITE_API_KEY") || readHeader(req, "x-appwrite-key");
    const topicId = readEnv("APPWRITE_TOPIC_NEWSLETTER_ID") || DEFAULT_NEWSLETTER_TOPIC_ID;

    if (!endpoint || !projectId || !apiKey) {
      return fail(res, "Function endpoint, project ID, or API key is not configured", 500);
    }

    const body = await extractBody(req, log);
    const subject = readRequiredString(body.subject);
    const content = readRequiredString(body.content);
    const preheader = readOptionalString(body.preheader);

    if (!subject || !content) {
      return fail(res, "Missing subject or content", 400);
    }

    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const users = new Users(client);
    const messaging = new Messaging(client);

    const caller = await users.get(callerId);
    ensureAdmin(caller);

    const messageId = ID.unique();
    const message = await messaging.createEmail(
      messageId,
      subject,
      content,
      [topicId],
      [],
      [],
      [],
      [],
      [],
      false,
      true,
      "",
    );

    return ok(res, {
      success: true,
      messageId: message?.$id ?? messageId,
      topicId,
      preheader,
    }, 201);
  } catch (caughtError) {
    const msg = String(caughtError?.message ?? caughtError ?? "Unknown error");
    error(`[sendNewsletter] ${msg}`);

    const debugOn = readEnv("APPWRITE_FUNCTION_DEBUG", "APP_DEBUG") === "1";
    if (debugOn) {
      return fail(res, "Internal error", 500, { details: msg });
    }
    return fail(res, "Internal error", 500);
  }
};
