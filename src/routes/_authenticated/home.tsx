import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, Flame, Zap, ChevronRight, Camera, Thermometer, Pencil } from "lucide-react";
import { getDashboard } from "@/lib/h2go.functions";
import { sendWelcomeEmailIfNeeded } from "@/lib/welcome-email.functions";
import { setDailyGoal } from "@/lib/profile-prefs.functions";
import {
  computeGoal,
  fetchTodayWeather,
  requestPosition,
  type ActivityLevel,
  type ClimateZone,
} from "@/lib/dynamic-goal";

import { resolveAvatarUrl } from "@/lib/avatar";
import { pushWidgetSnapshot } from "@/lib/ios-widget-bridge";
import { MobileShell } from "@/components/h2go/MobileShell";
import { Splash } from "@/components/h2go/Splash";
import { WaterRing } from "@/components/h2go/WaterRing";
import { levelForXp, treeStageForLogs } from "@/lib/gamification";
import { useT } from "@/i18n";
import { LEVEL_NAMES, FACT_FR } from "@/i18n/translations";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Hydration Dashboard — H2GO" },
      {
        name: "description",
        content: "Track your daily water intake, grow your hydration tree, and keep your streak alive with H2GO.",
      },
      { property: "og:title", content: "Hydration Dashboard — H2GO" },
      {
        property: "og:description",
        content: "Track your daily water intake, grow your hydration tree, and keep your streak alive with H2GO.",
      },
      { property: "og:url", content: "https://h2go-app.com/home" },
    ],
    links: [{ rel: "canonical", href: "https://h2go-app.com/home" }],
  }),
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

  const qc = useQueryClient();
  const saveGoalFn = useServerFn(setDailyGoal);
  const [weatherBoost, setWeatherBoost] = useState<number>(0);
  const [weatherTemp, setWeatherTemp] = useState<number | null>(null);
  const [goalEditOpen, setGoalEditOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState<string>("");
  const [savingGoal, setSavingGoal] = useState(false);

  // Request notification permission when user lands on /home
  useEffect(() => {
    (async () => {
      try {
        const { isNative, maybePromptFirstLaunch } = await import("@/lib/notifications");
        if (isNative()) {
          await maybePromptFirstLaunch();
        } else if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
          await Notification.requestPermission().catch(() => {});
        }
      } catch {
        /* noop */
      }
    })();
  }, []);

  // Dynamic daily goal — adapt to weight + activity + climate + weather.
  // Runs once per day per user (server-stored last_goal_compute_date).
  useEffect(() => {
    if (!data?.profile) return;
    const p = data.profile as typeof data.profile & {
      activity_level?: string | null;
      climate_zone?: string | null;
      dynamic_goal_enabled?: boolean | null;
      last_goal_compute_date?: string | null;
    };
    if (p.dynamic_goal_enabled === false) return;
    const today = new Date().toISOString().slice(0, 10);
    if (p.last_goal_compute_date === today) return;

    void (async () => {
      const pos = await requestPosition();
      const weather = pos
        ? await fetchTodayWeather(pos.lat, pos.lon)
        : { tempMaxC: null, humidity: null };
      const res = computeGoal({
        weightKg: p.weight_kg ?? null,
        activity: (p.activity_level as ActivityLevel) ?? "moderate",
        climate: (p.climate_zone as ClimateZone) ?? "temperate",
        tempMaxC: weather.tempMaxC,
        humidity: weather.humidity,
      });
      setWeatherBoost(res.weatherBoostPct);
      setWeatherTemp(weather.tempMaxC);
      try {
        await saveGoalFn({
          data: { daily_goal_ml: res.goalMl, weather_temp_c: weather.tempMaxC },
        });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
      } catch {
        // silent — keep current goal
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.profile?.id]);

  // Send welcome email on first arrival to /home (idempotent server-side).
  const sendWelcome = useServerFn(sendWelcomeEmailIfNeeded);
  useEffect(() => {
    sendWelcome().catch(() => {});

  }, [sendWelcome]);


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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    resolveAvatarUrl(data?.profile?.avatar_url).then(setAvatarUrl);
  }, [data?.profile?.avatar_url]);

  // Push snapshot vers le Widget iOS (no-op si pas iOS / App Group non configuré)
  const todayMlForWidget = data?.todayMl ?? 0;
  const goalForWidget = data?.profile?.daily_goal_ml ?? 2500;
  useEffect(() => {
    if (!data) return;
    let nextISO: string | null = null;
    try {
      nextISO = localStorage.getItem("h2go.nextReminder");
    } catch {
      /* noop */
    }
    void pushWidgetSnapshot({
      intakeMl: todayMlForWidget,
      goalMl: goalForWidget,
      nextReminderISO: nextISO,
    });
  }, [data, todayMlForWidget, goalForWidget]);

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

  const initials = (() => {
    const src = (data.profile?.name?.trim()) || (data.profile?.email ? data.profile.email.split("@")[0] : "");
    if (!src) return "?";
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src.slice(0, 2).toUpperCase();
  })();


  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="sr-only">{t("home.dashboard")}</h1>
            <p className="font-display text-2xl font-bold" aria-hidden="true">
              {t("home.greeting")} {name} 👋
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label={t("home.viewNotifs")}
                  className="hidden w-10 h-10 rounded-full bg-primary-soft items-center justify-center relative"
                >
                  <Bell size={18} color="#3B82F6" />
                  {(next || data.fact) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border-2 border-background" />
                  )}
                </button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[88%] sm:w-[400px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{t("home.notifTitle")}</SheetTitle>
                  <SheetDescription>{t("home.viewNotifs")}</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-4">
                  {reminders.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        {t("home.notifUpcoming")}
                      </p>
                      <ul className="flex flex-col gap-2">
                        {reminders.map((r) => (
                          <li key={r.id} className="flex items-center gap-3 rounded-2xl p-3 bg-primary-soft">
                            <span className="text-xl">⏰</span>
                            <span className="font-display font-semibold">
                              {(r.reminder_time as string).slice(0, 5)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.fact && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        {t("home.notifFact")}
                      </p>
                      <div className="rounded-2xl p-3 bg-teal-50 border border-teal-200/40 text-sm text-teal-900">
                        {locale === "fr" ? (FACT_FR[data.fact.fact_text] ?? data.fact.fact_text) : data.fact.fact_text}
                      </div>
                    </div>
                  )}
                  {!reminders.length && !data.fact && (
                    <p className="text-sm text-muted-foreground">{t("home.notifEmpty")}</p>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <Link
              to="/profile"
              aria-label={t("home.viewProfile")}
              className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#60A5FA] to-primary text-white"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold">{initials}</span>
              )}
            </Link>
          </div>
        </div>

        {/* Main water card */}
        <div className="mx-4 rounded-3xl p-4 bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] border border-primary/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] text-muted-foreground">{t("home.dailyGoal")}</p>
              <div className="flex items-center gap-1.5">
                <p className="font-display text-xl font-bold">{(goal / 1000).toFixed(1)}L</p>
                <button
                  type="button"
                  aria-label={t("home.editGoal")}
                  onClick={() => {
                    setGoalDraft(String(goal));
                    setGoalEditOpen(true);
                  }}
                  className="w-6 h-6 rounded-full bg-primary-soft text-primary flex items-center justify-center active:scale-95 transition"
                >
                  <Pencil size={12} />
                </button>
              </div>
              {weatherBoost > 0 && weatherTemp != null && (
                <p className="text-[10px] text-secondary font-medium flex items-center gap-1 mt-0.5">
                  <Thermometer size={10} /> {Math.round(weatherTemp)}°C · +{weatherBoost}%
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">{t("home.remainingShort")}</p>
              <p className="font-display text-xl font-bold text-primary">{(remaining / 1000).toFixed(1)}L</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <WaterRing currentMl={data.todayMl} goalMl={goal} size={160} />
            <div className="flex flex-col gap-2 flex-1">
              <Splash mood={remaining === 0 ? "celebrating" : "encouraging"} size={56} />
              <div className="rounded-2xl p-3 bg-card shadow-sm">
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {remaining === 0 ? t("home.goalReached") : t("home.encouragement")}
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
              <p className="text-[10px] text-amber-900">{t("home.dayStreak")}</p>
            </div>
          </div>
          <div className="flex-1 rounded-2xl p-3 flex items-center gap-2.5 bg-gradient-to-br from-emerald-50 to-emerald-200 border border-emerald-300/40">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Zap size={20} color="white" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-emerald-900 leading-none">{xp.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-900">{t("home.totalXp")}</p>
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
                {nextMins! < 60
                  ? t("home.inMins", { n: nextMins! })
                  : t("home.inHours", { n: Math.round(nextMins! / 60) })}
              </span>
            </div>
          </div>
        )}

        {/* Daily fact */}
        {data.fact && (
          <div className="mx-4 rounded-2xl p-4 bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-300/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🧠</span>
              <p className="text-[11px] font-semibold text-teal-800 uppercase tracking-wide">{t("home.didYouKnow")}</p>
            </div>
            <p className="text-sm text-teal-900 leading-relaxed">
              {locale === "fr" ? (FACT_FR[data.fact.fact_text] ?? data.fact.fact_text) : data.fact.fact_text}
            </p>
          </div>
        )}

        {/* Level card */}
        <Link
          to="/profile"
          className="mx-4 rounded-2xl p-4 flex items-center gap-3 bg-gradient-to-br from-violet-100 to-violet-200 border border-violet-300/30"
        >
          <div className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center text-2xl">🛡️</div>
          <div className="flex-1">
            <p className="text-[11px] text-violet-800">{t("home.level", { n: lvl.level })}</p>
            <p className="font-display text-base font-bold text-violet-900">
              {LEVEL_NAMES[locale][lvl.name] ?? lvl.name}
            </p>
          </div>
          <ChevronRight size={18} className="text-violet-700" />
        </Link>

        {/* Tree teaser */}
        <Link
          to="/tree"
          className="mx-4 rounded-2xl p-4 flex items-center gap-3 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-300/30"
        >
          <div className="text-3xl">{treeStageForLogs(0).emoji}</div>
          <div className="flex-1">
            <p className="text-[11px] text-emerald-800">{t("home.treeTitle")}</p>
            <p className="font-display text-base font-bold text-emerald-900">{t("home.treeCta")}</p>
          </div>
        </Link>
      </div>

      <Dialog open={goalEditOpen} onOpenChange={setGoalEditOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>{t("home.editGoalTitle")}</DialogTitle>
            <DialogDescription>{t("home.editGoalDesc")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={500}
                max={6000}
                step={50}
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                className="text-lg font-semibold"
              />
              <span className="text-sm text-muted-foreground">ml</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[1500, 2000, 2500, 3000, 3500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setGoalDraft(String(preset))}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    Number(goalDraft) === preset
                      ? "bg-primary text-white border-primary"
                      : "bg-card text-primary border-primary/30"
                  }`}
                >
                  {preset} ml
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setGoalEditOpen(false)} disabled={savingGoal}>
              {t("home.cancel")}
            </Button>
            <Button
              disabled={savingGoal}
              onClick={async () => {
                const n = Math.round(Number(goalDraft));
                if (!Number.isFinite(n) || n < 500 || n > 6000) {
                  toast.error("500 – 6000 ml");
                  return;
                }
                setSavingGoal(true);
                try {
                  await saveGoalFn({ data: { daily_goal_ml: n, weather_temp_c: weatherTemp } });
                  await qc.invalidateQueries({ queryKey: ["dashboard"] });
                  setGoalEditOpen(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Error");
                } finally {
                  setSavingGoal(false);
                }
              }}
            >
              {savingGoal ? "…" : t("home.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
}
