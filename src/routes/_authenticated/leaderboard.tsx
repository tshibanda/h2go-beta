import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  beforeLoad: () => {
    throw redirect({ to: "/home" });
  },
  component: () => null,
});
  component: LeaderboardPage,
});

type League = "bronze" | "silver" | "gold" | "diamond";

function LeaderboardPage() {
  const { t } = useT();
  const [league, setLeague] = useState<League>("diamond");
  const fetchBoard = useServerFn(getLeaderboard);
  const { data: players = [] } = useQuery({
    queryKey: ["leaderboard", league],
    queryFn: () => fetchBoard({ data: { league } }),
  });

  const leagues: { id: League; label: string; bg: string }[] = [
    { id: "bronze", label: t("lb.bronze"), bg: "#B45309" },
    { id: "silver", label: t("lb.silver"), bg: "#64748B" },
    { id: "gold", label: t("lb.gold"), bg: "#D97706" },
    { id: "diamond", label: t("lb.diamond"), bg: "#3B82F6" },
  ];

  const podium = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-6">
        <div className="px-5 pt-4">
          <h1 className="font-display text-2xl font-bold">{t("lb.title")}</h1>
        </div>

        <div className="flex gap-2 px-4">
          {leagues.map((l) => (
            <button
              key={l.id}
              onClick={() => setLeague(l.id)}
              className="flex-1 py-1.5 rounded-full text-[10px] transition-all"
              style={{
                background: league === l.id ? l.bg : "var(--muted)",
                color: league === l.id ? "white" : "var(--muted-foreground)",
                fontWeight: league === l.id ? 600 : 400,
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        {podium.length === 3 && (
          <div className="mx-4 rounded-3xl p-4 pb-0 bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300/30">
            <div className="flex items-end justify-center gap-3">
              <PodiumStep rank={2} p={podium[1]} h={56} bg="#94A3B8" />
              <PodiumStep rank={1} p={podium[0]} h={80} bg="#F59E0B" crown />
              <PodiumStep rank={3} p={podium[2]} h={40} bg="#D97706" />
            </div>
          </div>
        )}

        <div className="mx-4 flex flex-col gap-2">
          {rest.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-3 rounded-2xl shadow-sm ${p.me ? "bg-primary-soft border-2 border-primary" : "bg-card border border-border"}`}
            >
              <span className="font-display text-base font-bold text-muted-foreground w-5 text-center">{i + 4}</span>
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-lg">{p.avatar}</div>
              <p className={`flex-1 text-sm ${p.me ? "font-bold" : "font-medium"}`}>{p.name}</p>
              <p className="font-display text-base font-bold text-primary">{p.points.toLocaleString()} XP</p>
            </div>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}

function PodiumStep({
  rank, p, h, bg, crown,
}: { rank: number; p: { name: string; avatar: string; me?: boolean }; h: number; bg: string; crown?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1" style={{ marginBottom: rank === 1 ? 0 : 8 }}>
      {crown && <Crown size={20} color="#F59E0B" />}
      <span className="text-2xl">{p.avatar}</span>
      <span className="text-xs font-semibold text-amber-900">{p.name.split(" ")[0]}</span>
      <div className="w-16 rounded-t-xl flex items-center justify-center" style={{ background: bg, height: h }}>
        <span className="font-display text-xl font-bold text-white">{rank}</span>
      </div>
    </div>
  );
}
