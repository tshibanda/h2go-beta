import { registerSW } from "virtual:pwa-register";

/**
 * Register the app-shell service worker only in the published web app.
 * Never in dev, Lovable preview, iframes, or when ?sw=off is present.
 * Follows the built-in Lovable PWA skill guardrails.
 */
export function registerAppServiceWorker() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const host = window.location.hostname;
  const inIframe = window.self !== window.top;

  const isForbidden =
    !import.meta.env.PROD ||
    inIframe ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev") ||
    url.searchParams.get("sw") === "off";

  if (isForbidden) {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) {
          const script = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
          if (script.endsWith("/sw.js")) void reg.unregister();
        }
      });
    }
    return;
  }

  try {
    registerSW({ immediate: true });
  } catch {
    /* noop */
  }
}
