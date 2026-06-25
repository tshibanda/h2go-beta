import { useState } from "react";
import { Bell, Camera, Sparkles, Check, Flame, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaterRing } from "@/components/h2go/WaterRing";
import { Splash } from "@/components/h2go/Splash";
import { useT } from "@/i18n";

/**
 * Onboarding carousel showing 3 real-looking app screenshots inside a phone frame:
 * 1) Hydration reminder notification on the home screen
 * 2) Live camera capture of a glass of water
 * 3) AI confirmation with sip volume + reward
 */
export function OnboardingCarousel({ onContinue }: { onContinue: () => void }) {
  const { t } = useT();
  const [idx, setIdx] = useState(0);

  const slides = [
    {
      title: t("intro.s1.title"),
      body: t("intro.s1.body"),
      mock: <NotificationMock />,
    },
    {
      title: t("intro.s2.title"),
      body: t("intro.s2.body"),
      mock: <CameraMock />,
    },
    {
      title: t("intro.s3.title"),
      body: t("intro.s3.body"),
      mock: <AIResultMock />,
    },
  ];

  const isLast = idx === slides.length - 1;
  const current = slides[idx];

  return (
    <div className="flex flex-col items-center gap-3">
      <h1 className="font-display text-xl font-bold text-center">{t("intro.title")}</h1>

      {/* Phone mockup */}
      <div className="relative w-[220px] h-[440px] rounded-[36px] bg-slate-900 p-2 shadow-xl ring-1 ring-black/10">
        {/* notch */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1.5 h-4 w-20 rounded-full bg-slate-900 z-10" />
        <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-white">
          {current.mock}
        </div>
      </div>

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

      {/* CTA */}
      <Button
        onClick={() => (isLast ? onContinue() : setIdx(idx + 1))}
        className="rounded-2xl h-12 w-full bg-gradient-to-r from-primary to-secondary mt-1"
      >
        {isLast ? t("intro.continue") : t("ob.next")} →
      </Button>
    </div>
  );
}

/* ----------------------- Mock screens ----------------------- */

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[9px] font-semibold text-slate-700">
      <span>9:41</span>
      <span className="flex items-center gap-0.5">
        <span>●●●</span>
        <span>📶</span>
        <span>🔋</span>
      </span>
    </div>
  );
}

function NotificationMock() {
  return (
    <div className="relative w-full h-full bg-gradient-to-b from-sky-50 to-white">
      <StatusBar />
      {/* App header */}
      <div className="px-3 pt-1 pb-2">
        <p className="text-[10px] text-slate-500">Hi, Sophie 👋</p>
        <p className="font-display text-sm font-bold text-slate-800">Today's hydration</p>
      </div>

      {/* Water ring */}
      <div className="flex justify-center mt-1">
        <div className="scale-[0.62] origin-top">
          <WaterRing currentMl={1200} goalMl={2500} size={180} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="absolute bottom-3 left-0 right-0 px-3 flex gap-2">
        <div className="flex-1 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
          + Sip
        </div>
        <div className="flex-1 h-9 rounded-xl bg-secondary/10 flex items-center justify-center text-[10px] font-semibold text-secondary">
          History
        </div>
      </div>

      {/* Incoming notification banner */}
      <div className="absolute top-7 left-2 right-2 rounded-xl bg-white/95 backdrop-blur shadow-lg ring-1 ring-black/5 p-2 flex gap-2 items-start animate-in slide-in-from-top-2 duration-500">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0">
          <Bell className="text-white" size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold text-slate-800">H2GO</p>
            <p className="text-[8px] text-slate-400">now</p>
          </div>
          <p className="text-[9px] font-semibold text-slate-700 leading-tight">Time to hydrate 💧</p>
          <p className="text-[8px] text-slate-500 leading-tight">Snap a photo of your next sip</p>
        </div>
      </div>
    </div>
  );
}

function CameraMock() {
  return (
    <div className="relative w-full h-full bg-slate-900">
      {/* Camera viewport background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900" />

      {/* Glass of water illustration */}
      <svg
        viewBox="0 0 100 140"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28"
      >
        {/* glass outline */}
        <path
          d="M28 30 L36 115 Q50 122 64 115 L72 30 Z"
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.5"
        />
        {/* water */}
        <path
          d="M31 55 L37 113 Q50 119 63 113 L69 55 Q50 50 31 55 Z"
          fill="url(#camGrad)"
          opacity="0.85"
        />
        <ellipse cx="50" cy="55" rx="19" ry="3" fill="rgba(147,197,253,0.9)" />
        <defs>
          <linearGradient id="camGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
      </svg>

      {/* Focus frame corners */}
      {[
        "top-12 left-6 border-t-2 border-l-2",
        "top-12 right-6 border-t-2 border-r-2",
        "bottom-24 left-6 border-b-2 border-l-2",
        "bottom-24 right-6 border-b-2 border-r-2",
      ].map((c, i) => (
        <div key={i} className={`absolute w-5 h-5 border-white/80 rounded-sm ${c}`} />
      ))}

      <StatusBar />

      {/* Top instruction */}
      <div className="absolute top-6 left-0 right-0 flex justify-center">
        <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[9px] font-semibold flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Live capture · 00:48
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-black/60 backdrop-blur flex items-center justify-around px-4">
        <div className="w-7 h-7 rounded-lg bg-white/10" />
        <button className="w-12 h-12 rounded-full bg-white ring-4 ring-white/30 flex items-center justify-center">
          <Camera className="text-slate-800" size={20} />
        </button>
        <div className="w-7 h-7 rounded-lg bg-white/10" />
      </div>
    </div>
  );
}

function AIResultMock() {
  return (
    <div className="relative w-full h-full bg-gradient-to-b from-emerald-50 via-white to-sky-50">
      <StatusBar />

      <div className="px-3 mt-1 flex flex-col items-center gap-2">
        <Splash mood="celebrating" size={56} />

        {/* AI badge */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100">
          <Sparkles className="text-emerald-600" size={10} />
          <span className="text-[9px] font-bold text-emerald-700">AI verified</span>
        </div>

        {/* Volume */}
        <div className="flex items-end gap-0.5">
          <span className="font-display text-3xl font-bold text-slate-800 leading-none">+250</span>
          <span className="text-xs font-semibold text-slate-500 mb-0.5">ml</span>
        </div>

        {/* AI quote */}
        <div className="w-full rounded-xl bg-white shadow-sm ring-1 ring-black/5 p-2">
          <p className="text-[9px] text-slate-600 italic leading-tight">
            "Nice glass of fresh water 💧 Looks like a standard 250 ml tumbler — counted."
          </p>
        </div>

        {/* Rewards row */}
        <div className="w-full grid grid-cols-2 gap-1.5">
          <div className="rounded-lg bg-amber-100 p-1.5 flex items-center gap-1.5">
            <Zap className="text-amber-600" size={14} />
            <div>
              <p className="text-[8px] text-amber-700 font-semibold leading-tight">+15 XP</p>
              <p className="text-[7px] text-amber-600/80 leading-tight">Level 4</p>
            </div>
          </div>
          <div className="rounded-lg bg-orange-100 p-1.5 flex items-center gap-1.5">
            <Flame className="text-orange-600" size={14} />
            <div>
              <p className="text-[8px] text-orange-700 font-semibold leading-tight">7 day streak</p>
              <p className="text-[7px] text-orange-600/80 leading-tight">Keep going!</p>
            </div>
          </div>
        </div>

        {/* Daily progress */}
        <div className="w-full">
          <div className="flex justify-between text-[8px] text-slate-500 mb-0.5">
            <span>Today</span>
            <span className="font-semibold">1.45 L / 2.5 L</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full w-[58%] rounded-full bg-gradient-to-r from-teal-400 to-blue-500" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 right-3 h-9 rounded-xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center gap-1">
        <Check className="text-white" size={12} />
        <span className="text-[10px] font-bold text-white">Saved to journal</span>
      </div>
    </div>
  );
}
