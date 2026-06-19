import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Star, Crown, ChevronRight, LogOut, Languages, Settings } from "lucide-react";
import { getDashboard, getTotals, saveReminders } from "@/lib/h2go.functions";
import { createPortalSession } from "@/lib/payments.functions";
import { MobileShell } from "@/components/h2go/MobileShell";
import { levelForXp } from "@/lib/gamification";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { HydrationReminderSettings } from "@/components/h2go/HydrationReminderSettings";
import { useEffect } from "react";
import { maybePromptFirstLaunch } from "@/lib/notifications";
import { useT } from "@/i18n";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — H2GO" },
      { name: "description", content: "View your H2GO hydration stats, badges, level progress, reminders, and subscription settings." },
      { property: "og:title", content: "Your Profile — H2GO" },
      { property: "og:description", content: "View your H2GO hydration stats, badges, level progress, reminders, and subscription settings." },
      { property: "og:url", content: "https://h2go-beta.lovable.app/profile" },
    ],
    links: [{ rel: "canonical", href: "https://h2go-beta.lovable.app/profile" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { t, locale, setLocale } = useT();
  const fetchDash = useServerFn(getDashboard);
  const fetchTotals = useServerFn(getTotals);
  const save = useServerFn(saveReminders);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const { data: totals } = useQuery({ queryKey: ["totals"], queryFn: () => fetchTotals() });
  const [editReminders, setEditReminders] = useState(false);
  const [times, setTimes] = useState<string[]>([]);

  useEffect(() => {
    void maybePromptFirstLaunch();
  }, []);

  if (!data) return <MobileShell><div className="p-6 text-muted-foreground">{t("common.loading")}</div></MobileShell>;

  const xp = data.xp?.current_xp ?? 0;
  const lvl = levelForXp(xp);
  const name = data.profile?.name ?? "You";
  const streak = data.streak?.current_streak ?? 0;
  const best = data.streak?.best_streak ?? 0;
  const totalL = ((totals?.totalMl ?? 0) / 1000).toFixed(0);
  const validations = totals?.totalValidations ?? 0;
  const earned = new Set(data.userAchievements);
  const isPremium = ["active", "trialing"].includes(data.profile?.subscription_status ?? "free");

  function startEdit() {
    setTimes(data!.reminders.map((r) => (r.reminder_time as string).slice(0, 5)));
    setEditReminders(true);
  }
  async function saveTimes() {
    try {
      await save({ data: { times } });
      toast.success(t("p.remindersSaved"));
      setEditReminders(false);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-6">
        <div className="flex items-center justify-between px-5 pt-4">
          <h1 className="font-display text-2xl font-bold">{t("p.title")}</h1>
          <button onClick={signOut} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <LogOut size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="mx-4 rounded-3xl p-5 bg-gradient-to-br from-[#1E3A8A] via-primary to-secondary text-white">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl bg-white/20 border-[3px] border-white/45">🌊</div>
            <div className="flex-1">
              <p className="font-display text-2xl font-bold">{name}</p>
              <p className="text-xs text-white/80">{lvl.name}</p>
              <div className="flex items-center gap-1.5 mt-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={13} color={i <= Math.min(5, lvl.level) ? "#FDE68A" : "rgba(255,255,255,0.3)"} fill={i <= Math.min(5, lvl.level) ? "#FDE68A" : "none"} />
                ))}
                <span className="text-[11px] text-white/75 ml-1">Lvl {lvl.level}</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-white/75 mb-1.5">
              <span>{xp.toLocaleString()} XP</span>
              <span>{lvl.next.toLocaleString()} XP next</span>
            </div>
            <div className="w-full rounded-full h-2.5 bg-white/20">
              <div className="h-2.5 rounded-full bg-white/85" style={{ width: `${Math.min(100, (xp / lvl.next) * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-4">
          {[
            { label: t("p.currentStreak"), value: streak.toString(), icon: "🔥", color: "text-amber-600" },
            { label: t("p.bestStreak"), value: best.toString(), icon: "🏆", color: "text-primary" },
            { label: t("p.totalLiters"), value: `${totalL}L`, icon: "💧", color: "text-secondary" },
            { label: t("p.validations"), value: validations.toString(), icon: "📸", color: "text-emerald-600" },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-3 bg-card shadow-sm">
              <p className={`font-display text-xl font-bold ${s.color}`}>
                {s.value} <span className="text-base">{s.icon}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="px-4">
          <p className="font-display text-base font-semibold mb-2.5">{t("p.badges")}</p>
          <div className="grid grid-cols-4 gap-2.5">
            {data.achievements.map((a) => {
              const unlocked = earned.has(a.id);
              return (
                <div key={a.id} className="flex flex-col items-center gap-1">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 ${unlocked ? "bg-primary-soft border-primary-soft" : "bg-muted border-transparent opacity-40"}`}>
                    {a.badge_emoji}
                  </div>
                  <span className={`text-[9px] text-center ${unlocked ? "text-primary" : "text-muted-foreground"}`}>{a.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reminders */}
        <div className="mx-4 rounded-2xl p-4 bg-card shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="font-display text-base font-semibold">{t("p.reminders")}</p>
            {!editReminders && (
              <button onClick={startEdit} className="text-xs text-primary font-semibold">{t("p.edit")}</button>
            )}
          </div>
          {!editReminders ? (
            <div className="flex flex-wrap gap-2">
              {data.reminders.map((r) => (
                <span key={r.id} className="px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-semibold">
                  {(r.reminder_time as string).slice(0, 5)}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {times.map((time, i) => (
                <div key={i} className="flex gap-2">
                  <Input type="time" value={time} onChange={(e) => { const n = [...times]; n[i] = e.target.value; setTimes(n); }} />
                  <button onClick={() => times.length > 3 && setTimes(times.filter((_, j) => j !== i))} className="px-3 text-destructive disabled:opacity-30" disabled={times.length <= 3}>×</button>
                </div>
              ))}
              <Button variant="outline" onClick={() => times.length < 12 && setTimes([...times, "14:00"])} disabled={times.length >= 12}>{t("p.add")}</Button>
              <Button onClick={saveTimes}>{t("p.save")}</Button>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-2">{t("p.reminderHint")}</p>
        </div>

        <HydrationReminderSettings />

        {/* Language */}
        <div className="mx-4 rounded-2xl p-4 bg-card shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Languages size={16} className="text-muted-foreground" />
            <p className="font-display text-base font-semibold">{t("p.language")}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLocale("en")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold ${locale === "en" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >🇬🇧 English</button>
            <button
              onClick={() => setLocale("fr")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold ${locale === "fr" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >🇫🇷 Français</button>
          </div>
        </div>

        {/* Premium */}
        <Link to="/premium" className="mx-4 rounded-2xl p-4 flex items-center gap-3 bg-gradient-to-br from-[#1E3A8A] to-primary shadow-lg">
          <Crown size={26} color="#FDE68A" />
          <div className="flex-1">
            <p className="font-display text-base font-bold text-white">{t("p.premium")}</p>
            <p className="text-[11px] text-white/80">
              {isPremium ? t("p.premiumActive") : t("p.premiumPitch")}
            </p>
          </div>
          <ChevronRight size={18} className="text-white/60" />
        </Link>

        {isPremium && (
          <button
            onClick={async () => {
              try {
                const r = await createPortalSession({
                  data: { returnUrl: window.location.href, environment: getStripeEnvironment() },
                });
                if ("error" in r) throw new Error(r.error);
                window.open(r.url, "_blank");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to open portal");
              }
            }}
            className="mx-4 rounded-2xl p-4 flex items-center gap-3 bg-card shadow-sm"
          >
            <Settings size={20} className="text-muted-foreground" />
            <div className="flex-1 text-left">
              <p className="font-display text-sm font-semibold">{t("p.manageSub")}</p>
              <p className="text-[11px] text-muted-foreground">{t("p.manageSubHint")}</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        )}
      </div>
    </MobileShell>
  );
}
