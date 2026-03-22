#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const command = process.argv[2];
const configPath = resolve(process.cwd(), "appwrite.config.json");

const requiredEnv = [
  "VITE_APPWRITE_ENDPOINT",
  "VITE_APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
];

const getEnv = (key) => process.env[key]?.trim() ?? "";
const missingEnv = requiredEnv.filter((key) => !getEnv(key));

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

if (!existsSync(configPath)) {
  console.error("Missing appwrite.config.json in the project root.");
  process.exit(1);
}

const endpoint = getEnv("VITE_APPWRITE_ENDPOINT");
const projectId = getEnv("VITE_APPWRITE_PROJECT_ID");
const apiKey = getEnv("APPWRITE_API_KEY");

const readConfig = () => JSON.parse(readFileSync(configPath, "utf8"));
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const getCliVersion = () => {
  const result = spawnSync("appwrite", ["--version"], { encoding: "utf8" });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error("Unable to determine Appwrite CLI version.");
  }

  const output = `${result.stdout}\n${result.stderr}`.trim();
  const match = output.match(/(\d+)\.(\d+)\.(\d+)/);

  if (!match) {
    throw new Error(`Unable to parse Appwrite CLI version from output:\n${output}`);
  }

  return match[0];
};

const ensureCliSupport = () => {
  const version = getCliVersion();
  const major = Number.parseInt(version.split(".")[0] ?? "", 10);

  if (!Number.isFinite(major) || major < 14) {
    throw new Error(
      `Appwrite CLI ${version} is too old for this schema workflow. Install a newer CLI version.`,
    );
  }
};

const configureCli = () => {
  ensureCliSupport();
  runCli([
    "client",
    "--endpoint",
    endpoint,
    "--project-id",
    projectId,
    "--key",
    apiKey,
  ]);
};

const runCli = (args, options = {}) => {
  const result = spawnSync("appwrite", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const ok = result.status === 0;

  if (!ok && !options.allowFailure) {
    throw new Error(output || `appwrite ${args.join(" ")} failed`);
  }

  if (options.json) {
    const raw = result.stdout?.trim() || result.stderr?.trim() || "null";
    return { ok, data: JSON.parse(raw) };
  }

  if (output && !options.silent) {
    console.log(output);
  }

  return { ok, data: output };
};

const getDatabaseDefinition = (config) => {
  const database = config.tablesDB?.[0];
  if (!database?.$id || !database?.name) {
    throw new Error("appwrite.config.json must define one tablesDB entry with $id and name.");
  }
  return database;
};

const getTableDefinitions = (config) => {
  if (!Array.isArray(config.tables) || config.tables.length === 0) {
    throw new Error("appwrite.config.json must define at least one table.");
  }
  return config.tables;
};

const getBucketDefinitions = (config) => (Array.isArray(config.buckets) ? config.buckets : []);

function listResponse(data, key) {
  const source =
    data && typeof data === "object" && "data" in data ? data.data : data;

  if (!source || typeof source !== "object") {
    return [];
  }

  const list = source[key];
  return Array.isArray(list) ? list : [];
}

function ensureDatabase(database) {
  const existing = runCli(
    ["tables-db", "get", "--database-id", database.$id],
    { json: true, allowFailure: true, silent: true },
  );

  if (!existing.ok) {
    console.log(`Creating database ${database.$id}`);
    runCli([
      "tables-db",
      "create",
      "--database-id",
      database.$id,
      "--name",
      database.name,
      "--enabled",
      String(database.enabled ?? true),
    ]);
    return;
  }

  console.log(`Updating database ${database.$id}`);
  runCli([
    "tables-db",
    "update",
    "--database-id",
    database.$id,
    "--name",
    database.name,
    "--enabled",
    String(database.enabled ?? true),
  ]);
}

function ensureBucket(bucket) {
  const existing = runCli(
    ["storage", "get-bucket", "--bucket-id", bucket.$id],
    { json: true, allowFailure: true, silent: true },
  );

  const baseArgs = [
    "--bucket-id",
    bucket.$id,
    "--name",
    bucket.name,
    "--permissions",
    ...(bucket.$permissions ?? []),
    "--file-security",
    String(bucket.fileSecurity ?? true),
    "--enabled",
    String(bucket.enabled ?? true),
    "--maximum-file-size",
    String(bucket.maximumFileSize ?? 20000000),
    "--allowed-file-extensions",
    ...((bucket.allowedFileExtensions ?? []).map((value) => String(value))),
    "--compression",
    bucket.compression ?? "none",
    "--encryption",
    String(bucket.encryption ?? true),
    "--antivirus",
    String(bucket.antivirus ?? true),
    "--transformations",
    String(bucket.transformations ?? true),
  ];

  if (!existing.ok) {
    console.log(`Creating bucket ${bucket.$id}`);
    runCli(["storage", "create-bucket", ...baseArgs]);
    return;
  }

  console.log(`Updating bucket ${bucket.$id}`);
  runCli(["storage", "update-bucket", ...baseArgs]);
}

function ensureTable(databaseId, table) {
  const existing = runCli(
    ["tables-db", "get-table", "--database-id", databaseId, "--table-id", table.$id],
    { json: true, allowFailure: true, silent: true },
  );

  const tableArgs = [
    "--database-id",
    databaseId,
    "--table-id",
    table.$id,
    "--name",
    table.name,
    "--permissions",
    ...(table.$permissions ?? []),
    "--row-security",
    String(table.rowSecurity ?? true),
    "--enabled",
    String(table.enabled ?? true),
  ];

  if (!existing.ok) {
    console.log(`Creating table ${table.$id}`);
    runCli(["tables-db", "create-table", ...tableArgs]);
  } else {
    console.log(`Updating table ${table.$id}`);
    runCli(["tables-db", "update-table", ...tableArgs]);
  }
}

function buildCreateColumnArgs(tableId, column, databaseId) {
  const args = [
    "tables-db",
    `create-${column.type}-column`,
    "--database-id",
    databaseId,
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
  if (Object.prototype.hasOwnProperty.call(column, "default") && column.default !== null) {
    args.push("--xdefault", String(column.default));
  }

  return args;
}

function waitForStatus({ getterArgs, kind, id }) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = runCli(getterArgs, {
      json: true,
      allowFailure: true,
      silent: true,
    });

    if (!response.ok) {
      sleep(1000);
      continue;
    }

    const status = String(response.data?.status ?? "available").toLowerCase();
    if (status === "available") {
      return;
    }
    if (status === "failed" || status === "stuck") {
      throw new Error(`${kind} ${id} failed to provision`);
    }

    sleep(1000);
  }

  throw new Error(`Timed out waiting for ${kind} ${id}`);
}

function ensureColumns(databaseId, table) {
  const existingColumns = new Map(
    listResponse(
      runCli(
        [
          "tables-db",
          "list-columns",
          "--database-id",
          databaseId,
          "--table-id",
          table.$id,
        ],
        { json: true, silent: true },
      ),
      "columns",
    ).map((column) => [column.key, column]),
  );

  for (const column of table.columns ?? []) {
    if (existingColumns.has(column.key)) {
      continue;
    }

    console.log(`Creating column ${table.$id}.${column.key}`);
    runCli(buildCreateColumnArgs(table.$id, column, databaseId));
    waitForStatus({
      kind: "column",
      id: `${table.$id}.${column.key}`,
      getterArgs: [
        "tables-db",
        "get-column",
        "--database-id",
        databaseId,
        "--table-id",
        table.$id,
        "--key",
        column.key,
      ],
    });
  }
}

function ensureIndexes(databaseId, table) {
  const existingIndexes = new Map(
    listResponse(
      runCli(
        [
          "tables-db",
          "list-indexes",
          "--database-id",
          databaseId,
          "--table-id",
          table.$id,
        ],
        { json: true, silent: true },
      ),
      "indexes",
    ).map((index) => [index.key, index]),
  );

  for (const index of table.indexes ?? []) {
    if (existingIndexes.has(index.key)) {
      continue;
    }

    console.log(`Creating index ${table.$id}.${index.key}`);
    runCli([
      "tables-db",
      "create-index",
      "--database-id",
      databaseId,
      "--table-id",
      table.$id,
      "--key",
      index.key,
      "--type",
      index.type,
      "--columns",
      ...(index.attributes ?? []),
      ...(Array.isArray(index.orders) ? ["--orders", ...index.orders] : []),
      ...(Array.isArray(index.lengths)
        ? ["--lengths", ...index.lengths.map((value) => String(value))]
        : []),
    ]);
    waitForStatus({
      kind: "index",
      id: `${table.$id}.${index.key}`,
      getterArgs: [
        "tables-db",
        "get-index",
        "--database-id",
        databaseId,
        "--table-id",
        table.$id,
        "--key",
        index.key,
      ],
    });
  }
}

function pullSchema() {
  const existingConfig = readConfig();
  const database = getDatabaseDefinition(existingConfig);
  const managedBuckets = getBucketDefinitions(existingConfig);

  const remoteDatabase = runCli(
    ["tables-db", "get", "--database-id", database.$id],
    { json: true, silent: true },
  ).data;
  const remoteTables = listResponse(
    runCli(
      ["tables-db", "list-tables", "--database-id", database.$id],
      { json: true, silent: true },
    ),
    "tables",
  );

  const tables = remoteTables.map((table) => {
    const columns = listResponse(
      runCli(
        ["tables-db", "list-columns", "--database-id", database.$id, "--table-id", table.$id],
        { json: true, silent: true },
      ),
      "columns",
    ).map((column) => {
      const normalized = {
        key: column.key,
        type: column.type,
        required: column.required ?? false,
        array: column.array ?? false,
      };

      for (const key of [
        "size",
        "default",
        "elements",
        "min",
        "max",
        "encrypt",
        "relatedTableId",
        "relationType",
        "twoWay",
        "twoWayKey",
        "onDelete",
      ]) {
        if (Object.prototype.hasOwnProperty.call(column, key) && column[key] !== undefined) {
          normalized[key] = column[key];
        }
      }

      return normalized;
    });

    const indexes = listResponse(
      runCli(
        ["tables-db", "list-indexes", "--database-id", database.$id, "--table-id", table.$id],
        { json: true, silent: true },
      ),
      "indexes",
    ).map((index) => ({
      key: index.key,
      type: index.type,
      attributes: index.columns ?? [],
      ...(Array.isArray(index.orders) && index.orders.length > 0 ? { orders: index.orders } : {}),
      ...(Array.isArray(index.lengths) && index.lengths.length > 0 ? { lengths: index.lengths } : {}),
    }));

    return {
      $id: table.$id,
      databaseId: table.databaseId,
      name: table.name,
      enabled: table.enabled ?? true,
      rowSecurity: table.rowSecurity ?? true,
      $permissions: table.$permissions ?? [],
      columns,
      indexes,
    };
  });

  const buckets = managedBuckets.map((bucket) => {
    const remoteBucket = runCli(
      ["storage", "get-bucket", "--bucket-id", bucket.$id],
      { json: true, allowFailure: true, silent: true },
    );

    if (!remoteBucket.ok || !remoteBucket.data) {
      return bucket;
    }

    return {
      $id: remoteBucket.data.$id,
      name: remoteBucket.data.name,
      enabled: remoteBucket.data.enabled,
      fileSecurity: remoteBucket.data.fileSecurity,
      maximumFileSize: remoteBucket.data.maximumFileSize,
      allowedFileExtensions: remoteBucket.data.allowedFileExtensions ?? [],
      compression: remoteBucket.data.compression,
      encryption: remoteBucket.data.encryption,
      antivirus: remoteBucket.data.antivirus,
      transformations: remoteBucket.data.transformations ?? true,
      $permissions: remoteBucket.data.$permissions ?? [],
    };
  });

  const nextConfig = {
    ...existingConfig,
    projectId,
    tablesDB: [
      {
        $id: remoteDatabase.$id,
        name: remoteDatabase.name,
        enabled: remoteDatabase.enabled ?? true,
      },
    ],
    tables,
    buckets,
  };

  writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`);
  console.log("Pulled Appwrite schema into appwrite.config.json");
}

function pushSchema() {
  const config = readConfig();
  const database = getDatabaseDefinition(config);
  const tables = getTableDefinitions(config);
  const buckets = getBucketDefinitions(config);

  ensureDatabase(database);

  for (const bucket of buckets) {
    ensureBucket(bucket);
  }

  for (const table of tables) {
    ensureTable(database.$id, table);
  }

  for (const table of tables) {
    ensureColumns(database.$id, table);
  }

  for (const table of tables) {
    ensureIndexes(database.$id, table);
  }

  console.log("Schema sync completed.");
}

function resetSchema() {
  const config = readConfig();
  const database = getDatabaseDefinition(config);

  for (const bucket of getBucketDefinitions(config)) {
    const existingBucket = runCli(
      ["storage", "get-bucket", "--bucket-id", bucket.$id],
      { json: true, allowFailure: true, silent: true },
    );
    if (existingBucket.ok) {
      console.log(`Deleting bucket ${bucket.$id}`);
      runCli(["-f", "storage", "delete-bucket", "--bucket-id", bucket.$id]);
    }
  }

  const existingDatabase = runCli(
    ["tables-db", "get", "--database-id", database.$id],
    { json: true, allowFailure: true, silent: true },
  );
  if (existingDatabase.ok) {
    console.log(`Deleting database ${database.$id}`);
    runCli(["-f", "tables-db", "delete", "--database-id", database.$id]);
  }

  pushSchema();
}

try {
  configureCli();

  switch (command) {
    case "push":
      pushSchema();
      break;
    case "reset":
      resetSchema();
      break;
    case "pull":
      pullSchema();
      break;
    case "types":
      runCli(["types", "--language", "ts", "src/lib/appwrite-generated"]);
      break;
    default:
      console.error("Usage: node scripts/appwrite-schema-sync.mjs <push|reset|pull|types>");
      process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Appwrite schema sync failed.");
  process.exit(1);
}
