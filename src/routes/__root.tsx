import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { LanguageProvider } from "@/i18n";
import { Capacitor } from "@capacitor/core";

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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    let listener: { remove: () => Promise<void> | void } | undefined;

    void import("@capacitor/app").then(({ App }) => {
      if (!active) return;
      return App.addListener("appUrlOpen", async (event: { url: string }) => {
        const { url } = event;
      if (!url.startsWith("https://h2go-app.com")) return;

      // Garder ce log pendant les tests, à retirer une fois confirmé que ça fonctionne.
      console.log("[OAuth] Callback URL reçue:", url);

      try {
        const parsed = new URL(url);
        const query = parsed.hash ? parsed.hash.slice(1) : parsed.search.slice(1);
        const params = new URLSearchParams(query);

        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (!access_token || !refresh_token) {
          console.error("[OAuth] Tokens manquants dans l'URL de callback:", url);
          return;
        }

        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          console.error("[OAuth] Erreur setSession:", error.message);
          return;
        }

        window.location.href = "/home";
      } catch (e) {
        console.error("[OAuth] Erreur de parsing du callback:", e);
      }
      }).then((handle) => {
        listener = handle;
      });
    });

    return () => {
      active = false;
      void listener?.remove();
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
        <Outlet />
        <Toaster position="top-center" richColors />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
