import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Splash, SplashDefs } from "@/components/h2go/Splash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useT } from "@/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Sign in — H2GO" }, { name: "description", content: "Sign in to track your hydration with H2GO." }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { t, locale, setLocale } = useT();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home" });
    });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: { name, locale },
          },
        });
        if (error) throw error;
        if (!data.session) {
          navigate({ to: "/pending-validation", search: { email } });
          return;
        }
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const msg = error.message?.toLowerCase() ?? "";
          if (msg.includes("not confirmed") || msg.includes("email not confirmed")) {
            navigate({ to: "/pending-validation", search: { email } });
            return;
          }
          throw error;
        }
        const { data: u } = await supabase.auth.getUser();
        if (u.user && !u.user.email_confirmed_at) {
          await supabase.auth.signOut();
          navigate({ to: "/pending-validation", search: { email } });
          return;
        }
        navigate({ to: "/home" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setBusy(true);
    // Web + natif (Capacitor): la WebView charge déjà https://h2go-app.com
    // donc le broker Lovable peut rediriger vers l'origine sans deep-link.
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? `${provider} sign-in failed`);
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#0D9488]">
      <SplashDefs />
      <div className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-end mb-1 gap-1 text-[11px]">
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
        <div className="flex flex-col items-center gap-2 mb-6">
          <Splash mood="happy" size={70} />
          <h1 className="font-display text-3xl font-bold">{mode === "signup" ? t("auth.signUp") : t("auth.signIn")}</h1>
          <p className="text-sm text-muted-foreground text-center">{t("auth.tagline")}</p>
        </div>

        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">{t("auth.name")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl h-12 bg-gradient-to-r from-primary to-secondary text-white font-semibold"
          >
            {busy ? "..." : mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <span className="relative bg-card px-2 text-xs text-muted-foreground left-1/2 -translate-x-1/2">
            {t("auth.or")}
          </span>
        </div>

        {/*<Button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={busy}
          variant="outline"
          className="w-full rounded-2xl h-12"
        >
          <span className="mr-2">🌐</span> {t("auth.continueGoogle")}
        </Button>*/}
        <Button
          type="button"
          onClick={() => handleOAuth("apple")}
          disabled={busy}
          variant="outline"
          className="w-full rounded-2xl h-12 mt-2 bg-black text-white hover:bg-black/90 hover:text-white border-black"
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
          </svg>
          {t("auth.continueApple")}
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-4">
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-primary font-semibold"
          >
            {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}
          </button>
        </p>
        <p className="text-center text-xs text-muted-foreground mt-4">
          <Link to="/" className="hover:underline">
            {t("common.back")}
          </Link>
        </p>
      </div>
    </div>
  );
}
