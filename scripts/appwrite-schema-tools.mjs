#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const configPath = resolve(process.cwd(), "appwrite.config.json");
const command = process.argv[2];
const args = parseArgs(process.argv.slice(3));

const readConfig = () => JSON.parse(readFileSync(configPath, "utf8"));
const writeConfig = (value) =>
  writeFileSync(configPath, `${JSON.stringify(value, null, 2)}\n`);

try {
  switch (command) {
    case "validate":
      validateConfig(readConfig());
      console.log("appwrite.config.json is valid.");
      break;
    case "add-column":
      addColumn(readConfig(), args);
      break;
    case "add-index":
      addIndex(readConfig(), args);
      break;
    default:
      console.error(
        "Usage: node scripts/appwrite-schema-tools.mjs <validate|add-column|add-index> [options]",
      );
      process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Schema tool failed.");
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function validateConfig(config) {
  const database = config.tablesDB?.[0];
  if (!database?.$id) {
    throw new Error("Config must define one tablesDB entry with a stable $id.");
  }

  if (!Array.isArray(config.tables) || config.tables.length === 0) {
    throw new Error("Config must define at least one table.");
  }

  const tableIds = new Set();
  for (const table of config.tables) {
    if (!table.$id) {
      throw new Error("Every table needs a $id.");
    }
    if (tableIds.has(table.$id)) {
      throw new Error(`Duplicate table id: ${table.$id}`);
    }
    tableIds.add(table.$id);

    if (table.databaseId !== database.$id) {
      throw new Error(`Table ${table.$id} must target database ${database.$id}.`);
    }

    const columnKeys = new Set();
    for (const column of table.columns ?? []) {
      if (!column.key) {
        throw new Error(`Table ${table.$id} contains a column without a key.`);
      }
      if (columnKeys.has(column.key)) {
        throw new Error(`Duplicate column ${table.$id}.${column.key}`);
      }
      columnKeys.add(column.key);
    }

    const indexKeys = new Set();
    for (const index of table.indexes ?? []) {
      if (!index.key) {
        throw new Error(`Table ${table.$id} contains an index without a key.`);
      }
      if (indexKeys.has(index.key)) {
        throw new Error(`Duplicate index ${table.$id}.${index.key}`);
      }
      indexKeys.add(index.key);
    }
  }
}

function addColumn(config, input) {
  validateConfig(config);

  const tableId = String(input.table ?? "").trim();
  const key = String(input.key ?? "").trim();
  const type = normalizeColumnType(String(input.type ?? "").trim());
  const required = parseBoolean(input.required, false);
  const array = parseBoolean(input.array, false);

  if (!tableId || !key || !type) {
    throw new Error("add-column requires --table, --key, and --type.");
  }

  const table = config.tables.find((candidate) => candidate.$id === tableId);
  if (!table) {
    throw new Error(`Unknown table: ${tableId}`);
  }

  if ((table.columns ?? []).some((column) => column.key === key)) {
    throw new Error(`Column ${tableId}.${key} already exists.`);
  }

  const column = {
    key,
    type,
    required,
    array,
  };

  if (type === "varchar") {
    const size = Number.parseInt(String(input.size ?? ""), 10);
    if (!Number.isFinite(size) || size <= 0) {
      throw new Error("varchar columns require --size <positive integer>.");
    }
    column.size = size;
  }

  if (type === "enum") {
    const elements = parseList(input.elements);
    if (elements.length === 0) {
      throw new Error("enum columns require --elements value1,value2.");
    }
    column.elements = elements;
  }

  if (["integer", "float"].includes(type)) {
    if (input.min !== undefined) {
      column.min = Number(input.min);
    }
    if (input.max !== undefined) {
      column.max = Number(input.max);
    }
  }

  if (input.default !== undefined) {
    column.default = parseDefault(input.default);
  } else {
    column.default = null;
  }

  if (input.encrypt !== undefined) {
    column.encrypt = parseBoolean(input.encrypt, false);
  }

  table.columns = [...(table.columns ?? []), column];
  writeConfig(config);
  console.log(`Added column ${tableId}.${key} to appwrite.config.json`);
}

function addIndex(config, input) {
  validateConfig(config);

  const tableId = String(input.table ?? "").trim();
  const key = String(input.key ?? "").trim();
  const type = String(input.type ?? "").trim();
  const attributes = parseList(input.columns);

  if (!tableId || !key || !type || attributes.length === 0) {
    throw new Error("add-index requires --table, --key, --type, and --columns.");
  }

  const table = config.tables.find((candidate) => candidate.$id === tableId);
  if (!table) {
    throw new Error(`Unknown table: ${tableId}`);
  }

  if ((table.indexes ?? []).some((index) => index.key === key)) {
    throw new Error(`Index ${tableId}.${key} already exists.`);
  }

  const index = {
    key,
    type,
    attributes,
  };

  const orders = parseList(input.orders);
  if (orders.length > 0) {
    index.orders = orders;
  }

  const lengths = parseList(input.lengths).map((value) => Number(value));
  if (lengths.length > 0) {
    index.lengths = lengths;
  }

  table.indexes = [...(table.indexes ?? []), index];
  writeConfig(config);
  console.log(`Added index ${tableId}.${key} to appwrite.config.json`);
}

function normalizeColumnType(type) {
  if (type === "string") {
    return "varchar";
  }
  return type;
}

function parseList(value) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no"].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid boolean value: ${value}`);
}

function parseDefault(value) {
  if (value === "null") {
    return null;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (value !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return String(value);
}
