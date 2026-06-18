import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BarChart2, Leaf, Trophy, User } from "lucide-react";

const items = [
  { to: "/home", Icon: Home, label: "Home" },
  { to: "/stats", Icon: BarChart2, label: "Stats" },
  { to: "/tree", Icon: Leaf, label: "Tree" },
  { to: "/leaderboard", Icon: Trophy, label: "League" },
  { to: "/profile", Icon: User, label: "Profile" },
] as const;

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#0D9488] flex items-center justify-center sm:p-4">
      <div className="relative flex flex-col w-full sm:w-[390px] sm:h-[844px] min-h-screen sm:min-h-0 sm:rounded-[44px] bg-background overflow-hidden shadow-2xl">
        <div className="flex-1 overflow-y-auto no-sb relative pb-2">{children}</div>
        <nav className="flex-shrink-0 px-2 pt-1 pb-1 bg-card border-t border-border">
          <div className="flex">
            {items.map(({ to, Icon, label }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-colors"
                  style={{ background: active ? "var(--primary-soft)" : "transparent" }}
                >
                  <Icon
                    size={22}
                    color={active ? "#3B82F6" : "#94A3B8"}
                    strokeWidth={active ? 2.5 : 1.5}
                  />
                  <span
                    className="text-[10px]"
                    style={{ color: active ? "#3B82F6" : "#94A3B8", fontWeight: active ? 600 : 400 }}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
