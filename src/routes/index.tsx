import { createFileRoute, Link } from "@tanstack/react-router";
import { Splash, SplashDefs } from "@/components/h2go/Splash";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "H2GO — Premium Hydration Coaching" },
      { name: "description", content: "Build a hydration habit with AI-verified drinks, streaks, and a growing water tree." },
      { property: "og:title", content: "H2GO — Premium Hydration Coaching" },
      { property: "og:description", content: "AI-verified water reminders, streaks, and gamified hydration." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#0D9488] text-white">
      <SplashDefs />
      <div className="max-w-md mx-auto px-6 pt-12 pb-16 flex flex-col items-center text-center gap-6">
        <Splash mood="celebrating" size={130} />
        <h1 className="font-display text-5xl font-bold leading-tight">
          Hydrate.<br/>Validate.<br/>Grow.
        </h1>
        <p className="text-white/85 text-lg">
          H2GO is your premium hydration coach. Real-photo verification, streaks,
          XP, and a living water tree that grows with every sip.
        </p>
        <div className="grid grid-cols-3 gap-3 w-full text-sm">
          <Feature emoji="📸" label="AI verified" />
          <Feature emoji="🔥" label="Streaks" />
          <Feature emoji="🌳" label="Hydration tree" />
        </div>
        <Link to="/auth" className="w-full">
          <Button className="w-full h-14 rounded-2xl bg-white text-primary font-bold text-lg hover:bg-white/90">
            Get started — free
          </Button>
        </Link>
        <p className="text-white/70 text-xs">
          7-day Premium trial. Cancel any time.
        </p>
      </div>
    </div>
  );
}

function Feature({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl py-3 px-2 flex flex-col items-center gap-1 border border-white/15">
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}
