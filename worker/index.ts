import { handleApi } from "./api";
import type { Env } from "./env";
import manifest from "./csp.generated.json";
const BASE = "/linosbinaural";
type DeployEnv = Env & { APP_ENV?: string };
export function securityHeaders(path: string, env: DeployEnv) {
  const headers = new Headers();
  const scripts = (manifest as Record<string, string[]>)[path] ?? [];
  let authOrigin = "";
  try {
    if (env.SUPABASE_URL) {
      const parsed = new URL(env.SUPABASE_URL);
      if (
        parsed.protocol === "https:" ||
        (env.APP_ENV !== "production" &&
          ["127.0.0.1", "localhost"].includes(parsed.hostname))
      )
        authOrigin = parsed.origin;
    }
  } catch {}
  headers.set(
    "Content-Security-Policy",
    `default-src 'none'; script-src 'self' ${scripts.join(" ")}; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${authOrigin}; media-src 'self' blob:; worker-src 'self'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'`,
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  if (env.APP_ENV !== "production")
    headers.set("X-Robots-Tag", "noindex, nofollow");
  return headers;
}
export default {
  async fetch(request: Request, env: DeployEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== BASE && !url.pathname.startsWith(BASE + "/"))
      return new Response("Not found", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    let response: Response;
    if (url.pathname.startsWith(BASE + "/api/")) {
      if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY)
        response = Response.json(
          {
            error: "service_unavailable",
            message: "Account service is not configured.",
          },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      else response = await handleApi(request, env);
    } else if (url.pathname === BASE) {
      response = new Response(null, {
        status: 308,
        headers: { location: BASE + "/" },
      });
    } else if (!env.ASSETS) {
      response = new Response("Unavailable", { status: 503 });
    } else {
      response = await env.ASSETS.fetch(request);
    }
    const result = new Response(response.body, response);
    const protectedHeaders = securityHeaders(
      response.status === 404 ? BASE + "/404.html" : url.pathname,
      env,
    );
    for (const [key, value] of protectedHeaders) result.headers.set(key, value);
    if (
      url.pathname.startsWith(BASE + "/api/") ||
      url.pathname.startsWith(BASE + "/shared") ||
      url.pathname.startsWith(BASE + "/account") ||
      url.pathname.startsWith(BASE + "/library")
    )
      result.headers.set("Cache-Control", "no-store");
    else if (url.pathname.includes("/_next/static/"))
      result.headers.set(
        "Cache-Control",
        "public, max-age=31536000, immutable",
      );
    else if (response.headers.get("content-type")?.includes("text/html"))
      result.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    return result;
  },
};
