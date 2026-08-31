#!/usr/bin/env node
/**
 * Install catalog rules into a Cursor project.
 *
 * Interactive (TTY, no preset args):
 *   npx --yes github:vostrikovva/cursor-rules
 *
 * Named:
 *   npx --yes github:vostrikovva/cursor-rules all --to .
 *
 * Locally, from this catalog:
 *   npx --yes . all --to ../my-app
 */
import { input, select } from "@inquirer/prompts";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const catalogRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sets = JSON.parse(readFileSync(join(catalogRoot, "sets.json"), "utf8"));

function usage() {
  const names = Object.keys(sets).join(", ");
  console.log(`Install Cursor rules from this catalog.

Usage:
  npx --yes github:vostrikovva/cursor-rules
  npx --yes github:vostrikovva/cursor-rules <set...> [options]
  npx --yes . <set...> [options]
  node scripts/install.mjs <set...> [options]

With no set names and a TTY, prompts for install scope, project directory
(local), then which set to install (including all).
Without a TTY and without set names, installs all.

Default: local project, .cursor/rules.
Do not install into Cursor internals.

Cursor loads rules from:
  .cursor/rules/          project-level  (default)
  ~/.cursor/rules/        user-level (global)

Copies each .mdc from this catalog into the chosen directory only.

Options:
  --to <dir>              Local project root (default: current directory).
                          Cannot be combined with --global.
  -g, --global            User-level install (all projects).
  --dry-run               Print the rule list and dest without installing
  --list                  List sets and the rule ids they expand to
  --help                  Show this help

Sets: ${names}

Examples:
  npx --yes github:vostrikovva/cursor-rules
  npx --yes github:vostrikovva/cursor-rules all --to .
  npx --yes github:vostrikovva/cursor-rules --global
  npx --yes github:vostrikovva/cursor-rules --list
`);
}

function unique(list) {
  return [...new Set(list)];
}

function expand(name) {
  if (!Object.hasOwn(sets, name)) {
    throw new Error(`Unknown set "${name}". Known: ${Object.keys(sets).join(", ")}`);
  }
  const ids = sets[name];
  if (!Array.isArray(ids)) {
    throw new Error(`Set "${name}" must be an array of rule ids`);
  }
  return ids;
}

function parseArgs(argv) {
  const names = [];
  let to = null;
  let globalInstall = false;
  let dryRun = false;
  let list = false;
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") {
      continue;
    }
    if (a === "--help" || a === "-h") {
      help = true;
      continue;
    }
    if (a === "--list") {
      list = true;
      continue;
    }
    if (a === "--to") {
      to = argv[++i];
      if (!to) throw new Error("--to requires a directory");
      continue;
    }
    if (a === "--global" || a === "-g") {
      globalInstall = true;
      continue;
    }
    if (a === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (a.startsWith("-")) {
      throw new Error(`Unknown flag: ${a}`);
    }
    names.push(a);
  }
  if (globalInstall && to != null) {
    throw new Error("Use either --global or --to, not both");
  }
  return {
    names,
    to,
    globalInstall,
    dryRun,
    list,
    help,
  };
}

function listSets() {
  for (const name of Object.keys(sets)) {
    console.log(`${name}: ${unique(expand(name)).join(", ")}`);
  }
}

function isTty() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

async function promptSet() {
  if (!isTty()) return ["all"];

  const choices = Object.keys(sets).map((name) => ({
    name: `${name} — ${unique(expand(name)).join(", ")}`,
    value: name,
  }));

  const picked = await select({
    message: "Rule set",
    default: "all",
    choices,
  });
  return [picked];
}

async function resolveInstallTarget(parsed) {
  let globalInstall = parsed.globalInstall;
  let to = parsed.to;
  const tty = isTty();
  const scopeKnown = parsed.globalInstall || parsed.to != null;

  if (tty && !scopeKnown) {
    const scope = await select({
      message: "Install scope",
      default: "local",
      choices: [
        { name: "Local (this project) — default", value: "local" },
        { name: "Global (all projects)", value: "global" },
      ],
    });
    globalInstall = scope === "global";
  }

  if (!globalInstall && to == null) {
    if (tty) {
      const raw = await input({
        message: "Project directory",
        default: process.cwd(),
      });
      to = resolve(process.cwd(), raw);
    } else {
      to = resolve(process.cwd());
    }
  } else if (to != null) {
    to = resolve(process.cwd(), to);
  } else {
    to = resolve(process.cwd());
  }

  return { globalInstall, to };
}

function rulesHome() {
  return join(homedir(), ".cursor", "rules");
}

function rulesProject(project) {
  return join(project, ".cursor", "rules");
}

function catalogRulesById() {
  const map = new Map();
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.isFile() || extname(entry.name) !== ".mdc") continue;
      const id = basename(entry.name, ".mdc");
      if (map.has(id)) {
        throw new Error(`Duplicate rule id "${id}": ${map.get(id)} and ${path}`);
      }
      map.set(id, path);
    }
  };
  walk(join(catalogRoot, "rules"));
  return map;
}

function installRules(ids, destDir) {
  const index = catalogRulesById();
  mkdirSync(destDir, { recursive: true });
  for (const id of ids) {
    const src = index.get(id);
    if (!src) {
      console.warn(`Skip, missing in catalog: ${id}`);
      continue;
    }
    const dest = join(destDir, `${id}.mdc`);
    if (existsSync(dest)) {
      rmSync(dest, { force: true });
    }
    cpSync(src, dest);
  }
  console.log("Installed to:", destDir);
}

function install({ names, to, dryRun, globalInstall }) {
  const ids = unique(names.flatMap((n) => expand(n)));
  const chosenDir = globalInstall ? rulesHome() : rulesProject(to);

  console.log("Catalog:", catalogRoot);
  console.log("Scope:", globalInstall ? "global" : "local");
  console.log("Project:", to);
  console.log("Chosen:", chosenDir);
  console.log("Sets:", names.join(", "));
  console.log("Rules:", ids.join(", "));

  if (dryRun) {
    process.exit(0);
  }

  installRules(ids, chosenDir);
  process.exit(0);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.help) {
    usage();
    process.exit(0);
  }
  if (parsed.list) {
    listSets();
    process.exit(0);
  }

  const target = await resolveInstallTarget(parsed);

  let names = parsed.names;
  if (names.length === 0) {
    names = await promptSet();
  }

  install({ names, dryRun: parsed.dryRun, ...target });
}

main().catch((err) => {
  const name = err && typeof err === "object" && "name" in err ? err.name : "";
  if (name === "ExitPromptError") {
    process.exit(1);
  }
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
