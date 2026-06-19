import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getTotals } from "@/lib/h2go.functions";
import { MobileShell } from "@/components/h2go/MobileShell";
import { TREE_STAGES, treeStageForLogs } from "@/lib/gamification";
import { useT } from "@/i18n";
import type { TranslationKey } from "@/i18n/translations";

export const Route = createFileRoute("/_authenticated/tree")({
  head: () => ({ meta: [{ title: "Your tree — H2GO" }] }),
  component: TreePage,
});

function TreePage() {
  const { t } = useT();
  const fetchTotals = useServerFn(getTotals);
  const { data } = useQuery({ queryKey: ["totals"], queryFn: () => fetchTotals() });
  const total = data?.totalValidations ?? 0;
  const current = treeStageForLogs(total);
  const next = TREE_STAGES[Math.min(current.stage + 1, TREE_STAGES.length - 1)];
  const progress = next.minLogs > current.minLogs
    ? Math.min(100, Math.round(((total - current.minLogs) / (next.minLogs - current.minLogs)) * 100))
    : 100;
  const stageName = (i: number) => t(`tree.stage.${i}` as TranslationKey);

  // Render markdown-style **bold** in the "did you know" line
  const dykRaw = t("tree.didYouKnow");
  const dykParts = dykRaw.split(/\*\*(.+?)\*\*/);

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-6">
        <div className="px-5 pt-4">
          <h1 className="font-display text-2xl font-bold">{t("tree.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("tree.subtitle")}</p>
        </div>

        <div className="mx-4 rounded-3xl overflow-hidden flex items-end justify-center bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-200 min-h-[260px]">
          <TreeArt stage={current.stage} />
        </div>

        <div className="mx-4 rounded-2xl p-4 bg-card shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">{current.emoji}</span>
              <div>
                <p className="font-display text-lg font-bold">{stageName(current.stage)}</p>
                <p className="text-xs text-muted-foreground">{t("tree.sips", { n: total })}</p>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-100">
              <span className="text-xs text-emerald-700 font-semibold">{t("tree.stage", { current: current.stage + 1, total: TREE_STAGES.length })}</span>
            </div>
          </div>
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="text-muted-foreground">{t("tree.toNext", { name: stageName(next.stage) })}</span>
            <span className="text-emerald-600 font-semibold">{t("tree.sipsLeft", { n: Math.max(0, next.minLogs - total) })}</span>
          </div>
          <div className="w-full rounded-full h-3 bg-emerald-50">
            <div className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="px-4">
          <p className="font-display text-base font-semibold mb-2.5">{t("tree.growthStages")}</p>
          <div className="flex gap-2">
            {TREE_STAGES.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl border-2 ${i === current.stage ? "border-emerald-500" : "border-transparent"}`}
                  style={{
                    background: i < current.stage ? "#D1FAE5" : i === current.stage ? "#DCFCE7" : "#F1F5F9",
                    opacity: i > current.stage ? 0.45 : 1,
                  }}
                >
                  {s.emoji}
                </div>
                <span className={`text-[8px] text-center ${i <= current.stage ? "text-emerald-700" : "text-muted-foreground"}`}>
                  {stageName(i).split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-4 rounded-2xl p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-300/30">
          <p className="text-xs text-emerald-900 leading-relaxed">
            {dykParts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>))}
          </p>
        </div>
      </div>
    </MobileShell>
  );
}

function TreeArt({ stage }: { stage: number }) {
  const canopySize = 18 + stage * 10;
  return (
    <svg width="280" height="220" viewBox="0 0 280 220" fill="none">
      <ellipse cx="140" cy="208" rx="82" ry="11" fill="#16A34A" opacity="0.22" />
      {stage >= 1 && <rect x="127" y={Math.max(60, 138 - stage * 6)} width="26" height={75 + stage * 6} rx="7" fill="#92400E" />}
      {stage >= 2 && <ellipse cx="140" cy={128 - stage * 4} rx={canopySize + 30} ry={canopySize + 22} fill="#15803D" />}
      {stage >= 2 && <ellipse cx="140" cy={106 - stage * 4} rx={canopySize + 18} ry={canopySize + 12} fill="#16A34A" />}
      {stage >= 1 && <ellipse cx="140" cy={88 - stage * 4} rx={canopySize + 6} ry={canopySize} fill="#22C55E" />}
      {stage >= 0 && <ellipse cx="140" cy={72 - stage * 4} rx={Math.max(18, canopySize - 8)} ry={Math.max(14, canopySize - 10)} fill="#4ADE80" />}
      {stage === 0 && <path d="M137 200 Q140 180 143 200 Z" fill="#16A34A" />}
      {stage >= 4 && [[96, 130], [174, 120], [116, 150]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#F472B6" />
      ))}
      <circle cx="234" cy="36" r="18" fill="#FCD34D" />
      <ellipse cx="46" cy="34" rx="22" ry="12" fill="white" opacity="0.82" />
    </svg>
  );
}
