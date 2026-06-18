import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Check } from "lucide-react";
import { MobileShell } from "@/components/h2go/MobileShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/premium")({
  head: () => ({ meta: [{ title: "Premium — H2GO" }] }),
  component: PremiumPage,
});

const FEATURES = [
  "Unlimited reminders",
  "AI Coach: personalized goals",
  "Advanced analytics",
  "Diamond league + challenges",
  "Hydration tree boosts",
  "Exclusive badges",
];

function PremiumPage() {
  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-6">
        <div className="px-5 pt-4 flex items-center gap-2">
          <Link to="/profile" className="text-muted-foreground text-sm">← Back</Link>
        </div>
        <div className="mx-4 rounded-3xl p-6 bg-gradient-to-br from-[#1E3A8A] via-primary to-secondary text-white text-center">
          <Crown size={40} color="#FDE68A" className="mx-auto mb-2" />
          <h1 className="font-display text-3xl font-bold">H2GO Premium</h1>
          <p className="text-sm text-white/80 mt-1">7-day free trial — cancel anytime</p>
        </div>

        <div className="mx-4 rounded-2xl p-4 bg-card shadow">
          <ul className="flex flex-col gap-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="text-emerald-600" size={18} />
                <span className="text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-4 grid grid-cols-2 gap-3">
          <PlanCard title="Monthly" price="€4.99" subtitle="per month" plan="monthly" />
          <PlanCard title="Yearly" price="€39.99" subtitle="per year · save 33%" plan="yearly" highlight />
        </div>

        <p className="mx-4 text-[11px] text-muted-foreground text-center">
          Payments processed securely by Stripe. You'll be charged after your 7-day free trial.
        </p>
      </div>
    </MobileShell>
  );
}

function PlanCard({ title, price, subtitle, plan, highlight }: { title: string; price: string; subtitle: string; plan: string; highlight?: boolean }) {
  function start() {
    toast.info("Stripe checkout will be available once payments are activated for this project.");
  }
  return (
    <div className={`rounded-2xl p-4 flex flex-col gap-2 ${highlight ? "bg-gradient-to-br from-primary to-secondary text-white" : "bg-card border border-border"}`}>
      <p className="font-display text-base font-semibold">{title}</p>
      <p className="font-display text-2xl font-bold">{price}</p>
      <p className={`text-[11px] ${highlight ? "text-white/80" : "text-muted-foreground"}`}>{subtitle}</p>
      <Button onClick={start} className={`mt-2 rounded-xl ${highlight ? "bg-white text-primary hover:bg-white/90" : ""}`}>Start free trial</Button>
    </div>
  );
}
