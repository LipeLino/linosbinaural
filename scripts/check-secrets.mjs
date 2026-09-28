import { execFileSync } from "node:child_process";
import { readFileSync, statSync, existsSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
const tracked = execFileSync(
  "git",
  [
    "-c",
    `safe.directory=${process.cwd().replaceAll("\\", "/")}`,
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const files = new Set(tracked);
function walk(path) {
  if (!existsSync(path)) return;
  for (const item of readdirSync(path, { withFileTypes: true })) {
    const p = join(path, item.name);
    if (item.isDirectory()) walk(p);
    else files.add(p);
  }
}
walk("dist/builds/linosbinaural");
const extensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".jsonc",
  ".yaml",
  ".yml",
  ".toml",
  ".md",
  ".txt",
  ".html",
  ".sql",
  ".example",
]);
const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["Stripe secret", /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/],
  ["Stripe webhook secret", /\bwhsec_[A-Za-z0-9]{20,}\b/],
  [
    "GitHub credential",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/,
  ],
  ["Supabase secret", /\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
  ["database credential", /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@$<>{}]{8,}@/],
];
const findings = [];
for (const file of files) {
  if (
    !existsSync(file) ||
    !statSync(file).isFile() ||
    !extensions.has(extname(file))
  )
    continue;
  const body = readFileSync(file, "utf8");
  for (const [name, pattern] of patterns)
    if (pattern.test(body)) findings.push({ file, kind: name });
  for (const token of body.matchAll(
    /eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g,
  )) {
    try {
      if (
        JSON.parse(Buffer.from(token[1], "base64url").toString()).role ===
        "service_role"
      )
        findings.push({ file, kind: "privileged JWT" });
    } catch {}
  }
}
if (findings.length) {
  console.error(JSON.stringify(findings, null, 2));
  process.exit(1);
}
console.log(
  `PASS: ${files.size} candidate repository/build files checked; no recognized privileged credentials. Values never printed. This supplements provider secret scanning, not a guarantee.`,
);
