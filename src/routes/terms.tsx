import { createFileRoute, Link } from "@tanstack/react-router";
import { useT } from "@/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Privacy — H2GO" },
      {
        name: "description",
        content:
          "H2GO terms of service and privacy policy: acceptable use, data we store, AI validation, subscriptions and account deletion.",
      },
      { property: "og:title", content: "Terms & Privacy — H2GO" },
      { property: "og:description", content: "H2GO terms of service and privacy policy." },
      { property: "og:url", content: "https://h2go-app.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://h2go-app.com/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { t, locale, setLocale } = useT();
  const sections: Array<[string, string]> = [
    ["terms.usageTitle", "terms.usageBody"],
    ["terms.dataTitle", "terms.dataBody"],
    ["terms.aiTitle", "terms.aiBody"],
    ["terms.subTitle", "terms.subBody"],
    ["terms.deleteTitle", "terms.deleteBody"],
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#0D9488] py-10 px-4">
      <div className="max-w-2xl mx-auto bg-card rounded-3xl p-6 sm:p-10 shadow-2xl">
        <div className="flex justify-end gap-1 text-[11px] mb-2">
          <button
            onClick={() => setLocale("en")}
            className={`px-2 py-0.5 rounded ${locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            EN
          </button>
          <button
            onClick={() => setLocale("fr")}
            className={`px-2 py-0.5 rounded ${locale === "fr" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            FR
          </button>
        </div>
        <h1 className="font-display text-3xl font-bold mb-3">{t("terms.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("terms.intro")}</p>
        <div className="flex flex-col gap-5">
          {sections.map(([title, body]) => (
            <section key={title}>
              <h2 className="font-display text-lg font-semibold mb-1">{t(title as never)}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(body as never)}</p>
            </section>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-8">{t("terms.contact")}</p>
        <p className="mt-6 text-center text-sm">
          <Link to="/profile" className="text-primary hover:underline">
            {t("common.back")}
          </Link>
        </p>
      </div>
    </div>
  );
}
