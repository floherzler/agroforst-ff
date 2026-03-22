#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import appwriteConfig from "../appwrite.config.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const envFile = path.join(repoRoot, ".env");

const args = new Set(process.argv.slice(2));
const withDemoData = args.has("--with-demo-data");
const skipDemoData = args.has("--skip-demo-data");
const skipFunctions = args.has("--skip-function-vars");

loadEnvFile(envFile);

const endpoint = requiredEnv("VITE_APPWRITE_ENDPOINT");
const projectId = requiredEnv("VITE_APPWRITE_PROJECT_ID");
const apiKey = requiredEnv("APPWRITE_API_KEY");

const databaseId = getDatabase().$id;
const bucket = getBucket();
const tablesById = new Map(getTables().map((table) => [table.$id, table]));

configureCli();

if (withDemoData || !skipDemoData) {
  seedDemoData();
}

if (!skipFunctions) {
  syncFunctionVariables();
}

console.log("Appwrite seed completed.");

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

function getDatabase() {
  const database = appwriteConfig.tablesDB?.[0];
  if (!database?.$id) {
    throw new Error("appwrite.config.json must define one tablesDB entry.");
  }
  return database;
}

function getTables() {
  if (!Array.isArray(appwriteConfig.tables) || appwriteConfig.tables.length === 0) {
    throw new Error("appwrite.config.json must define managed tables.");
  }
  return appwriteConfig.tables;
}

function getBucket() {
  const managedBucket = appwriteConfig.buckets?.[0];
  if (!managedBucket?.$id) {
    throw new Error("appwrite.config.json must define one managed bucket.");
  }
  return managedBucket;
}

function findFunctionId(name) {
  const functionRef = (appwriteConfig.functions ?? []).find(
    (candidate) => candidate.$id === name || candidate.name === name,
  );
  if (!functionRef?.$id) {
    throw new Error(`Missing function ${name} in appwrite.config.json`);
  }
  return functionRef.$id;
}

function seedDemoData() {
  const demoEntries = [
    [
      "products",
      [
        {
          $id: "apple_topaz",
          name: "Apple",
          variety: "Topaz",
          category: "fruit",
          subcategory: "pome_fruit",
          lifespan: "perennial",
          seasonality_months: [9, 10, 11],
          notes: "Demo product created by the Appwrite seed script.",
        },
        {
          $id: "tomato_sungold",
          name: "Tomato",
          variety: "Sungold",
          category: "vegetable",
          subcategory: "nightshade",
          lifespan: "annual",
          seasonality_months: [7, 8, 9],
          notes: "Demo product created by the Appwrite seed script.",
        },
      ],
    ],
    [
      "offers",
      [
        {
          $id: "offer_apple_topaz_2026",
          product_id: "apple_topaz",
          year: 2026,
          projected_quantity: 120000,
          available_quantity: 120000,
          allocated_quantity: 0,
          unit: "gram",
          unit_price_eur: 4.2,
          description: "Demo offer for seeded catalog data.",
        },
        {
          $id: "offer_tomato_sungold_2026",
          product_id: "tomato_sungold",
          year: 2026,
          projected_quantity: 60000,
          available_quantity: 60000,
          allocated_quantity: 0,
          unit: "gram",
          unit_price_eur: 6.5,
          description: "Demo offer for seeded catalog data.",
        },
      ],
    ],
    [
      "blog_posts",
      [
        {
          $id: "welcome_2026",
          title: "Willkommen im Agroforst",
          summary:
            "Der Seed legt einen Beispielbeitrag an, damit die Blog-Ansicht nicht leer startet.",
          content:
            "Dies ist ein Demo-Beitrag. Er kann nach dem ersten erfolgreichen Seed jederzeit ersetzt oder geloescht werden.",
          tags: ["demo", "setup"],
          author_name: "Agroforst FF",
          published_at: "2026-03-01T09:00:00.000Z",
          updated_at: "2026-03-01T09:00:00.000Z",
        },
      ],
    ],
  ];

  for (const [tableId, rows] of demoEntries) {
    if (!tablesById.has(tableId)) {
      throw new Error(`Managed table ${tableId} is missing from appwrite.config.json`);
    }

    for (const row of rows) {
      const { $id, ...data } = row;
      console.log(`Upserting demo row ${tableId}.${$id}`);
      runAppwrite([
        "tables-db",
        "upsert-row",
        "--database-id",
        databaseId,
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
    APPWRITE_DATABASE_ID: databaseId,
    APPWRITE_BUCKET_PRODUCT_IMAGES_ID: bucket.$id,
    APPWRITE_TABLE_PRODUCTS_ID: "products",
    APPWRITE_TABLE_OFFERS_ID: "offers",
    APPWRITE_TABLE_MEMBERSHIPS_ID: "memberships",
    APPWRITE_TABLE_PAYMENTS_ID: "membership_payments",
    APPWRITE_TABLE_ORDERS_ID: "orders",
    APPWRITE_TABLE_BLOG_POSTS_ID: "blog_posts",
    APPWRITE_TABLE_CUSTOMER_MESSAGES_ID: "customer_messages",
    APPWRITE_TABLE_BACKOFFICE_EVENTS_ID: "backoffice_events",
  };

  const functionIds = [
    findFunctionId("addProdukt"),
    findFunctionId("addAngebot"),
    findFunctionId("createMembership"),
    findFunctionId("createOrder"),
    findFunctionId("verifyPayment"),
  ];

  for (const functionId of functionIds) {
    const functionCheck = runAppwrite(["functions", "get", "--function-id", functionId], {
      json: true,
      allowFailure: true,
    });

    if (!functionCheck.ok) {
      console.warn(`Skipping variables for missing function ${functionId}`);
      continue;
    }

    const variablesResponse = runAppwrite(
      ["functions", "list-variables", "--function-id", functionId],
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
        console.log(`Creating ${functionId}:${key}`);
        runAppwrite([
          "functions",
          "create-variable",
          "--function-id",
          functionId,
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

      console.log(`Updating ${functionId}:${key}`);
      runAppwrite([
        "functions",
        "update-variable",
        "--function-id",
        functionId,
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

function listResponse(data, key) {
  const source =
    data && typeof data === "object" && "data" in data ? data.data : data;

  if (!source || typeof source !== "object") {
    return [];
  }
  const list = source[key];
  return Array.isArray(list) ? list : [];
}

function runAppwrite(args, options = {}) {
  const result = spawnSync("appwrite", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  const combinedOutput = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  const ok = result.status === 0;

  if (!ok && !options.allowFailure) {
    throw new Error(combinedOutput || `appwrite ${args.join(" ")} failed`);
  }

  if (options.json) {
    if (!combinedOutput) {
      return { ok, data: null };
    }

    const parsed = JSON.parse(result.stdout || result.stderr || "null");
    return { ok, data: parsed };
  }

  if (combinedOutput) {
    console.log(combinedOutput);
  }

  return { ok, data: combinedOutput };
}
