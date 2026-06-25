import { useState } from "react";
import { Bell, Camera, X, Flame, Zap, Home as HomeIcon, BarChart2, Leaf, User, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaterRing } from "@/components/h2go/WaterRing";
import { Splash, SplashDefs } from "@/components/h2go/Splash";
import { useT } from "@/i18n";
import glassPhoto from "@/assets/glass-of-water.jpg";

/**
 * Onboarding carousel — 3 high-fidelity phone mockups mirroring the real app screens:
 * 1) /home with an incoming hydration notification (iOS banner)
 * 2) /validate camera capture screen with a real glass-of-water photo
 * 3) /validate approved screen with AI confirmation, volume adjuster, +10 XP
 *
 * Each mock includes an accurate iOS status bar (time, Dynamic Island, signal, wifi, battery)
 * and is fully localized (EN/FR) via existing app translation keys.
 */
export function OnboardingCarousel({ onContinue }: { onContinue: () => void }) {
  const { t } = useT();
  const [idx, setIdx] = useState(0);

  const slides = [
    { title: t("intro.s1.title"), body: t("intro.s1.body"), mock: <HomeMock /> },
    { title: t("intro.s2.title"), body: t("intro.s2.body"), mock: <CameraMock /> },
    { title: t("intro.s3.title"), body: t("intro.s3.body"), mock: <ApprovedMock /> },
  ];

  const isLast = idx === slides.length - 1;
  const current = slides[idx];

  return (
    <div className="flex flex-col items-center gap-3">
      <SplashDefs />
      <h1 className="font-display text-xl font-bold text-center">{t("intro.title")}</h1>

      {/* Phone frame */}
      <PhoneFrame>{current.mock}</PhoneFrame>

      {/* Caption */}
      <div className="text-center min-h-[64px] px-2">
        <p className="font-display font-semibold text-sm">{current.title}</p>
        <p className="text-xs text-muted-foreground leading-snug mt-1">{current.body}</p>
      </div>

      {/* Dots */}
      <div className="flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      <Button
        onClick={() => (isLast ? onContinue() : setIdx(idx + 1))}
        className="rounded-2xl h-12 w-full bg-gradient-to-r from-primary to-secondary mt-1"
      >
        {isLast ? t("intro.continue") : t("ob.next")} →
      </Button>
    </div>
  );
}

/* ============================================================
 * iPhone frame + iOS status bar
 * ============================================================ */

const PHONE_W = 240;
const PHONE_H = 488;

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative rounded-[42px] bg-black p-[6px] shadow-2xl ring-1 ring-black/20"
      style={{ width: PHONE_W, height: PHONE_H }}
    >
      {/* Side buttons */}
      <span className="absolute -left-[2px] top-20 w-[2px] h-6 rounded-l bg-neutral-700" />
      <span className="absolute -left-[2px] top-32 w-[2px] h-10 rounded-l bg-neutral-700" />
      <span className="absolute -left-[2px] top-44 w-[2px] h-10 rounded-l bg-neutral-700" />
      <span className="absolute -right-[2px] top-28 w-[2px] h-14 rounded-r bg-neutral-700" />
      <div className="relative w-full h-full rounded-[36px] overflow-hidden bg-white">
        {children}
      </div>
    </div>
  );
}

/** iOS status bar with Dynamic Island, signal, wifi, battery. */
function IOSStatusBar({ dark = false }: { dark?: boolean }) {
  const fg = dark ? "#FFFFFF" : "#0A0A0A";
  return (
    <div className="relative h-7 w-full flex items-center justify-between px-4 pt-1.5 pointer-events-none select-none">
      {/* Time */}
      <span
        className="text-[11px] font-semibold tabular-nums tracking-tight"
        style={{ color: fg, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui" }}
      >
        9:41
      </span>

      {/* Dynamic Island */}
      <div className="absolute left-1/2 -translate-x-1/2 top-1 h-[18px] w-[70px] rounded-full bg-black" />

      {/* Right cluster: signal · wifi · battery */}
      <div className="flex items-center gap-[5px]" style={{ color: fg }}>
        {/* Signal bars */}
        <svg width="15" height="10" viewBox="0 0 17 11" fill="currentColor" aria-hidden>
          <rect x="0" y="7" width="3" height="4" rx="0.6" />
          <rect x="4.5" y="5" width="3" height="6" rx="0.6" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.6" />
          <rect x="13.5" y="0" width="3" height="11" rx="0.6" />
        </svg>
        {/* Wifi */}
        <svg width="14" height="10" viewBox="0 0 16 11" fill="currentColor" aria-hidden>
          <path d="M8 11a1.4 1.4 0 1 0 0-2.8A1.4 1.4 0 0 0 8 11Z" />
          <path d="M3.6 6.6a6.2 6.2 0 0 1 8.8 0l-1.4 1.4a4.2 4.2 0 0 0-6 0L3.6 6.6Z" />
          <path d="M.8 3.8a10.1 10.1 0 0 1 14.4 0l-1.4 1.4a8.1 8.1 0 0 0-11.6 0L.8 3.8Z" />
        </svg>
        {/* Battery */}
        <svg width="22" height="10" viewBox="0 0 25 11" fill="none" aria-hidden>
          <rect x="0.5" y="0.5" width="21" height="10" rx="2.5" stroke="currentColor" opacity="0.5" />
          <rect x="22.5" y="3.5" width="1.5" height="4" rx="0.6" fill="currentColor" opacity="0.5" />
          <rect x="2" y="2" width="16" height="7" rx="1.5" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

/** Bottom nav identical in shape to MobileShell's nav. */
function BottomNav({ active }: { active: "home" | "stats" | "tree" | "profile" }) {
  const { t } = useT();
  const items = [
    { key: "home" as const, Icon: HomeIcon, label: t("nav.home") },
    { key: "stats" as const, Icon: BarChart2, label: t("nav.stats") },
    { key: "tree" as const, Icon: Leaf, label: t("nav.tree") },
    { key: "profile" as const, Icon: User, label: t("nav.profile") },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200/70 px-1 pt-1 pb-1.5">
      <div className="flex">
        {items.map(({ key, Icon, label }) => {
          const isActive = key === active;
          return (
            <div
              key={key}
              className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg"
              style={{ background: isActive ? "#DBEAFE" : "transparent" }}
            >
              <Icon
                size={14}
                color={isActive ? "#3B82F6" : "#94A3B8"}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span
                className="text-[7px]"
                style={{ color: isActive ? "#3B82F6" : "#94A3B8", fontWeight: isActive ? 600 : 400 }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      {/* iOS home indicator */}
      <div className="mx-auto mt-1 h-[3px] w-16 rounded-full bg-black/70" />
    </div>
  );
}

/* ============================================================
 * 1) Home screen + incoming iOS notification
 * ============================================================ */

function HomeMock() {
  const { t, locale } = useT();
  const dateLabel = new Date(2025, 5, 12).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="relative w-full h-full bg-background flex flex-col">
      <IOSStatusBar />

      <div className="flex-1 overflow-hidden">
        {/* Real home header */}
        <div className="flex items-center justify-between px-3 pt-2">
          <div className="min-w-0">
            <p className="text-[7px] text-muted-foreground capitalize truncate">{dateLabel}</p>
            <p className="font-display text-[11px] font-bold leading-tight">
              {t("home.greeting")} Sophie 👋
            </p>
          </div>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#60A5FA] to-primary flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
            S
          </div>
        </div>

        {/* Water card */}
        <div className="mx-2 mt-2 rounded-2xl p-2 bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] border border-primary/10">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <p className="text-[6px] text-muted-foreground leading-none">{t("home.dailyGoal")}</p>
              <p className="font-display text-[10px] font-bold leading-tight">2.5L</p>
            </div>
            <div className="text-right">
              <p className="text-[6px] text-muted-foreground leading-none">{t("home.remainingShort")}</p>
              <p className="font-display text-[10px] font-bold text-primary leading-tight">1.3L</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="scale-[0.55] origin-left -my-3 -mr-12">
              <WaterRing currentMl={1200} goalMl={2500} size={120} />
            </div>
            <div className="flex-1 flex flex-col gap-1 items-end">
              <Splash mood="encouraging" size={28} />
              <div className="rounded-lg px-1.5 py-1 bg-white shadow-sm">
                <p className="text-[6px] text-muted-foreground leading-tight">{t("home.encouragement")}</p>
              </div>
            </div>
          </div>

          <div className="mt-1.5 w-full py-1.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-[8px] font-semibold flex items-center justify-center gap-1 shadow">
            <Camera size={9} /> {t("home.validate")}
          </div>
        </div>

        {/* Streak + XP */}
        <div className="flex gap-1.5 px-2 mt-1.5">
          <div className="flex-1 rounded-xl p-1.5 flex items-center gap-1 bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300/40">
            <div className="w-5 h-5 rounded-md bg-amber-500 flex items-center justify-center">
              <Flame size={10} color="white" />
            </div>
            <div>
              <p className="font-display text-[10px] font-bold text-amber-900 leading-none">7</p>
              <p className="text-[6px] text-amber-900 leading-tight">{t("home.dayStreak")}</p>
            </div>
          </div>
          <div className="flex-1 rounded-xl p-1.5 flex items-center gap-1 bg-gradient-to-br from-emerald-50 to-emerald-200 border border-emerald-300/40">
            <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
              <Zap size={10} color="white" />
            </div>
            <div>
              <p className="font-display text-[10px] font-bold text-emerald-900 leading-none">1,240</p>
              <p className="text-[6px] text-emerald-900 leading-tight">{t("home.totalXp")}</p>
            </div>
          </div>
        </div>

        {/* Next reminder */}
        <div className="mx-2 mt-1.5 rounded-xl p-1.5 flex items-center gap-1.5 bg-white border shadow-sm">
          <div className="w-6 h-6 rounded-lg bg-primary-soft flex items-center justify-center text-[11px]">⏰</div>
          <div className="flex-1">
            <p className="text-[6px] text-muted-foreground leading-none">{t("home.nextReminder")}</p>
            <p className="font-display text-[10px] font-bold leading-tight">16:00</p>
          </div>
          <div className="px-1.5 py-0.5 rounded-full bg-primary-soft">
            <span className="text-[6px] text-primary font-semibold">
              {t("home.inMins", { n: 45 })}
            </span>
          </div>
        </div>
      </div>

      {/* iOS notification banner overlay */}
      <div className="absolute top-8 left-2 right-2 rounded-2xl bg-white/85 backdrop-blur-xl shadow-xl ring-1 ring-black/5 p-1.5 flex gap-1.5 items-start animate-in slide-in-from-top-2 fade-in duration-700">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0">
          <Bell className="text-white" size={11} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[8px] font-semibold text-slate-900 leading-tight">H2GO</p>
            <p className="text-[7px] text-slate-500 leading-tight">{t("intro.mock.notifNow")}</p>
          </div>
          <p className="text-[8px] font-semibold text-slate-800 leading-tight">{t("intro.mock.notifTitle")}</p>
          <p className="text-[7px] text-slate-600 leading-snug">{t("intro.mock.notifBody")}</p>
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}

/* ============================================================
 * 2) Validate camera screen
 * ============================================================ */

function CameraMock() {
  const { t } = useT();
  return (
    <div className="relative w-full h-full bg-[#0A0F1E] flex flex-col text-white">
      {/* Real photo as the "live" video feed */}
      <img
        src={glassPhoto}
        alt=""
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover opacity-90"
      />
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative">
        <IOSStatusBar dark />
      </div>

      {/* Header bar */}
      <div className="relative flex items-center justify-between px-2 pt-1 pb-2">
        <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
          <X size={11} />
        </div>
        <span className="font-display text-[9px] font-semibold">{t("val.header")}</span>
        <div className="w-6 h-6 rounded-full bg-destructive/30 flex items-center justify-center text-[8px] font-bold">
          48
        </div>
      </div>

      {/* Focus frame */}
      <div className="relative flex-1 flex items-center justify-center">
        <div className="w-32 h-32 rounded-2xl border-2 border-white/60 flex items-center justify-center">
          <div className="text-center px-2">
            <span className="text-xl">💧</span>
            <p className="text-[7px] text-white/80 mt-1 leading-tight">
              {t("val.frameHint")
                .split(/\*\*(.+?)\*\*/)
                .map((part, i) =>
                  i % 2 === 1 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>
                )}
            </p>
          </div>
        </div>
      </div>

      {/* Capture button */}
      <div className="relative flex flex-col items-center gap-1 pb-6 pt-2">
        <div
          className="w-11 h-11 rounded-full bg-primary border-[3px] border-white flex items-center justify-center"
          style={{ boxShadow: "0 0 0 5px rgba(59,130,246,0.3)" }}
        >
          <Camera size={16} />
        </div>
        <p className="text-[7px] text-white/60">{t("val.tapToCapture")}</p>
      </div>
    </div>
  );
}

/* ============================================================
 * 3) Validate approved (AI confirmed) screen
 * ============================================================ */

function ApprovedMock() {
  const { t } = useT();
  return (
    <div className="relative w-full h-full bg-gradient-to-b from-[#EFF6FF] to-[#DBEAFE] flex flex-col">
      <IOSStatusBar />

      <div className="flex-1 flex flex-col items-center justify-start gap-1.5 px-3 pt-2">
        <Splash mood="celebrating" size={48} />
        <h2 className="font-display text-[14px] font-bold text-slate-900 leading-tight">{t("val.approved")}</h2>
        <p className="text-[8px] text-muted-foreground text-center leading-tight">{t("val.adjustHint")}</p>

        {/* Volume card */}
        <div className="mt-1 w-full rounded-2xl bg-white/85 shadow-sm p-2 flex flex-col items-center gap-1.5">
          <span className="text-[6px] uppercase tracking-wide text-muted-foreground">{t("val.adjustLabel")}</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary-soft text-primary flex items-center justify-center">
              <Minus size={11} />
            </div>
            <div className="min-w-[60px] text-center">
              <span className="font-display text-[18px] font-bold text-primary leading-none">250</span>
              <span className="text-[9px] font-semibold text-primary/80 ml-0.5">ml</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-primary-soft text-primary flex items-center justify-center">
              <Plus size={11} />
            </div>
          </div>
          <div className="flex gap-1 flex-wrap justify-center">
            {[150, 250, 330, 500].map((preset) => (
              <div
                key={preset}
                className={`px-1.5 py-[2px] rounded-full text-[7px] font-semibold border ${
                  preset === 250
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-primary border-primary/30"
                }`}
              >
                {preset}ml
              </div>
            ))}
          </div>
        </div>

        {/* AI quote */}
        <div className="w-full rounded-xl bg-white/70 ring-1 ring-emerald-200 p-1.5">
          <p className="text-[7px] text-slate-700 italic leading-snug">{t("intro.mock.aiQuote")}</p>
        </div>

        {/* +10 XP pill */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100">
          <Zap size={9} className="text-emerald-700" />
          <span className="text-[8px] font-semibold text-emerald-800">+10 XP</span>
        </div>

        {/* Save button */}
        <div className="mt-1 w-full py-1.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-[9px] font-semibold flex items-center justify-center shadow">
          {t("val.saveContinue")}
        </div>
      </div>
    </div>
  );
}
