import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Splash, SplashDefs } from "@/components/h2go/Splash";
import { Mail, Send, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/i18n";

const SUPPORT_EMAIL = "support@h2go-app.com";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — H2GO" },
      { name: "description", content: "Contacter l'équipe H2GO pour toute question ou demande de support." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { locale } = useT();
  const fr = locale === "fr";
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const mailSubject = subject || (fr ? "Contact H2GO" : "H2GO contact");
    const body = [
      fr ? "Bonjour l'équipe H2GO," : "Hi H2GO team,",
      "",
      message || "",
      "",
      `Locale: ${locale}`,
    ].join("\n");
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      mailSubject,
    )}&body=${encodeURIComponent(body)}`;
    // Try multiple strategies for max WebView/browser compatibility (iOS Capacitor, Safari, Android)
    let opened = false;
    try {
      const win = window.open(url, "_blank");
      opened = !!win;
    } catch {
      // ignored
    }
    if (!opened) {
      try {
        window.location.href = url;
        opened = true;
      } catch {
        // ignored
      }
    }
    setTimeout(() => {
      toast.message(
        fr
          ? "Si ton app mail ne s'ouvre pas, copie notre adresse ci-dessus."
          : "If your mail app doesn't open, copy our address above.",
      );
    }, 1200);
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      toast.success(fr ? "Email copié !" : "Email copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(fr ? "Impossible de copier" : "Could not copy");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] via-primary to-secondary text-white">
      <SplashDefs />
      <main className="max-w-xl mx-auto px-5 pt-10 pb-16 flex flex-col gap-6">
        <header className="flex flex-col items-center text-center gap-3">
          <Splash mood="happy" size={80} />
          <h1 className="font-display text-3xl font-bold leading-tight">
            {fr ? "Nous contacter" : "Contact us"}
          </h1>
          <p className="text-white/85 text-sm">
            {fr
              ? "Une question, une suggestion ? Écris-nous, on répond rapidement."
              : "A question, a suggestion? Drop us a message — we reply quickly."}
          </p>
        </header>

        <button
          type="button"
          onClick={copyEmail}
          className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15 flex items-center justify-between gap-3 text-left active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Mail size={20} className="shrink-0" />
            <span className="font-mono text-sm truncate">{SUPPORT_EMAIL}</span>
          </div>
          {copied ? <Check size={18} /> : <Copy size={18} className="opacity-80" />}
        </button>

        <form
          onSubmit={submit}
          className="bg-white/10 backdrop-blur rounded-3xl p-5 border border-white/15 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="subject" className="text-white">
              {fr ? "Sujet" : "Subject"}
            </Label>
            <Input
              id="subject"
              maxLength={120}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={fr ? "Ex: question sur mon abonnement" : "e.g. question about my subscription"}
              className="h-12 rounded-xl bg-white/15 border-white/20 text-white placeholder:text-white/55"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="message" className="text-white">
              Message
            </Label>
            <Textarea
              id="message"
              required
              maxLength={2000}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={fr ? "Ton message…" : "Your message…"}
              className="rounded-xl bg-white/15 border-white/20 text-white placeholder:text-white/55"
            />
          </div>

          <Button type="submit" className="h-12 rounded-2xl bg-white text-primary font-bold hover:bg-white/90">
            <Send size={16} /> {fr ? "Envoyer par email" : "Send by email"}
          </Button>
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
