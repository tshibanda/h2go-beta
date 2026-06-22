import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// Fichier requis par iOS pour les Universal Links (retour automatique dans
// l'app après l'auth Google/Apple). Intercepté ici, avant le routeur
// TanStack Start, pour garantir qu'il est toujours servi correctement
// (le mécanisme public/_redirects de Cloudflare Pages ne s'applique pas
// ici car le déploiement utilise le préset cloudflare-module/Workers).
const AASA_CONTENT = JSON.stringify({
  applinks: {
    apps: [],
    details: [
      {
        appID: "64WRGLMF42.com.h2go.app",
        paths: ["*"],
      },
    ],
  },
});

function maybeServeAasa(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.pathname === "/.well-known/apple-app-site-association") {
    return new Response(AASA_CONTENT, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const aasaResponse = maybeServeAasa(request);
    if (aasaResponse) return aasaResponse;

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};