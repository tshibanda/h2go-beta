import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Splash, SplashDefs } from "@/components/h2go/Splash";
import { Bug, Send } from "lucide-react";
import { useT } from "@/i18n";

const SUPPORT_EMAIL = "support@h2go-app.com";

export const Route = createFileRoute("/report-bug")({
  head: () => ({
    meta: [
      { title: "Report a bug — H2GO" },
      { name: "description", content: "Signaler un bug ou un problème rencontré dans l'application H2GO." },
    ],
  }),
  component: ReportBugPage,
});

function ReportBugPage() {
  const { locale } = useT();
  const fr = locale === "fr";
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const url = typeof window !== "undefined" ? window.location.href : "";
    const subject = `[H2GO Bug] ${title || (fr ? "Signalement" : "Bug report")}`;
    const body = [
      fr ? "Bonjour l'équipe H2GO," : "Hi H2GO team,",
      "",
      fr ? `Sévérité : ${severity}` : `Severity: ${severity}`,
      "",
      fr ? "— Description —" : "— Description —",
      description || "(vide)",
      "",
      fr ? "— Étapes pour reproduire —" : "— Steps to reproduce —",
      steps || "(vide)",
      "",
      "— Contexte —",
      `URL: ${url}`,
      `User-Agent: ${ua}`,
      `Locale: ${locale}`,
      "",
      fr ? "Merci !" : "Thanks!",
    ].join("\n");
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] via-primary to-secondary text-white">
      <SplashDefs />
      <main className="max-w-xl mx-auto px-5 pt-10 pb-16 flex flex-col gap-6">
        <header className="flex flex-col items-center text-center gap-3">
          <Splash mood="thinking" size={80} />
          <h1 className="font-display text-3xl font-bold leading-tight">{fr ? "Signaler un bug" : "Report a bug"}</h1>
          <p className="text-white/85 text-sm">
            {fr
              ? "Décris le problème rencontré, on s'en occupe rapidement."
              : "Describe the issue you ran into — we'll look into it quickly."}
          </p>
        </header>

        <form
          onSubmit={submit}
          className="bg-white/10 backdrop-blur rounded-3xl p-5 border border-white/15 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="title" className="text-white">
              {fr ? "Titre" : "Title"}
            </Label>
            <Input
              id="title"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={fr ? "Ex: l'écran se fige après validation" : "e.g. screen freezes after validation"}
              className="h-12 rounded-xl bg-white/15 border-white/20 text-white placeholder:text-white/55"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description" className="text-white">
              {fr ? "Description" : "Description"}
            </Label>
            <Textarea
              id="description"
              required
              maxLength={2000}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={fr ? "Ce qui s'est passé…" : "What happened…"}
              className="rounded-xl bg-white/15 border-white/20 text-white placeholder:text-white/55"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="steps" className="text-white">
              {fr ? "Étapes pour reproduire" : "Steps to reproduce"}
            </Label>
            <Textarea
              id="steps"
              maxLength={2000}
              rows={3}
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder={fr ? "1.  …\n2.  …\n3.  …" : "1.  …\n2.  …\n3.  …"}
              className="rounded-xl bg-white/15 border-white/20 text-white placeholder:text-white/55"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-white">{fr ? "Sévérité" : "Severity"}</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`h-10 rounded-xl text-sm font-semibold transition active:scale-95 ${
                    severity === s ? "bg-white text-primary" : "bg-white/10 text-white"
                  }`}
                >
                  {s === "low" && (fr ? "Faible" : "Low")}
                  {s === "medium" && (fr ? "Moyenne" : "Medium")}
                  {s === "high" && (fr ? "Élevée" : "High")}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="h-12 rounded-2xl bg-white text-primary font-bold hover:bg-white/90">
            <Bug size={16} /> <Send size={16} /> {fr ? "Envoyer par email" : "Send by email"}
          </Button>

          {/*<p className="text-[11px] text-white/65 text-center">
            {fr
              ? `Ouvre ton client mail vers ${SUPPORT_EMAIL}`
              : `Opens your mail client to ${SUPPORT_EMAIL}`}
          </p>*/}
        </form>

        <div className="text-center">
          <Link to="/profile" className="text-white/80 underline text-sm">
            ← {fr ? "Retour au profil" : "Back to profile"}
          </Link>
        </div>
      </main>
    </div>
  );
}
