import { Link, useRouterState } from "@tanstack/react-router";
import { useT } from "@/i18n";
import { PastDueBanner } from "./PastDueBanner";
import { Home, BarChart2, Leaf, User } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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
    <div className="h-dvh w-full overflow-hidden bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#0D9488] flex items-center justify-center pt-safe sm:p-4">
      <div className="relative flex flex-col w-full sm:w-[390px] h-full max-h-dvh sm:max-h-[844px] sm:rounded-[44px] bg-background overflow-hidden shadow-2xl">
        <PastDueBanner />
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-sb relative pb-2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        <nav className="flex-shrink-0 px-2 pt-1 pb-1 bg-card border-t border-border">
          <div className="flex">
            {items.map(({ to, Icon, key }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all active:scale-95"
                  style={{ background: active ? "var(--primary-soft)" : "transparent" }}
                >
                  <motion.div
                    initial={false}
                    animate={{ scale: active ? 1.1 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Icon
                      size={22}
                      color={active ? "#3B82F6" : "#94A3B8"}
                      strokeWidth={active ? 2.5 : 1.5}
                    />
                  </motion.div>
                  <span
                    className="text-[10px] transition-colors"
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

