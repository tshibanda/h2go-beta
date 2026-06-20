import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BarChart2, Leaf, User } from "lucide-react";
import { useT } from "@/i18n";
import { PastDueBanner } from "./PastDueBanner";

const items = [
  { to: "/home", Icon: Home, key: "nav.home" as const },
  { to: "/stats", Icon: BarChart2, key: "nav.stats" as const },
  { to: "/tree", Icon: Leaf, key: "nav.tree" as const },
  { to: "/profile", Icon: User, key: "nav.profile" as const },
] as const;

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useT();
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#0D9488] flex items-center justify-center sm:p-4">
      <div className="relative flex flex-col w-full sm:w-[390px] h-dvh sm:h-[844px] sm:rounded-[44px] bg-background overflow-hidden shadow-2xl">
        <PastDueBanner />
        <main className="flex-1 overflow-y-auto no-sb relative pb-2">{children}</main>
        <nav className="flex-shrink-0 px-2 pt-1 pb-1 bg-card border-t border-border">
          <div className="flex">
            {items.map(({ to, Icon, key }) => {
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
                    {t(key)}
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
