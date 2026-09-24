import { readFileSync, existsSync } from "node:fs";
export function readEnvironment(mode = "development") {
  const result = {};
  // Same precedence as Next for ordinary literal .env values; process wins.
  for (const file of [
    ".env",
    `.env.${mode}`,
    ".env.local",
    `.env.${mode}.local`,
  ]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      )
        value = value.slice(1, -1);
      result[match[1]] = value;
    }
  }
  return { ...result, ...process.env };
}
