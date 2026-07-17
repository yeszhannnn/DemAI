// scripts/lint-design.mjs — DemAI design-system guard (Prompt 12.3).
//
// Fails CI-style (exit 1) if ANY of these hold:
//   (a) a hex color literal appears outside globals.css / tailwind.config.ts
//       (DESIGN §8: "A new hex appearing in code is a bug"). Markdown docs are
//       exempt — DESIGN.md/PROMPTS.md legitimately print the tokens.
//   (b) the legacy product name «Tynys» appears anywhere in the product source
//       or assets. The design/prompt docs that DEFINE the ban are exempt, as is
//       this lint script itself (it has to mention the string to check for it).
//   (c) a border-radius below 14px (the DESIGN §3.1 minimum, --r-chip) is
//       introduced — inline `borderRadius`, CSS `border-radius`, arbitrary
//       `rounded-[Npx]`, or any sub-14px Tailwind radius utility.
//   (d) the RU and KK i18n dictionaries have mismatched key sets (Prompt 12.3d).
//
// Run with `npm run lint:design`.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");

// Normalize to forward slashes so path comparisons are stable on Windows.
const norm = (p) => p.split(sep).join("/");

// --- file collection --------------------------------------------------------

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "public", // generated/binary assets (icons, geojson) — not source
  "terminals",
]);
const SANCTIONED_FOR_HEX = new Set(
  [join("app", "globals.css"), join("tailwind.config.ts")].map(norm),
);
// Docs that legitimately reference the legacy name / print color tokens. These
// live at the repo root (outside demai/), so they are not collected by the
// scanner below — the set is kept for clarity and forward-compatibility.
const DOCS_EXEMPT_FROM_TYNYS = new Set(
  [join("DESIGN.md"), join("PROMPTS.md")].map(norm),
);
const THIS_FILE = norm(join("scripts", "lint-design.mjs"));

// Code extensions whose contents are scanned for hex + radius.
const CODE_EXT = new Set([".ts", ".tsx", ".mjs", ".js", ".css", ".json"]);
// Text extensions scanned for the Tynys string (broader — includes docs/assets).
const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".mjs",
  ".js",
  ".css",
  ".json",
  ".md",
  ".svg",
  ".html",
  ".yml",
  ".yaml",
]);

function listFiles(dir, acc) {
  for (const name of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) listFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

const allFiles = listFiles(ROOT, []).filter((f) => !statSync(f).isDirectory());
const rel = (f) => relative(ROOT, f).split(sep).join("/");

// --- (a) hex colors ---------------------------------------------------------

const HEX_RE = /#[0-9A-Fa-f]{3,8}\b/g;
const hexViolations = [];
for (const f of allFiles) {
  const ext = f.slice(f.lastIndexOf("."));
  if (!CODE_EXT.has(ext)) continue;
  const r = rel(f);
  if (SANCTIONED_FOR_HEX.has(r)) continue;
  const text = readFileSync(f, "utf8");
  let m;
  HEX_RE.lastIndex = 0;
  while ((m = HEX_RE.exec(text))) {
    const line = text.slice(0, m.index).split("\n").length;
    hexViolations.push(`${r}:${line}: hex color "${m[0]}" (only globals.css / tailwind.config.ts may hold hex)`);
  }
}

// --- (b) legacy name ---------------------------------------------------------

const TYNYS = "Tynys";
const tynysViolations = [];
for (const f of allFiles) {
  const ext = f.slice(f.lastIndexOf("."));
  if (!TEXT_EXT.has(ext)) continue;
  const r = rel(f);
  if (DOCS_EXEMPT_FROM_TYNYS.has(r)) continue;
  if (r === THIS_FILE) continue;
  const text = readFileSync(f, "utf8");
  let idx = 0;
  let found;
  while ((found = text.indexOf(TYNYS, idx)) !== -1) {
    const line = text.slice(0, found).split("\n").length;
    tynysViolations.push(`${r}:${line}: legacy name "${TYNYS}" — use "DemAI" (DESIGN §naming)`);
    idx = found + TYNYS.length;
  }
}

// --- (c) border-radius < 14px ----------------------------------------------

const MIN_R = 14;
// Tailwind named radii that fall below the 14px minimum (DESIGN §3.1).
const SMALL_RADIUS_CLASSES = new Set([
  "rounded",
  "rounded-sm",
  "rounded-md",
  "rounded-lg",
  "rounded-xl",
]);
const radiusViolations = [];
const RADIUS_INLINE_RE = /border-?radius\s*:\s*"?(\d+(?:\.\d+)?)px/gi;
const RADIUS_ARBITRARY_RE = /rounded-\[(\d+(?:\.\d+)?)px\]/g;
const RADIUS_CLASS_RE = /\brounded-(sm|md|lg|xl|2xl|3xl|none|full|card|inner|chip)\b/g;
for (const f of allFiles) {
  const ext = f.slice(f.lastIndexOf("."));
  if (!CODE_EXT.has(ext)) continue;
  if (rel(f) === THIS_FILE) continue;
  const text = readFileSync(f, "utf8");
  const lineOf = (i) => text.slice(0, i).split("\n").length;
  let m;
  RADIUS_INLINE_RE.lastIndex = 0;
  while ((m = RADIUS_INLINE_RE.exec(text))) {
    if (Number(m[1]) < MIN_R) {
      radiusViolations.push(
        `${rel(f)}:${lineOf(m.index)}: border-radius ${m[1]}px < ${MIN_R}px (DESIGN §3.1 minimum)`,
      );
    }
  }
  RADIUS_ARBITRARY_RE.lastIndex = 0;
  while ((m = RADIUS_ARBITRARY_RE.exec(text))) {
    if (Number(m[1]) < MIN_R) {
      radiusViolations.push(
        `${rel(f)}:${lineOf(m.index)}: rounded-[${m[1]}px] < ${MIN_R}px (DESIGN §3.1 minimum)`,
      );
    }
  }
  RADIUS_CLASS_RE.lastIndex = 0;
  while ((m = RADIUS_CLASS_RE.exec(text))) {
    if (SMALL_RADIUS_CLASSES.has(`rounded-${m[1]}`)) {
      radiusViolations.push(
        `${rel(f)}:${lineOf(m.index)}: "rounded-${m[1]}" maps to a sub-14px radius (use rounded-full / rounded-card / rounded-inner / rounded-chip)`,
      );
    }
  }
}

// --- (d) i18n key-set parity ------------------------------------------------

function extractDictKeys(file) {
  const text = readFileSync(file, "utf8");
  const keys = new Set();
  // matches `"some.key":` at the start of a dictionary entry line
  const re = /^\s*"([a-zA-Z0-9_.\-]+)"\s*:/gm;
  let m;
  while ((m = re.exec(text))) keys.add(m[1]);
  return keys;
}

const ruKeys = extractDictKeys(join(ROOT, "lib", "ru.ts"));
const kkKeys = extractDictKeys(join(ROOT, "lib", "kk.ts"));
const missingInKk = [...ruKeys].filter((k) => !kkKeys.has(k));
const missingInRu = [...kkKeys].filter((k) => !ruKeys.has(k));
const i18nViolations = [];
for (const k of missingInKk) i18nViolations.push(`kk.ts missing key "${k}" (present in ru.ts)`);
for (const k of missingInRu) i18nViolations.push(`ru.ts missing key "${k}" (present in kk.ts)`);

// --- report -----------------------------------------------------------------

const all = [
  ...hexViolations.map((v) => `[hex] ${v}`),
  ...tynysViolations.map((v) => `[name] ${v}`),
  ...radiusViolations.map((v) => `[radius] ${v}`),
  ...i18nViolations.map((v) => `[i18n] ${v}`),
];

if (all.length === 0) {
  console.log("lint:design — OK (no hex outside tokens, no legacy name, no sub-14px radii, ru/kk keys match)");
  process.exit(0);
}

console.error(`lint:design — FAILED (${all.length} violation${all.length === 1 ? "" : "s"}):\n`);
for (const v of all) console.error("  " + v);
process.exit(1);
