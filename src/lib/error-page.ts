type ErrorLocale = "fr" | "en";

const STRINGS: Record<ErrorLocale, { title: string; body: string; retry: string; home: string }> = {
  en: {
    title: "This page didn't load",
    body: "Something went wrong on our end. You can try refreshing or head back home.",
    retry: "Try again",
    home: "Go home",
  },
  fr: {
    title: "Cette page n'a pas pu se charger",
    body: "Une erreur est survenue de notre côté. Vous pouvez réessayer ou revenir à l'accueil.",
    retry: "Réessayer",
    home: "Retour à l'accueil",
  },
};

function pickLocale(input?: string | null): ErrorLocale {
  if (!input) return "en";
  const tags = input.toLowerCase().split(",").map((s) => s.trim().split(";")[0]);
  return tags.some((t) => t.startsWith("fr")) ? "fr" : "en";
}

export function renderErrorPage(localeOrHeader?: string | null): string {
  const locale = localeOrHeader === "fr" || localeOrHeader === "en"
    ? (localeOrHeader as ErrorLocale)
    : pickLocale(localeOrHeader);
  const t = STRINGS[locale];
  // Inline script re-renders text if the user's stored app locale differs
  // from the server-side guess (Accept-Language can lie behind a VPN).
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <title>${t.title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1 data-i18n="title">${t.title}</h1>
      <p data-i18n="body">${t.body}</p>
      <div class="actions">
        <button class="primary" data-i18n="retry" onclick="location.reload()">${t.retry}</button>
        <a class="secondary" data-i18n="home" href="/">${t.home}</a>
      </div>
    </div>
    <script>
      (function () {
        try {
          var STRINGS = ${JSON.stringify(STRINGS)};
          var stored = window.localStorage.getItem("h2go.locale");
          var manual = window.localStorage.getItem("h2go.locale.manual") === "true";
          var loc = (manual && (stored === "fr" || stored === "en")) ? stored : null;
          if (!loc) {
            var navs = (navigator.languages || [navigator.language || ""]).map(function (l) { return (l || "").toLowerCase(); });
            loc = navs.some(function (l) { return l.indexOf("fr") === 0; }) ? "fr" : "en";
          }
          var t = STRINGS[loc] || STRINGS.en;
          document.documentElement.lang = loc;
          document.title = t.title;
          document.querySelectorAll("[data-i18n]").forEach(function (el) {
            var k = el.getAttribute("data-i18n");
            if (t[k]) el.textContent = t[k];
          });
        } catch (e) {}
      })();
    </script>
  </body>
</html>`;
}
