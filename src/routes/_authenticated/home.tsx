import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, Flame, Zap, ChevronRight, Camera } from "lucide-react";
import { getDashboard } from "@/lib/h2go.functions";
import { MobileShell } from "@/components/h2go/MobileShell";
import { Splash } from "@/components/h2go/Splash";
import { WaterRing } from "@/components/h2go/WaterRing";
import { levelForXp, treeStageForLogs } from "@/lib/gamification";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — H2GO" }] }),
  component: HomePage,
});

function HomePage() {
  const fetchDash = useServerFn(getDashboard);
  const { t, locale } = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDash(),
    refetchOnWindowFocus: true,
  });

  // Request notification permission once
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Schedule next browser notification
  const reminders = data?.reminders ?? [];
  useEffect(() => {
    if (!reminders.length || typeof window === "undefined") return;
    const now = new Date();
    const upcoming = reminders
      .map((r) => {
        const [h, m] = (r.reminder_time as string).split(":").map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
        return d.getTime();
      })
      .sort((a, b) => a - b);
    const delay = upcoming[0] - now.getTime();
    if (delay < 0 || delay > 12 * 3600 * 1000) return;
    const t = setTimeout(() => {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("💧 Time for water!", {
          body: "Take a quick sip and snap a photo to keep your streak alive.",
        });
      }
    }, delay);
    return () => clearTimeout(t);
  }, [reminders]);

  if (isLoading || !data) {
    return (
      <MobileShell>
        <div className="p-6 text-muted-foreground">{t("common.loading")}</div>
      </MobileShell>
    );
  }

  const goal = data.profile?.daily_goal_ml ?? 2500;
  const remaining = Math.max(0, goal - data.todayMl);
  const xp = data.xp?.current_xp ?? 0;
  const lvl = levelForXp(xp);
  const streak = data.streak?.current_streak ?? 0;
  const now = new Date();
  const next = reminders
    .map((r) => {
      const [h, m] = (r.reminder_time as string).split(":").map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
      return { d, str: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
    })
    .sort((a, b) => a.d.getTime() - b.d.getTime())[0];
  const nextMins = next ? Math.round((next.d.getTime() - now.getTime()) / 60000) : null;
  const name = data.profile?.name ?? "friend";

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="font-display text-2xl font-bold">{locale === "fr" ? "Salut" : "Hi"} {name} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center relative">
              <Bell size={18} color="#3B82F6" />
              {streak > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border-2 border-background" />
              )}
            </button>
            <Link to="/profile" className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-gradient-to-br from-[#60A5FA] to-primary text-white">
              🌊
            </Link>
          </div>
        </div>

        {/* Main water card */}
        <div className="mx-4 rounded-3xl p-4 bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] border border-primary/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] text-muted-foreground">{locale === "fr" ? "Objectif" : "Daily goal"}</p>
              <p className="font-display text-xl font-bold">{(goal / 1000).toFixed(1)}L</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">{locale === "fr" ? "Restant" : "Remaining"}</p>
              <p className="font-display text-xl font-bold text-primary">{(remaining / 1000).toFixed(1)}L</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <WaterRing currentMl={data.todayMl} goalMl={goal} size={160} />
            <div className="flex flex-col gap-2 flex-1">
              <Splash mood={remaining === 0 ? "celebrating" : "encouraging"} size={56} />
              <div className="rounded-2xl p-3 bg-card shadow-sm">
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {remaining === 0
                    ? t("home.goalReached")
                    : locale === "fr" ? "Continue, tu fais super !" : "Keep going — you're doing great!"}
                </p>
              </div>
            </div>
          </div>

          {/* Validate button */}
          <Link to="/validate" className="mt-3 block">
            <button className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold flex items-center justify-center gap-2 shadow-md active:scale-95 transition">
              <Camera size={18} /> {t("home.validate")}
            </button>
          </Link>
        </div>

        {/* Streak + XP */}
        <div className="flex gap-3 px-4">
          <div className="flex-1 rounded-2xl p-3 flex items-center gap-2.5 bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300/40">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <Flame size={20} color="white" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-amber-900 leading-none">{streak}</p>
              <p className="text-[10px] text-amber-900">{locale === "fr" ? "jours de série" : "day streak"}</p>
            </div>
          </div>
          <div className="flex-1 rounded-2xl p-3 flex items-center gap-2.5 bg-gradient-to-br from-emerald-50 to-emerald-200 border border-emerald-300/40">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Zap size={20} color="white" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-emerald-900 leading-none">{xp.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-900">{locale === "fr" ? "XP total" : "total XP"}</p>
            </div>
          </div>
        </div>

        {/* Next reminder */}
        {next && (
          <div className="mx-4 rounded-2xl p-4 flex items-center gap-3 bg-card border shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-primary-soft flex items-center justify-center text-2xl">⏰</div>
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground">{t("home.nextReminder")}</p>
              <p className="font-display text-xl font-bold">{next.str}</p>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-primary-soft">
              <span className="text-xs text-primary font-semibold">
                {nextMins! < 60 ? (locale === "fr" ? `dans ${nextMins}min` : `in ${nextMins}m`) : (locale === "fr" ? `dans ${Math.round(nextMins! / 60)}h` : `in ${Math.round(nextMins! / 60)}h`)}
              </span>
            </div>
          </div>
        )}

        {/* Daily fact */}
        {data.fact && (
          <div className="mx-4 rounded-2xl p-4 bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-300/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🧠</span>
              <p className="text-[11px] font-semibold text-teal-800 uppercase tracking-wide">Did you know?</p>
            </div>
            <p className="text-sm text-teal-900 leading-relaxed">{data.fact.fact_text}</p>
          </div>
        )}

        {/* Level card */}
        <Link to="/profile" className="mx-4 rounded-2xl p-4 flex items-center gap-3 bg-gradient-to-br from-violet-100 to-violet-200 border border-violet-300/30">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center text-2xl">🛡️</div>
          <div className="flex-1">
            <p className="text-[11px] text-violet-800">Level {lvl.level}</p>
            <p className="font-display text-base font-bold text-violet-900">{lvl.name}</p>
          </div>
          <ChevronRight size={18} className="text-violet-700" />
        </Link>

        {/* Tree teaser */}
        <Link to="/tree" className="mx-4 rounded-2xl p-4 flex items-center gap-3 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-300/30">
          <div className="text-3xl">{treeStageForLogs(0).emoji}</div>
          <div className="flex-1">
            <p className="text-[11px] text-emerald-800">Your hydration tree</p>
            <p className="font-display text-base font-bold text-emerald-900">Watch it grow →</p>
          </div>
        </Link>
      </div>
    </MobileShell>
  );
}
