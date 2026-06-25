import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Home, BarChart2, Leaf, User } from "lucide-react";
import { useT } from "@/i18n";
import { PastDueBanner } from "./PastDueBanner";
import { getDashboard } from "@/lib/h2go.functions";
import { resolveAvatarUrl } from "@/lib/avatar";

const items = [
  { to: "/home", Icon: Home, key: "nav.home" as const },
  { to: "/stats", Icon: BarChart2, key: "nav.stats" as const },
  { to: "/tree", Icon: Leaf, key: "nav.tree" as const },
  { to: "/profile", Icon: User, key: "nav.profile" as const },
] as const;

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  const src = (name && name.trim()) || (email ? email.split("@")[0] : "");
  if (!src) return "?";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useT();
  const fetchDash = useServerFn(getDashboard);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const profile = data?.profile;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    resolveAvatarUrl(profile?.avatar_url).then(setAvatarUrl);
  }, [profile?.avatar_url]);
  const initials = getInitials(profile?.name, profile?.email);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#0D9488] flex items-center justify-center sm:p-4">
      <div className="relative flex flex-col w-full sm:w-[390px] h-dvh sm:h-[844px] sm:rounded-[44px] bg-background overflow-hidden shadow-2xl">
        <PastDueBanner />
        <main className="flex-1 overflow-y-auto no-sb relative pb-2">{children}</main>
        <nav className="flex-shrink-0 px-2 pt-1 pb-1 pb-safe bg-card border-t border-border">
          <div className="flex">
            {items.map(({ to, Icon, key }) => {
              const active = pathname === to;
              const isProfile = to === "/profile";
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-colors"
                  style={{ background: active ? "var(--primary-soft)" : "transparent" }}
                >
                  {isProfile ? (
                    avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="w-[22px] h-[22px] rounded-full object-cover"
                        style={{
                          boxShadow: active ? "0 0 0 2px #3B82F6" : "0 0 0 1px #CBD5E1",
                        }}
                      />
                    ) : profile ? (
                      <span
                        className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{
                          background: active ? "#3B82F6" : "#94A3B8",
                        }}
                      >
                        {initials}
                      </span>
                    ) : (
                      <Icon
                        size={22}
                        color={active ? "#3B82F6" : "#94A3B8"}
                        strokeWidth={active ? 2.5 : 1.5}
                      />
                    )
                  ) : (
                    <Icon
                      size={22}
                      color={active ? "#3B82F6" : "#94A3B8"}
                      strokeWidth={active ? 2.5 : 1.5}
                    />
                  )}
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
