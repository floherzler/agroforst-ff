#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import resources from "../appwrite/resources.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const envFile = path.join(repoRoot, ".env");

const args = new Set(process.argv.slice(2));
const shouldReset = args.has("--reset");
const withDemoData = args.has("--with-demo-data");
const skipFunctions = args.has("--skip-function-vars");

loadEnvFile(envFile);

const endpoint = requiredEnv("VITE_APPWRITE_ENDPOINT");
const projectId = requiredEnv("VITE_APPWRITE_PROJECT_ID");
const apiKey = requiredEnv("APPWRITE_API_KEY");

configureCli();

if (shouldReset) {
  resetManagedResources();
}

ensureDatabase();
ensureBucket();

for (const table of Object.values(resources.tables)) {
  ensureTable(table);
}

if (withDemoData) {
  seedDemoData();
}

if (!skipFunctions) {
  syncFunctionVariables();
}

console.log("Appwrite bootstrap completed.");

function loadEnvFile(targetFile) {
  if (!existsSync(targetFile)) {
    return;
  }

  const raw = readFileSync(targetFile, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(key) {
  const value = String(process.env[key] ?? "").trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function configureCli() {
  runAppwrite([
    "client",
    "--endpoint",
    endpoint,
    "--project-id",
    projectId,
    "--key",
    apiKey,
  ]);
}

function resetManagedResources() {
  const tableIds = Object.values(resources.tables)
    .map((table) => table.id)
    .reverse();

  for (const tableId of tableIds) {
    const existing = runAppwrite(
      [
        "tables-db",
        "get-table",
        "--database-id",
        resources.database.id,
        "--table-id",
        tableId,
      ],
      { json: true, allowFailure: true },
    );
    if (!existing.ok) {
      continue;
    }

    console.log(`Deleting table ${tableId}`);
    runAppwrite([
      "-f",
      "tables-db",
      "delete-table",
      "--database-id",
      resources.database.id,
      "--table-id",
      tableId,
    ]);
  }

  const existingBucket = runAppwrite(
    ["storage", "get-bucket", "--bucket-id", resources.bucket.id],
    { json: true, allowFailure: true },
  );
  if (existingBucket.ok) {
    console.log(`Deleting bucket ${resources.bucket.id}`);
    runAppwrite(["-f", "storage", "delete-bucket", "--bucket-id", resources.bucket.id]);
  }
}

function ensureDatabase() {
  const database = runAppwrite(
    ["tables-db", "get", "--database-id", resources.database.id],
    { json: true, allowFailure: true },
  );

  if (!database.ok) {
    console.log(`Creating database ${resources.database.id}`);
    runAppwrite([
      "tables-db",
      "create",
      "--database-id",
      resources.database.id,
      "--name",
      resources.database.name,
      "--enabled",
      "true",
    ]);
    return;
  }

  console.log(`Database ${resources.database.id} already exists`);
}

function ensureBucket() {
  const bucket = runAppwrite(
    ["storage", "get-bucket", "--bucket-id", resources.bucket.id],
    { json: true, allowFailure: true },
  );

  const baseArgs = [
    "--bucket-id",
    resources.bucket.id,
    "--name",
    resources.bucket.name,
    "--permissions",
    ...resources.bucket.permissions,
    "--file-security",
    String(resources.bucket.fileSecurity),
    "--enabled",
    String(resources.bucket.enabled),
    "--maximum-file-size",
    String(resources.bucket.maximumFileSize),
    "--allowed-file-extensions",
    ...resources.bucket.allowedFileExtensions,
    "--compression",
    resources.bucket.compression,
    "--encryption",
    String(resources.bucket.encryption),
    "--antivirus",
    String(resources.bucket.antivirus),
    "--transformations",
    String(resources.bucket.transformations),
  ];

  if (!bucket.ok) {
    console.log(`Creating bucket ${resources.bucket.id}`);
    runAppwrite(["storage", "create-bucket", ...baseArgs]);
    return;
  }

  console.log(`Updating bucket ${resources.bucket.id}`);
  runAppwrite(["storage", "update-bucket", ...baseArgs]);
}

function ensureTable(table) {
  const tableCheck = runAppwrite(
    [
      "tables-db",
      "get-table",
      "--database-id",
      resources.database.id,
      "--table-id",
      table.id,
    ],
    { json: true, allowFailure: true },
  );

  const tableArgs = [
    "--database-id",
    resources.database.id,
    "--table-id",
    table.id,
    "--name",
    table.name,
    "--permissions",
    ...table.permissions,
    "--row-security",
    String(table.rowSecurity),
    "--enabled",
    "true",
  ];

  if (!tableCheck.ok) {
    console.log(`Creating table ${table.id}`);
    runAppwrite(["tables-db", "create-table", ...tableArgs]);
  } else {
    console.log(`Updating table ${table.id}`);
    runAppwrite(["tables-db", "update-table", ...tableArgs]);
  }

  const existingColumns = new Map(
    listResponse(
      runAppwrite(
        [
          "tables-db",
          "list-columns",
          "--database-id",
          resources.database.id,
          "--table-id",
          table.id,
        ],
        { json: true },
      ),
      "columns",
    ).map((column) => [column.key, column]),
  );

  for (const column of table.columns) {
    if (existingColumns.has(column.key)) {
      continue;
    }

    console.log(`Creating column ${table.id}.${column.key}`);
    runAppwrite(buildCreateColumnArgs(table.id, column));
    waitForStatus({
      kind: "column",
      id: column.key,
      getterArgs: [
        "tables-db",
        "get-column",
        "--database-id",
        resources.database.id,
        "--table-id",
        table.id,
        "--key",
        column.key,
      ],
    });
  }

  const existingIndexes = new Map(
    listResponse(
      runAppwrite(
        [
          "tables-db",
          "list-indexes",
          "--database-id",
          resources.database.id,
          "--table-id",
          table.id,
        ],
        { json: true },
      ),
      "indexes",
    ).map((index) => [index.key, index]),
  );

  for (const index of table.indexes) {
    if (existingIndexes.has(index.key)) {
      continue;
    }

    console.log(`Creating index ${table.id}.${index.key}`);
    runAppwrite([
      "tables-db",
      "create-index",
      "--database-id",
      resources.database.id,
      "--table-id",
      table.id,
      "--key",
      index.key,
      "--type",
      index.type,
      "--columns",
      ...index.columns,
      ...(Array.isArray(index.orders) ? ["--orders", ...index.orders] : []),
      ...(Array.isArray(index.lengths)
        ? ["--lengths", ...index.lengths.map((value) => String(value))]
        : []),
    ]);
    waitForStatus({
      kind: "index",
      id: index.key,
      getterArgs: [
        "tables-db",
        "get-index",
        "--database-id",
        resources.database.id,
        "--table-id",
        table.id,
        "--key",
        index.key,
      ],
    });
  }
}

function buildCreateColumnArgs(tableId, column) {
  const args = [
    "tables-db",
    `create-${column.type}-column`,
    "--database-id",
    resources.database.id,
    "--table-id",
    tableId,
    "--key",
    column.key,
  ];

  if (Array.isArray(column.elements)) {
    args.push("--elements", ...column.elements);
  }
  if (typeof column.size === "number") {
    args.push("--size", String(column.size));
  }
  if (typeof column.required === "boolean") {
    args.push("--required", String(column.required));
  }
  if (typeof column.array === "boolean") {
    args.push("--array", String(column.array));
  }
  if (typeof column.min === "number") {
    args.push("--min", String(column.min));
  }
  if (typeof column.max === "number") {
    args.push("--max", String(column.max));
  }
  if (typeof column.encrypt === "boolean") {
    args.push("--encrypt", String(column.encrypt));
  }
  if (Object.prototype.hasOwnProperty.call(column, "default")) {
    args.push("--xdefault", String(column.default));
  }

  return args;
}

function seedDemoData() {
  const demoData = resources.seedData.demo;
  const tableEntries = [
    ["products", demoData.products],
    ["offers", demoData.offers],
    ["blog_posts", demoData.blog_posts],
  ];

  for (const [tableKey, rows] of tableEntries) {
    const tableId = resources.tables[tableKey].id;
    for (const row of rows) {
      const { $id, ...data } = row;
      console.log(`Upserting demo row ${tableId}.${$id}`);
      runAppwrite([
        "tables-db",
        "upsert-row",
        "--database-id",
        resources.database.id,
        "--table-id",
        tableId,
        "--row-id",
        $id,
        "--data",
        JSON.stringify(data),
      ]);
    }
  }
}

function syncFunctionVariables() {
  const sharedVariables = {
    APPWRITE_DATABASE_ID: resources.database.id,
    APPWRITE_BUCKET_PRODUCT_IMAGES_ID: resources.bucket.id,
    APPWRITE_TABLE_PRODUCTS_ID: resources.tables.products.id,
    APPWRITE_TABLE_OFFERS_ID: resources.tables.offers.id,
    APPWRITE_TABLE_MEMBERSHIPS_ID: resources.tables.memberships.id,
    APPWRITE_TABLE_PAYMENTS_ID: resources.tables.membership_payments.id,
    APPWRITE_TABLE_ORDERS_ID: resources.tables.orders.id,
    APPWRITE_TABLE_BLOG_POSTS_ID: resources.tables.blog_posts.id,
    APPWRITE_TABLE_CUSTOMER_MESSAGES_ID: resources.tables.customer_messages.id,
    APPWRITE_TABLE_BACKOFFICE_EVENTS_ID: resources.tables.backoffice_events.id,
  };

  for (const functionRef of Object.values(resources.functions)) {
    const functionCheck = runAppwrite(
      ["functions", "get", "--function-id", functionRef.id],
      { json: true, allowFailure: true },
    );

    if (!functionCheck.ok) {
      console.warn(`Skipping variables for missing function ${functionRef.id}`);
      continue;
    }

    const variablesResponse = runAppwrite(
      ["functions", "list-variables", "--function-id", functionRef.id],
      { json: true },
    );
    const variables = new Map(
      listResponse(variablesResponse, "variables").map((variable) => [
        variable.key,
        variable,
      ]),
    );

    for (const [key, value] of Object.entries(sharedVariables)) {
      const existing = variables.get(key);
      if (!existing) {
        console.log(`Creating ${functionRef.id}:${key}`);
        runAppwrite([
          "functions",
          "create-variable",
          "--function-id",
          functionRef.id,
          "--key",
          key,
          "--value",
          value,
          "--secret",
          "false",
        ]);
        continue;
      }

      if (String(existing.value ?? "") === value) {
        continue;
      }

      console.log(`Updating ${functionRef.id}:${key}`);
      runAppwrite([
        "functions",
        "update-variable",
        "--function-id",
        functionRef.id,
        "--variable-id",
        existing.$id,
        "--key",
        key,
        "--value",
        value,
        "--secret",
        "false",
      ]);
    }
  }
}

function waitForStatus({ kind, id, getterArgs }) {
  const maxAttempts = 60;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = runAppwrite(getterArgs, { json: true, allowFailure: true });
    if (!response.ok) {
      sleep(1000);
      continue;
    }

    const status = String(response.data.status ?? "available").toLowerCase();
    if (status === "available") {
      return;
    }
    if (status === "failed") {
      throw new Error(`${kind} ${id} failed to provision`);
    }

    sleep(1000);
  }

  throw new Error(`Timed out waiting for ${kind} ${id}`);
}

function listResponse(data, key) {
  const source =
    data && typeof data === "object" && "data" in data ? data.data : data;

  if (!source || typeof source !== "object") {
    return [];
  }
  const list = source[key];
  return Array.isArray(list) ? list : [];
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runAppwrite(args, options = {}) {
  const { json = false, allowFailure = false } = options;
  const cliArgs = [...(json ? ["-j"] : []), ...args];
  const result = spawnSync("appwrite", cliArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });

  if (result.status !== 0) {
    if (allowFailure) {
      return {
        ok: false,
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }

    throw new Error(
      [
        `Command failed: appwrite ${cliArgs.join(" ")}`,
        result.stdout.trim(),
        result.stderr.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (!json) {
    return {
      ok: true,
      data: result.stdout.trim(),
    };
  }

  const stdout = result.stdout.trim();
  return {
    ok: true,
    data: stdout ? JSON.parse(stdout) : null,
  };
}
