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

async function getPostAuthRedirect(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "/auth";

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded, subscription_status, trial_ends_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && !profile.onboarded) return "/onboarding";

  const status = profile?.subscription_status ?? "free";
  const trialEnd = profile?.trial_ends_at;
  const trialActive = status === "trialing" && trialEnd && new Date(trialEnd).getTime() > Date.now();

  let pastDueGrace = false;
  if (status === "past_due") {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("past_due_since")
      .eq("user_id", user.id)
      .maybeSingle();
    const since = (sub as { past_due_since?: string | null } | null)?.past_due_since;
    if (since) {
      pastDueGrace = Date.now() - new Date(since).getTime() < 3 * 86400000;
    } else {
      pastDueGrace = true;
    }
  }

  const hasAccess = status === "active" || trialActive || pastDueGrace;
  return hasAccess ? "/home" : "/premium";
}

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
      if (data.session) {
        getPostAuthRedirect().then((path) => navigate({ to: path }));
      }
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
            data: { name },
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
        const path = await getPostAuthRedirect();
        navigate({ to: path });
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
    const path = await getPostAuthRedirect();
    navigate({ to: path });
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

        <Button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={busy}
          variant="outline"
          className="w-full rounded-2xl h-12"
        >
          <span className="mr-2">🌐</span> {t("auth.continueGoogle")}
        </Button>
        <Button
          type="button"
          onClick={() => handleOAuth("apple")}
          disabled={busy}
          variant="outline"
          className="w-full rounded-2xl h-12 mt-2 bg-black text-white hover:bg-black/90 hover:text-white border-black"
        >
          <span className="mr-2"></span> {t("auth.continueApple")}
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