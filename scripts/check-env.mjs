import { existsSync, readFileSync } from "node:fs";
import { readEnvironment } from "./environment.mjs";
const production = process.argv.includes("--production");
const e = readEnvironment(production ? "production" : "development");
const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}
function https(value) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !["localhost", "127.0.0.1"].includes(u.hostname)
    );
  } catch {
    return false;
  }
}
const enabled = (name) => e[name] === "true";
check(
  Boolean(e.NEXT_PUBLIC_SUPABASE_URL) ===
    Boolean(e.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  "Public Supabase URL and anon/publishable key must be supplied together.",
);
if (e.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  let role;
  try {
    role = JSON.parse(
      Buffer.from(
        e.NEXT_PUBLIC_SUPABASE_ANON_KEY.split(".")[1] || "",
        "base64url",
      ).toString(),
    ).role;
  } catch {}
  check(
    role !== "service_role" &&
      !e.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith("sb_secret_"),
    "Privileged Supabase keys must never be public.",
  );
}
for (const [name, value] of Object.entries(e))
  if (name.startsWith("NEXT_PUBLIC_"))
    check(
      !/^(?:sk|rk)_(?:test|live)_|^whsec_|^sb_secret_/.test(value || ""),
      `${name} contains a privileged credential.`,
    );
if (e.NEXT_PUBLIC_SUPPORT_URL)
  check(
    https(e.NEXT_PUBLIC_SUPPORT_URL),
    "Support URL must use HTTPS without credentials.",
  );
if (production) {
  check(
    e.NEXT_PUBLIC_APP_ENV === "production",
    "NEXT_PUBLIC_APP_ENV must be production.",
  );
  check(
    https(e.NEXT_PUBLIC_SUPABASE_URL),
    "Launch requires a production HTTPS Supabase project.",
  );
  check(
    Boolean(e.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    "Launch requires the public Supabase key.",
  );
  check(
    https(e.NEXT_PUBLIC_SUPPORT_URL),
    "Launch requires a real HTTPS support/contact URL.",
  );
  check(
    e.PUBLIC_ORIGIN === "https://mateuslino.com",
    "PUBLIC_ORIGIN must be the canonical HTTPS origin.",
  );
  check(e.APP_ENV === "production", "Worker APP_ENV must be production.");
  check(
    e.SUPABASE_URL === e.NEXT_PUBLIC_SUPABASE_URL,
    "Worker and public Supabase projects must match.",
  );
  check(
    Boolean(e.SUPABASE_SERVICE_ROLE_KEY),
    "Secure Worker configuration must include its service-role key.",
  );
  check(
    Boolean(e.SUPABASE_ANON_KEY),
    "Secure Worker configuration must include its anon/publishable key.",
  );
  const info = existsSync("artifacts/build-metadata.json")
    ? JSON.parse(readFileSync("artifacts/build-metadata.json", "utf8"))
    : null;
  check(
    info?.appEnvironment === "production" &&
      info?.supabaseOrigin === e.NEXT_PUBLIC_SUPABASE_URL,
    "Rebuild with the production public configuration before deployment.",
  );
}
if (enabled("NEXT_PUBLIC_CHECKOUT_ENABLED")) {
  check(
    e.STRIPE_MODE === "live" || (!production && e.STRIPE_MODE === "test"),
    "Checkout Stripe mode must match the environment.",
  );
  for (const name of [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRODUCT_ID",
    "STRIPE_PRICE_USD",
    "STRIPE_PRICE_BRL",
  ])
    check(Boolean(e[name]), `${name} is required for checkout.`);
  check(
    e.STRIPE_PRICE_USD !== e.STRIPE_PRICE_BRL,
    "USD and BRL require separate fixed prices.",
  );
  check(
    e.STRIPE_SECRET_KEY?.startsWith(`sk_${e.STRIPE_MODE}_`) ||
      e.STRIPE_SECRET_KEY?.startsWith(`rk_${e.STRIPE_MODE}_`),
    "Stripe key mode does not match STRIPE_MODE.",
  );
}
if (enabled("NEXT_PUBLIC_ADS_ENABLED")) {
  check(
    production && enabled("NEXT_PUBLIC_SPONSOR_APPROVED"),
    "Sponsorship is production-only and requires actual approval.",
  );
  check(
    Boolean(e.NEXT_PUBLIC_SPONSOR_NAME?.trim()),
    "Sponsor name is required.",
  );
  check(
    https(e.NEXT_PUBLIC_SPONSOR_URL),
    "Sponsor destination must use HTTPS.",
  );
  const image = e.NEXT_PUBLIC_SPONSOR_IMAGE || "";
  check(
    /^\/builds\/linosbinaural\/sponsors\/[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(image) &&
      existsSync("public/" + image.replace("/builds/linosbinaural/", "")),
    "Sponsor creative must be a real local approved image.",
  );
}
if (failures.length) {
  console.error(failures.map((x) => `FAIL: ${x}`).join("\n"));
  process.exit(1);
}
console.log(
  `PASS: ${production ? "production" : "local"} configuration shape. Provider identity, prices, approvals, email delivery, route safety and cloud secrets still require the release checklist.`,
);
