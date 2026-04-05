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
  const aktuellesJahr = new Date().getFullYear();
  const demoEntries = [
    [
      "produkte",
      [
        {
          $id: "kartoffel_lina",
          name: "Kartoffel",
          sorte: "Lina",
          hauptkategorie: "Gemuese",
          unterkategorie: "Wurzel-/Knollengemuese",
          lebensdauer: "einjaehrig",
          saisonalitaet: [8, 9, 10],
          bild_datei_id: "67101efe003dd6525840",
          notizen: "Festkochende Speisekartoffel.",
        },
        {
          $id: "salbei_muskateller",
          name: "Salbei",
          sorte: "Muskateller",
          hauptkategorie: "Kraeuter",
          unterkategorie: "",
          lebensdauer: "mehrjaehrig",
          saisonalitaet: [5, 6, 7, 8, 9],
          bild_datei_id: null,
          notizen: "Aromatischer Salbei für frischen Tee und Kräutertrocknung.",
        },
        {
          $id: "apfel_elstar",
          name: "Apfel",
          sorte: "Elstar",
          hauptkategorie: "Obst",
          unterkategorie: "Kernobst",
          lebensdauer: "mehrjaehrig",
          saisonalitaet: [9, 10, 11],
          bild_datei_id: "69cbfb89002158e31fec",
          notizen: "Beliebter Tafelapfel.",
        },
        {
          $id: "lupine_blue",
          name: "Lupine",
          sorte: "Blaue",
          hauptkategorie: "Gemuese",
          unterkategorie: "Huelsenfruechte",
          lebensdauer: "zweijaehrig",
          saisonalitaet: [7, 8],
          bild_datei_id: null,
          notizen: "Eiweissreich, für Verarbeitung, Futter und regionale Produkte.",
        },
        {
          $id: "hokkaido_kuerbis",
          name: "Kürbis",
          sorte: "Hokkaido",
          hauptkategorie: "Gemuese",
          unterkategorie: "Fruchtgemuese",
          lebensdauer: "einjaehrig",
          saisonalitaet: [8, 9, 10],
          bild_datei_id: "67101f08000502784a8d",
          notizen: "Gut lagerfähiger Speisekürbis.",
        },
      ],
    ],
    [
      "angebote",
      [
        {
          $id: `angebot_kartoffel_lina_${aktuellesJahr}`,
          produkt: "kartoffel_lina",
          jahr: aktuellesJahr,
          menge: 350,
          menge_verfuegbar: 350,
          menge_reserviert: 0,
          einheit: "kilogramm",
          preis_pro_einheit_eur: 2.9,
          teilungen: [1, 5, 25, 50, 100, 1000],
          preise_pro_teilung_eur: [2.9, 13.5, 60, 110, 210, 1800],
          beschreibung: "Festkochende Speisekartoffel.",
        },
        {
          $id: `angebot_salbei_muskateller_${aktuellesJahr}`,
          produkt: "salbei_muskateller",
          jahr: aktuellesJahr,
          menge: 180,
          menge_verfuegbar: 180,
          menge_reserviert: 0,
          einheit: "bund",
          preis_pro_einheit_eur: 3.2,
          teilungen: [1, 3, 5, 10],
          preise_pro_teilung_eur: [3.2, 9, 14, 26],
          beschreibung: "Frische Salbei-Buendel fuer Kueche, Tee und Hofladenregal.",
        },
        {
          $id: `angebot_apfel_elstar_${aktuellesJahr}`,
          produkt: "apfel_elstar",
          jahr: aktuellesJahr,
          menge: 240,
          menge_verfuegbar: 240,
          menge_reserviert: 0,
          einheit: "kilogramm",
          preis_pro_einheit_eur: 4.6,
          teilungen: [1, 5, 10, 25, 50, 100, 1000],
          preise_pro_teilung_eur: [4.6, 21, 39, 92, 175, 330, 2800],
          beschreibung: "Knackiger Apfel.",
        },
        {
          $id: `angebot_lupine_blue_${aktuellesJahr}`,
          produkt: "lupine_blue",
          jahr: aktuellesJahr,
          menge: 120,
          menge_verfuegbar: 120,
          menge_reserviert: 0,
          einheit: "kilogramm",
          preis_pro_einheit_eur: 3.8,
          teilungen: [1, 5, 25, 50, 100],
          preise_pro_teilung_eur: [3.8, 18, 85, 160, 300],
          beschreibung: "Blaue Lupine fuer Weiterverarbeitung, Futter oder regionale Eiweissprodukte.",
        },
        {
          $id: `angebot_hokkaido_kuerbis_${aktuellesJahr}`,
          produkt: "hokkaido_kuerbis",
          jahr: aktuellesJahr,
          menge: 90,
          menge_verfuegbar: 90,
          menge_reserviert: 0,
          einheit: "stueck",
          preis_pro_einheit_eur: 4.9,
          saat_pflanz_datum: "2026-01-03T10:11:12.013+00:00",
          ernte_projektion: [],
          teilungen: [1, 3, 5, 10],
          preise_pro_teilung_eur: [4.9, 13.5, 21, 39],
          beschreibung: "Portionsgrösse für Hofladen, Herbstmarkt und Kürbissaison.",
        },
      ],
    ],
    [
      "blog_beitraege",
      [
        {
          $id: `willkommen_${aktuellesJahr}`,
          titel: "Willkommen im Agroforst",
          kurzbeschreibung:
            "Der Seed legt einen Beispielbeitrag an, damit die Blog-Ansicht nicht leer startet.",
          inhalt:
            "Dies ist ein Demo-Beitrag. Er kann nach dem ersten erfolgreichen Seed jederzeit ersetzt oder geloescht werden.",
          schlagworte: ["demo", "setup"],
          autor_name: "Agroforst FF",
          veroeffentlicht_am: `${aktuellesJahr}-03-01T09:00:00.000Z`,
          aktualisiert_am: `${aktuellesJahr}-03-01T09:00:00.000Z`,
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
    APPWRITE_TABLE_PRODUCTS_ID: "produkte",
    APPWRITE_TABLE_OFFERS_ID: "angebote",
    APPWRITE_TABLE_MEMBERSHIPS_ID: "mitgliedschaften",
    APPWRITE_TABLE_PAYMENTS_ID: "mitgliedschaftszahlungen",
    APPWRITE_TABLE_ORDERS_ID: "bestellungen",
    APPWRITE_TABLE_BLOG_POSTS_ID: "blog_beitraege",
    APPWRITE_TABLE_CUSTOMER_MESSAGES_ID: "kunden_nachrichten",
    APPWRITE_TABLE_BACKOFFICE_EVENTS_ID: "backoffice_ereignisse",
  };

  const functionIds = [
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

function extractJsonPayload(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const objectStart = trimmed.indexOf("{");
    const arrayStart = trimmed.indexOf("[");
    const startCandidates = [objectStart, arrayStart].filter((value) => value >= 0);
    if (startCandidates.length === 0) {
      return null;
    }

    const start = Math.min(...startCandidates);
    const lastObjectEnd = trimmed.lastIndexOf("}");
    const lastArrayEnd = trimmed.lastIndexOf("]");
    const end = Math.max(lastObjectEnd, lastArrayEnd);
    if (end < start) {
      return null;
    }

    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function runAppwrite(args, options = {}) {
  const commandArgs =
    options.json && !args.includes("--json") ? [...args, "--json"] : args;

  const result = spawnSync("appwrite", commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  const combinedOutput = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  const ok = result.status === 0;

  if (!ok && !options.allowFailure) {
    throw new Error(combinedOutput || `appwrite ${args.join(" ")} failed`);
  }

  if (options.json) {
    const raw = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    const data = extractJsonPayload(raw);

    if (!ok) {
      return { ok, data };
    }

    if (data === null) {
      throw new Error(combinedOutput || `appwrite ${commandArgs.join(" ")} did not return JSON`);
    }

    return { ok, data };
  }

  if (combinedOutput) {
    console.log(combinedOutput);
  }

  return { ok, data: combinedOutput };
}
