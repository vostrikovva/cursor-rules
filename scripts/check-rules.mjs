#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const catalogRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sets = JSON.parse(readFileSync(join(catalogRoot, "sets.json"), "utf8"));
const errors = [];

function parseFrontmatter(raw) {
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!text.startsWith("---\n")) {
    return { error: "missing YAML frontmatter" };
  }
  const end = text.indexOf("\n---", 3);
  if (end === -1) {
    return { error: "unclosed YAML frontmatter" };
  }
  const body = text.slice(4, end);
  const fields = {};
  for (const line of body.split("\n")) {
    if (!line.trim()) continue;
    const match = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!match) {
      return { error: `invalid frontmatter line: ${line}` };
    }
    fields[match[1]] = match[2].trim();
  }
  return { fields };
}

function catalogRulesById() {
  const map = new Map();
  const walk = (dir) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.isFile() || extname(entry.name) !== ".mdc") continue;
      const id = basename(entry.name, ".mdc");
      if (map.has(id)) {
        errors.push(`duplicate id "${id}": ${map.get(id).path} and ${path}`);
        continue;
      }
      map.set(id, { path, raw: readFileSync(path, "utf8") });
    }
  };
  walk(join(catalogRoot, "rules"));
  return map;
}

const index = catalogRulesById();

for (const [id, rule] of index) {
  const parsed = parseFrontmatter(rule.raw);
  if (parsed.error) {
    errors.push(`${id}: ${parsed.error}`);
    continue;
  }
  if (!parsed.fields.description) {
    errors.push(`${id}: frontmatter must include description`);
  }
  if (parsed.fields.alwaysApply != null && parsed.fields.alwaysApply !== "true" && parsed.fields.alwaysApply !== "false") {
    errors.push(`${id}: alwaysApply must be true or false`);
  }
}

const referenced = new Set();
for (const [name, ids] of Object.entries(sets)) {
  if (!Array.isArray(ids)) {
    errors.push(`set "${name}" must be an array of rule ids`);
    continue;
  }
  for (const id of ids) {
    referenced.add(id);
    if (!index.has(id)) {
      errors.push(`set "${name}" references missing rule "${id}"`);
    }
  }
}

for (const id of index.keys()) {
  if (!referenced.has(id)) {
    errors.push(`rule "${id}" is not listed in any set`);
  }
}

if (errors.length > 0) {
  for (const message of errors) {
    console.error(message);
  }
  process.exit(1);
}

console.log(`ok: ${index.size} rule(s), ${Object.keys(sets).length} set(s)`);
