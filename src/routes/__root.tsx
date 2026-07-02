import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { LanguageProvider } from "@/i18n";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function detectLocale(): "fr" | "en" {
  try {
    if (typeof window === "undefined") return "en";
    const manual = window.localStorage.getItem("h2go.locale.manual") === "true";
    const stored = window.localStorage.getItem("h2go.locale");
    if (manual && (stored === "fr" || stored === "en")) return stored;
    const langs = [
      ...(window.navigator?.languages ?? []),
      window.navigator?.language ?? "",
    ].map((l) => l.toLowerCase());
    return langs.some((l) => l.startsWith("fr")) ? "fr" : "en";
  } catch {
    return "en";
  }
}

const ERR_STRINGS = {
  fr: {
    title: "Cette page n'a pas pu se charger",
    body: "Une erreur est survenue de notre côté. Vous pouvez réessayer ou revenir à l'accueil.",
    retry: "Réessayer",
    home: "Retour à l'accueil",
  },
  en: {
    title: "This page didn't load",
    body: "Something went wrong on our end. You can try refreshing or head back home.",
    retry: "Try again",
    home: "Go home",
  },
} as const;

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  const strings = ERR_STRINGS[detectLocale()];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pt-safe pb-safe">
      <div className="max-w-md text-center animate-fade-in">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{strings.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{strings.body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {strings.retry}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {strings.home}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#3B82F6" },
      { name: "google-site-verification", content: "mUJW2_k87QngLotGkwf2ixtnvpj5vbrv42T3tEoDzeU" },
      { title: "H2GO — Premium Hydration Coaching" },
      {
        name: "description",
        content: "H2GO is a premium hydration coach: AI-verified sips, streaks, XP, and a growing water tree.",
      },
      { name: "author", content: "H2GO" },
      { property: "og:title", content: "H2GO — Premium Hydration Coaching" },
      {
        property: "og:description",
        content: "H2GO is a premium hydration coach: AI-verified sips, streaks, XP, and a growing water tree.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "H2GO — Premium Hydration Coaching" },
      {
        name: "twitter:description",
        content: "H2GO is a premium hydration coach: AI-verified sips, streaks, XP, and a growing water tree.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/PbLPqLp40jSL0dv5hV7ZjZYsGZu1/social-images/social-1781876519311-Logo_H2GO.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/PbLPqLp40jSL0dv5hV7ZjZYsGZu1/social-images/social-1781876519311-Logo_H2GO.webp",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/__l5e/assets-v1/356fdb7f-e6ea-4074-98d4-bc9db5017158/logo-h2go.png" },
      { rel: "apple-touch-icon", href: "/__l5e/assets-v1/356fdb7f-e6ea-4074-98d4-bc9db5017158/logo-h2go.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "H2GO",
          url: "https://h2go-app.com",
          description: "H2GO is a premium hydration coach: AI-verified sips, streaks, XP, and a growing water tree.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "H2GO",
          url: "https://h2go-app.com",
          logo: "https://storage.googleapis.com/gpt-engineer-file-uploads/PbLPqLp40jSL0dv5hV7ZjZYsGZu1/social-images/social-1781876519311-Logo_H2GO.webp",
          description:
            "Premium hydration coaching service that verifies real sips, builds streaks, and grows a personal water tree.",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Relay OAuth : quand SFSafariViewController charge https://h2go-app.com?code=XXX,
  // la page web relaie les paramètres vers le custom scheme com.h2go.app:// afin
  // que iOS déclenche appUrlOpen dans l'app native (les Universal Links https://
  // ne sont pas interceptés depuis SFSafariViewController lors d'une redirection serveur).
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));

    const code = searchParams.get("code");
    const access_token = hashParams.get("access_token") ?? searchParams.get("access_token");

    if (!code && !access_token) return;

    const relay = new URLSearchParams();
    if (code) {
      relay.set("code", code);
    } else {
      relay.set("access_token", access_token!);
      const refresh_token = hashParams.get("refresh_token") ?? searchParams.get("refresh_token");
      if (refresh_token) relay.set("refresh_token", refresh_token);
    }

    window.location.href = `com.h2go.app://auth-callback?${relay.toString()}`;
  }, []);

  // Intercepte les liens externes (CGU, support, etc.) pour les ouvrir dans une
  // fenêtre intégrée à l'app (Browser plugin) plutôt qu'en basculant vers Safari.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest("a");
      if (!link || !link.href) return;

      let url: URL;
      try {
        url = new URL(link.href);
      } catch {
        return;
      }

      if (url.origin === window.location.origin) return;

      e.preventDefault();
      Browser.open({ url: link.href });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Listener pour le retour OAuth natif (Google/Apple).
  // Utilise le custom scheme com.h2go.app:// qui est intercepté par iOS même
  // depuis SFSafariViewController (les Universal Links https:// ne le sont pas).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      const isOAuthCallback =
        url.startsWith("com.h2go.app://auth-callback") ||
        url.startsWith("https://h2go-app.com");
      if (!isOAuthCallback) return;

      console.log("[OAuth] Callback URL reçue:", url);

      try {
        const parsed = new URL(url);
        const searchParams = new URLSearchParams(parsed.search.slice(1));
        const hashParams = new URLSearchParams(parsed.hash.slice(1));

        // Flow PKCE (défaut Supabase v2) : code à échanger contre une session.
        const code = searchParams.get("code") ?? hashParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[OAuth] Erreur exchangeCodeForSession:", error.message);
            return;
          }
          await Browser.close();
          window.location.href = "/home";
          return;
        }

        // Flow implicite (fallback) : tokens dans le hash ou la query.
        const access_token = hashParams.get("access_token") ?? searchParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token") ?? searchParams.get("refresh_token");

        if (!access_token || !refresh_token) {
          console.error("[OAuth] Ni code ni tokens dans l'URL de callback:", url);
          return;
        }

        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          console.error("[OAuth] Erreur setSession:", error.message);
          return;
        }

        await Browser.close();
        window.location.href = "/home";
      } catch (e) {
        console.error("[OAuth] Erreur de parsing du callback:", e);
      }
    });

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <div className="motion-safe:transition-opacity animate-fade-in">
          <Outlet />
        </div>
        <Toaster position="top-center" richColors />
      </LanguageProvider>
    </QueryClientProvider>
  );
}