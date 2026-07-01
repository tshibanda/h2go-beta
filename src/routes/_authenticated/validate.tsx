import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Camera, X, Zap, Minus, Plus, Droplet } from "lucide-react";
import {
  analyzeBeforePhoto,
  validateAfterPhoto,
  logManualSip,
} from "@/lib/validate-two-step.functions";
import { adjustHydrationVolume } from "@/lib/adjust-volume.functions";
import {
  scheduleSecondPhotoReminder,
  cancelSecondPhotoReminder,
} from "@/lib/notifications";
import { Splash, SplashDefs } from "@/components/h2go/Splash";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/validate")({
  ssr: false,
  head: () => ({ meta: [{ title: "Snap your sip — H2GO" }] }),
  component: ValidatePage,
});

type Phase =
  | "camera1"
  | "analyzing1"
  | "waitDrink"
  | "camera2"
  | "analyzing2"
  | "approved"
  | "rejected1"
  | "manual";

type BeforeCtx = {
  path: string;
  hash: string;
  ml: number;
};

async function sha256Base64(b64: string): Promise<string> {
  const bin = atob(b64.replace(/^data:image\/\w+;base64,/, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function ValidatePage() {
  const { t, locale } = useT();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const runBefore = useServerFn(analyzeBeforePhoto);
  const runAfter = useServerFn(validateAfterPhoto);
  const runManual = useServerFn(logManualSip);
  const adjust = useServerFn(adjustHydrationVolume);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("camera1");
  const [seconds, setSeconds] = useState(60);
  const [before, setBefore] = useState<BeforeCtx | null>(null);
  const [rejectMsg, setRejectMsg] = useState<string>("");
  const [afterAttempts, setAfterAttempts] = useState(0);
  const [result, setResult] = useState<{
    approved: boolean;
    volume_ml: number;
    log: { id: string } | null;
  } | null>(null);
  const [adjustedMl, setAdjustedMl] = useState<number>(0);
  const [manualMl, setManualMl] = useState<number>(250);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const isCameraPhase = phase === "camera1" || phase === "camera2";

  // start / restart camera whenever we're in a camera phase
  useEffect(() => {
    if (!isCameraPhase) return;
    let cancelled = false;
    async function ensureStream() {
      try {
        if (
          !streamRef.current ||
          streamRef.current.getTracks().every((tr) => tr.readyState === "ended")
        ) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((tr) => tr.stop());
            return;
          }
          streamRef.current = stream;
        }
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setErrMsg(t("val.cameraDenied"));
      }
    }
    void ensureStream();
    return () => {
      cancelled = true;
    };
  }, [phase, isCameraPhase, t]);

  // stop tracks fully on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      void cancelSecondPhotoReminder();
    };
  }, []);

  // countdown on camera1 only
  useEffect(() => {
    if (phase !== "camera1") return;
    if (seconds <= 0) {
      navigate({ to: "/home" });
      return;
    }
    const to = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(to);
  }, [seconds, phase, navigate]);

  async function capture(): Promise<{ dataUrl: string; hash: string } | null> {
    const video = videoRef.current;
    if (!video || !streamRef.current) return null;
    const canvas = document.createElement("canvas");
    const w = video.videoWidth || 720;
    const h = video.videoHeight || 720;
    canvas.width = Math.min(w, 1024);
    canvas.height = Math.min(h, 1024);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    const b64 = dataUrl.split(",")[1] ?? "";
    const hash = await sha256Base64(b64);
    return { dataUrl, hash };
  }

  async function shootBefore() {
    const shot = await capture();
    if (!shot) return;
    setPhase("analyzing1");
    try {
      const res = await runBefore({
        data: { imageBase64: shot.dataUrl, imageHash: shot.hash },
      });
      if (res.approved && res.before_photo_path) {
        setBefore({
          path: res.before_photo_path,
          hash: res.before_image_hash,
          ml: res.before_volume_ml,
        });
        setPhase("waitDrink");
        // schedule reminder in 2 minutes
        void scheduleSecondPhotoReminder(120, locale);
      } else {
        setRejectMsg(res.reason || t("val.rejectGeneric"));
        setPhase("rejected1");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("val.failed"));
      setPhase("camera1");
    }
  }

  async function shootAfter() {
    if (!before) return;
    const shot = await capture();
    if (!shot) return;
    setPhase("analyzing2");
    try {
      const res = await runAfter({
        data: {
          imageBase64: shot.dataUrl,
          imageHash: shot.hash,
          beforePhotoPath: before.path,
          beforeVolumeMl: before.ml,
          beforeImageHash: before.hash,
        },
      });
      if (res.approved && res.log) {
        void cancelSecondPhotoReminder();
        setResult({ approved: true, volume_ml: res.volume_ml, log: res.log });
        setAdjustedMl(res.volume_ml || 250);
        setPhase("approved");
        qc.invalidateQueries({ queryKey: ["dashboard"] });
      } else {
        const nextAttempts = afterAttempts + 1;
        setAfterAttempts(nextAttempts);
        setRejectMsg(res.reason || t("val.afterFailed"));
        if (nextAttempts >= 2) {
          setManualMl(before.ml > 0 ? Math.min(500, before.ml) : 250);
          setPhase("manual");
        } else {
          setPhase("camera2");
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("val.failed"));
      setPhase("camera2");
    }
  }

  async function submitManual() {
    if (!before) return;
    setSaving(true);
    try {
      const res = await runManual({
        data: {
          beforePhotoPath: before.path,
          beforeImageHash: before.hash,
          volume_ml: Math.max(50, Math.min(1500, Math.round(manualMl))),
        },
      });
      if (res.approved && res.log) {
        void cancelSecondPhotoReminder();
        qc.invalidateQueries({ queryKey: ["dashboard"] });
        toast.success(t("val.approved"));
        navigate({ to: "/home" });
      } else {
        toast.error(res.reason || t("val.failed"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("val.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0A0F1E] flex flex-col text-white transition-colors duration-300"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <SplashDefs />

      {/* ============ Camera phases (1 & 2) ============ */}
      {isCameraPhase && (
        <>
          <h1 className="sr-only">{t("val.headerSr")}</h1>
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => navigate({ to: "/home" })}
              aria-label={t("common.back")}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-transform active:scale-90"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col items-center">
              <span className="font-display text-base font-semibold">
                {phase === "camera1" ? t("val.step1Header") : t("val.step2Header")}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-white/60">
                {t("val.stepIndicator", { n: phase === "camera1" ? 1 : 2 })}
              </span>
            </div>
            {phase === "camera1" ? (
              <div
                className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center text-sm font-bold"
                aria-label={`${seconds} seconds remaining`}
              >
                {seconds}
              </div>
            ) : (
              <div className="w-10 h-10" />
            )}
          </div>

          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-black/20" />
            <div
              className={`relative w-64 h-64 rounded-3xl border-2 flex items-center justify-center transition-colors duration-300 ${
                phase === "camera2" ? "border-emerald-300/70" : "border-white/50"
              }`}
            >
              <div className="text-center px-4">
                <span className="text-4xl">
                  {phase === "camera1" ? "💧" : "🥤"}
                </span>
                <p className="text-xs text-white/80 mt-2 leading-snug">
                  {(phase === "camera1"
                    ? t("val.frameHintBefore")
                    : t("val.frameHintAfter")
                  )
                    .split(/\*\*(.+?)\*\*/)
                    .map((part, i) =>
                      i % 2 === 1 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>,
                    )}
                </p>
              </div>
            </div>
            {errMsg && (
              <div className="absolute bottom-4 left-4 right-4 bg-destructive/90 rounded-2xl p-3 text-sm">
                {errMsg}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 pb-10 pt-4">
            <button
              onClick={phase === "camera1" ? shootBefore : shootAfter}
              disabled={!!errMsg}
              className="w-20 h-20 rounded-full bg-primary border-4 border-white flex items-center justify-center disabled:opacity-50 transition-transform active:scale-95"
              style={{ boxShadow: "0 0 0 8px rgba(59,130,246,0.3)" }}
            >
              <Camera size={30} />
            </button>
            <p className="text-xs text-white/60">
              {phase === "camera1" ? t("val.tapBefore") : t("val.tapAfter")}
            </p>
            {phase === "camera2" && afterAttempts > 0 && (
              <p className="text-[11px] text-amber-200 mt-1">
                {t("val.afterAttempt", { n: afterAttempts + 1 })}
              </p>
            )}
          </div>
        </>
      )}

      {/* ============ Analyzing ============ */}
      {(phase === "analyzing1" || phase === "analyzing2") && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-white/85">{t("val.analyzing")}</p>
          <span className="text-4xl">🔍</span>
        </div>
      )}

      {/* ============ Between photos ============ */}
      {phase === "waitDrink" && before && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 bg-gradient-to-b from-[#EFF6FF] to-[#DBEAFE] text-foreground animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Splash mood="excited" size={110} />
          <h2 className="font-display text-2xl font-bold text-center">
            {t("val.waitDrinkTitle")}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs leading-snug">
            {t("val.waitDrinkBody")}
          </p>

          <div className="rounded-2xl bg-white/80 shadow-sm px-4 py-3 flex items-center gap-2">
            <Droplet size={18} className="text-primary" />
            <span className="text-sm text-slate-700">
              {t("val.beforeDetected", { ml: before.ml })}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground text-center max-w-xs">
            {t("val.reminderNote")}
          </p>

          <button
            onClick={() => {
              setAfterAttempts(0);
              setPhase("camera2");
            }}
            className="mt-2 w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold transition-transform active:scale-[0.98]"
          >
            {t("val.takeSecondPhoto")}
          </button>
        </div>
      )}

      {/* ============ Rejected first photo ============ */}
      {phase === "rejected1" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-b from-rose-50 to-orange-50 text-foreground animate-in fade-in duration-300">
          <Splash mood="thinking" size={130} />
          <h2 className="font-display text-3xl font-bold">{t("val.rejected")}</h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {rejectMsg || t("val.rejectGeneric")}
          </p>
          <div className="flex gap-2 mt-6 w-full max-w-xs">
            <button
              onClick={() => navigate({ to: "/home" })}
              className="flex-1 py-3 rounded-2xl border border-border bg-card"
            >
              {t("val.later")}
            </button>
            <button
              onClick={() => {
                setRejectMsg("");
                setPhase("camera1");
                setSeconds(60);
              }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold"
            >
              {t("val.retry")}
            </button>
          </div>
        </div>
      )}

      {/* ============ Manual fallback ============ */}
      {phase === "manual" && before && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 bg-gradient-to-b from-[#EFF6FF] to-[#DBEAFE] text-foreground animate-in fade-in duration-300">
          <Splash mood="thinking" size={90} />
          <h2 className="font-display text-2xl font-bold text-center">
            {t("val.manualTitle")}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {t("val.manualHint")}
          </p>

          <div className="w-full max-w-xs rounded-2xl bg-white/85 shadow-sm p-4 flex flex-col items-center gap-3">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setManualMl((v) => Math.max(50, v - 50))}
                className="w-11 h-11 rounded-full bg-primary-soft text-primary flex items-center justify-center active:scale-95"
                aria-label="-50 ml"
              >
                <Minus size={20} />
              </button>
              <div className="min-w-[110px] text-center">
                <span className="font-display text-3xl font-bold text-primary">
                  {manualMl}
                </span>
                <span className="text-base font-semibold text-primary/80 ml-1">
                  ml
                </span>
              </div>
              <button
                type="button"
                onClick={() => setManualMl((v) => Math.min(1500, v + 50))}
                className="w-11 h-11 rounded-full bg-primary-soft text-primary flex items-center justify-center active:scale-95"
                aria-label="+50 ml"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {[100, 150, 250, 330, 500, 750].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setManualMl(preset)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    manualMl === preset
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-primary border-primary/30"
                  }`}
                >
                  {preset}ml
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-2 w-full max-w-xs">
            <button
              onClick={() => {
                setAfterAttempts(0);
                setPhase("camera2");
              }}
              disabled={saving}
              className="flex-1 py-3 rounded-2xl border border-border bg-card font-semibold"
            >
              {t("val.retryPhoto")}
            </button>
            <button
              onClick={submitManual}
              disabled={saving}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold disabled:opacity-60"
            >
              {saving ? "…" : t("val.manualSubmit")}
            </button>
          </div>
        </div>
      )}

      {/* ============ Approved ============ */}
      {phase === "approved" && result && result.log && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-b from-[#EFF6FF] to-[#DBEAFE] text-foreground animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Splash mood="celebrating" size={110} />
          <h2 className="font-display text-3xl font-bold">{t("val.approved")}</h2>
          <p className="text-muted-foreground text-sm">{t("val.adjustHint")}</p>

          <div className="mt-2 w-full max-w-xs rounded-2xl bg-white/80 shadow-sm p-4 flex flex-col items-center gap-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("val.adjustLabel")}
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="-50 ml"
                onClick={() => setAdjustedMl((v) => Math.max(50, v - 50))}
                className="w-11 h-11 rounded-full bg-primary-soft text-primary flex items-center justify-center active:scale-95"
              >
                <Minus size={20} />
              </button>
              <div className="min-w-[110px] text-center">
                <span className="font-display text-3xl font-bold text-primary">
                  {adjustedMl}
                </span>
                <span className="text-base font-semibold text-primary/80 ml-1">
                  ml
                </span>
              </div>
              <button
                type="button"
                aria-label="+50 ml"
                onClick={() => setAdjustedMl((v) => Math.min(2000, v + 50))}
                className="w-11 h-11 rounded-full bg-primary-soft text-primary flex items-center justify-center active:scale-95"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {[150, 250, 330, 500, 750, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAdjustedMl(preset)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    adjustedMl === preset
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-primary border-primary/30"
                  }`}
                >
                  {preset}ml
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-100">
            <Zap size={16} className="text-emerald-700" />
            <span className="text-sm font-semibold text-emerald-800">+10 XP</span>
          </div>

          <button
            disabled={saving}
            onClick={async () => {
              if (!result?.log) return;
              setSaving(true);
              try {
                if (adjustedMl !== result.volume_ml) {
                  await adjust({
                    data: { logId: result.log.id, volume_ml: adjustedMl },
                  });
                  qc.invalidateQueries({ queryKey: ["dashboard"] });
                }
                navigate({ to: "/home" });
              } catch (e) {
                toast.error(e instanceof Error ? e.message : t("val.failed"));
                setSaving(false);
              }
            }}
            className="mt-4 w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold disabled:opacity-60 transition-transform active:scale-[0.98]"
          >
            {saving ? "…" : t("val.saveContinue")}
          </button>
        </div>
      )}
    </div>
  );
}
