import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Splash, SplashDefs } from "@/components/h2go/Splash";
import { Button } from "@/components/ui/button";

type Search = { token?: string };

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Se désabonner — H2GO" },
      { name: "description", content: "Gère ton abonnement aux emails H2GO." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnsubscribePage,
});

type State =
  | { kind: "loading" }
  | { kind: "ready"; email: string }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "confirming" }
  | { kind: "done"; email: string }
  | { kind: "error"; message: string };

function UnsubscribePage() {
  const { token } = useSearch({ from: "/unsubscribe" });
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.valid) {
          if (body?.used) return setState({ kind: "already" });
          return setState({ kind: "invalid" });
        }
        setState({ kind: "ready", email: body.email ?? "" });
      })
      .catch(() => setState({ kind: "invalid" }));
  }, [token]);

  async function confirm() {
    if (!token) return;
    setState({ kind: "confirming" });
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ kind: "error", message: body?.error ?? "Une erreur est survenue." });
        return;
      }
      setState({ kind: "done", email: body?.email ?? "" });
    } catch {
      setState({ kind: "error", message: "Impossible de contacter le serveur." });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#0D9488]">
      <SplashDefs />
      <div className="w-full max-w-md bg-card rounded-3xl p-8 shadow-2xl text-center">
        <div className="flex justify-center mb-3">
          <Splash mood="happy" size={64} />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Préférences email H2GO</h1>

        {state.kind === "loading" && (
          <p className="text-sm text-muted-foreground">Vérification de ton lien…</p>
        )}

        {state.kind === "ready" && (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Confirme le désabonnement pour{" "}
              <span className="font-semibold text-foreground">{state.email}</span>. Tu ne recevras
              plus aucun email de notre part.
            </p>
            <Button
              onClick={confirm}
              className="w-full rounded-2xl h-12 bg-gradient-to-r from-primary to-secondary text-white font-semibold"
            >
              Me désabonner
            </Button>
          </>
        )}

        {state.kind === "confirming" && (
          <p className="text-sm text-muted-foreground">Mise à jour en cours…</p>
        )}

        {state.kind === "done" && (
          <p className="text-sm text-muted-foreground">
            ✅ C'est fait. <span className="font-semibold text-foreground">{state.email}</span> ne
            recevra plus d'emails de H2GO.
          </p>
        )}

        {state.kind === "already" && (
          <p className="text-sm text-muted-foreground">
            Cette adresse est déjà désabonnée. Aucun email ne te sera envoyé.
          </p>
        )}

        {state.kind === "invalid" && (
          <p className="text-sm text-muted-foreground">
            Ce lien de désabonnement est invalide ou a expiré.
          </p>
        )}

        {state.kind === "error" && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
      </div>
    </div>
  );
}
