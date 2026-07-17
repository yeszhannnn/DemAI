import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(file) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return;
  }
  const lines = raw.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const noCr = lines[i].endsWith("\r") ? lines[i].slice(0, -1) : lines[i];
    const trimmed = noCr.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), "..", ".env.local"));

const nextConfig = {};

export default nextConfig;
