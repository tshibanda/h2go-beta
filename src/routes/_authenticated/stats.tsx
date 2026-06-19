import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { getStats, getDashboard, getTotals } from "@/lib/h2go.functions";
import { MobileShell } from "@/components/h2go/MobileShell";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({ meta: [{ title: "Stats — H2GO" }] }),
  component: StatsPage,
});

function StatsPage() {
  const { t, locale } = useT();
  const fetchStats = useServerFn(getStats);
  const fetchDash = useServerFn(getDashboard);
  const fetchTotals = useServerFn(getTotals);
  const { data: logs } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats() });
  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const { data: totals } = useQuery({ queryKey: ["totals"], queryFn: () => fetchTotals() });
  const [tab, setTab] = useState<"day" | "week" | "month">("week");
  const goal = dash?.profile?.daily_goal_ml ?? 2500;

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const dailyData = useMemo(() => {
    if (!logs) return [];
    const buckets: Record<number, number> = {};
    for (const l of logs) {
      const d = new Date(l.created_at);
      if (d.toDateString() === today.toDateString()) {
        const h = d.getHours();
        buckets[h] = (buckets[h] ?? 0) + (l.volume_ml ?? 0);
      }
    }
    let acc = 0;
    return Array.from({ length: 24 }, (_, h) => {
      acc += buckets[h] ?? 0;
      return { t: `${h}h`, v: acc };
    }).filter((p) => p.t !== "0h" || acc > 0);
  }, [logs, today]);

  const weekData = useMemo(() => {
    if (!logs) return [];
    const days = locale === "fr"
      ? ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const start = new Date(today.getTime() - 6 * 86400000);
    const buckets: Record<string, number> = {};
    for (const l of logs) {
      const d = new Date(l.created_at);
      if (d >= start) {
        const k = d.toDateString();
        buckets[k] = (buckets[k] ?? 0) + (l.volume_ml ?? 0);
      }
    }
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getTime() + i * 86400000);
      return { d: days[d.getDay()], v: +((buckets[d.toDateString()] ?? 0) / 1000).toFixed(2) };
    });
  }, [logs, today, locale]);

  const monthCells = useMemo(() => {
    if (!logs) return [];
    const buckets: Record<string, number> = {};
    for (const l of logs) {
      const k = new Date(l.created_at).toDateString();
      buckets[k] = (buckets[k] ?? 0) + (l.volume_ml ?? 0);
    }
    const cells: { day: number; ok: boolean }[] = [];
    const now = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      cells.push({ day: d.getDate(), ok: (buckets[d.toDateString()] ?? 0) >= goal });
    }
    return cells;
  }, [logs, goal]);

  const completion = weekData.length ? Math.round((weekData.filter((d) => d.v >= goal / 1000).length / 7) * 100) : 0;
  const avg = weekData.length ? (weekData.reduce((a, b) => a + b.v, 0) / 7).toFixed(1) : "0";
  const streak = dash?.streak?.current_streak ?? 0;
  const totalL = ((totals?.totalMl ?? 0) / 1000).toFixed(1);

  const tabs = [
    { id: "day", label: t("stats.tab.day") },
    { id: "week", label: t("stats.tab.week") },
    { id: "month", label: t("stats.tab.month") },
  ] as const;

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-6">
        <div className="px-5 pt-4">
          <h1 className="font-display text-2xl font-bold">{t("stats.title")}</h1>
        </div>

        <div className="mx-4 flex p-1 gap-0.5 rounded-2xl bg-muted">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex-1 py-2 rounded-xl text-xs transition-all ${tab === tb.id ? "bg-card text-primary font-semibold shadow-sm" : "text-muted-foreground"}`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <div className="mx-4 rounded-3xl p-4 bg-card shadow">
          {tab === "day" && (
            <>
              <p className="font-display text-base font-semibold mb-3">
                Today — {((dash?.todayMl ?? 0) / 1000).toFixed(1)}L / {(goal / 1000).toFixed(1)}L
              </p>
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${v} ml`, "Hydration"]} />
                  <Area type="monotone" dataKey="v" stroke="#3B82F6" strokeWidth={2.5} fill="url(#areaFill)" dot={{ fill: "#3B82F6", r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
          {tab === "week" && (
            <>
              <p className="font-display text-base font-semibold mb-3">
                This week — {completion}% goals
              </p>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={weekData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }} barSize={26}>
                  <XAxis dataKey="d" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${v}L`, "Hydration"]} />
                  <ReferenceLine y={goal / 1000} stroke="#DBEAFE" strokeDasharray="4 2" strokeWidth={2} />
                  <Bar dataKey="v" radius={[8, 8, 4, 4]}>
                    {weekData.map((e, i) => (
                      <Cell key={i} fill={e.v >= goal / 1000 ? "#22C55E" : "#3B82F6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
          {tab === "month" && (
            <>
              <p className="font-display text-base font-semibold mb-3">Last 28 days</p>
              <div className="grid grid-cols-7 gap-1">
                {monthCells.map((c, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-semibold ${c.ok ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {c.day}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 px-4">
          {[
            { label: "Streak", value: streak.toString(), icon: "🔥", color: "text-amber-600" },
            { label: "Validations", value: (totals?.totalValidations ?? 0).toString(), icon: "✅", color: "text-emerald-600" },
            { label: "Avg/day", value: `${avg}L`, icon: "💧", color: "text-primary" },
          ].map((s, i) => (
            <div key={i} className="flex-1 rounded-2xl p-3 text-center bg-card shadow-sm">
              <p className={`font-display text-lg font-bold ${s.color}`}>
                {s.value}<span className="text-sm">{s.icon}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mx-4 rounded-2xl p-4 flex items-center gap-3 bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300/30">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-[11px] text-amber-900">Total consumed</p>
            <p className="font-display text-lg font-bold text-amber-900">{totalL}L lifetime</p>
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
