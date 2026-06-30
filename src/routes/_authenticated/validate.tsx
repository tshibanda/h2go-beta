import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X, Zap, Droplet } from "lucide-react";
import { analyzeContainer, finalizeTwoStepSip } from "@/lib/validate.functions";
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
  | "camera-before"
  | "analyzing-before"
  | "drink"
  | "camera-after"
  | "analyzing-after"
  | "done"
  | "rejected";

const REMINDER_NOTIF_ID = 7500;

async function sha256Base64(b64: string): Promise<string> {
  const bin = atob(b64.replace(/^data:image\/\w+;base64,/, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function scheduleSecondPhotoReminder(title: string, body: string) {
  // Native
  try {
    const { isNative } = await import("@/lib/notifications");
    if (isNative()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      try {
        await LocalNotifications.cancel({ notifications: [{ id: REMINDER_NOTIF_ID }] });
      } catch { /* noop */ }
      try {
        const at = new Date(Date.now() + 2 * 60 * 1000);
        await LocalNotifications.schedule({
          notifications: [
            {
              id: REMINDER_NOTIF_ID,
              title,
              body,
              schedule: { at, allowWhileIdle: true },
              smallIcon: "ic_stat_icon_config_sample",
              extra: { interruptionLevel: "timeSensitive" },
            } as never,
          ],
        });
      } catch { /* noop */ }
      return;
    }
  } catch { /* noop */ }
  // Web fallback
  if (typeof window !== "undefined" && "Notification" in window) {
    const fire = () => {
      try {
        if (Notification.permission === "granted") {
          new Notification(title, { body });
        }
      } catch { /* noop */ }
    };
    const id = window.setTimeout(fire, 2 * 60 * 1000);
    (window as unknown as { __h2goSecondPhotoTimer?: number }).__h2goSecondPhotoTimer = id;
  }
}

async function cancelSecondPhotoReminder() {
  try {
    const { isNative } = await import("@/lib/notifications");
    if (isNative()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      try {
        await LocalNotifications.cancel({ notifications: [{ id: REMINDER_NOTIF_ID }] });
      } catch { /* noop */ }
      return;
    }
  } catch { /* noop */ }
  if (typeof window !== "undefined") {
    const w = window as unknown as { __h2goSecondPhotoTimer?: number };
    if (w.__h2goSecondPhotoTimer) {
      window.clearTimeout(w.__h2goSecondPhotoTimer);
      w.__h2goSecondPhotoTimer = undefined;
    }
  }
}

function ValidatePage() {
  const { t } = useT();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeContainer);
  const finalize = useServerFn(finalizeTwoStepSip);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("camera-before");
  const [seconds, setSeconds] = useState(60);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [beforeMl, setBeforeMl] = useState<number>(0);
  const [beforeHash, setBeforeHash] = useState<string>("");
  const [afterMl, setAfterMl] = useState<number>(0);
  const [consumedMl, setConsumedMl] = useState<number>(0);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const inCameraPhase = phase === "camera-before" || phase === "camera-after";

  // start camera when in a camera phase
  useEffect(() => {
    if (!inCameraPhase) return;
    let cancelled = false;
    async function ensureStream() {
      try {
        if (!streamRef.current || streamRef.current.getTracks().every((t) => t.readyState === "ended")) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
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
  }, [inCameraPhase, t]);

  // stop tracks fully on unmount + cancel reminder
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      void cancelSecondPhotoReminder();
    };
  }, []);

  // 60s countdown only on first capture
  useEffect(() => {
    if (phase !== "camera-before") return;
    if (seconds <= 0) {
      navigate({ to: "/home" });
      return;
    }
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, phase, navigate]);

  const capture = useCallback(async (): Promise<string | null> => {
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
    return canvas.toDataURL("image/jpeg", 0.82);
  }, []);

  async function shootBefore() {
    const dataUrl = await capture();
    if (!dataUrl) return;
    setPhase("analyzing-before");
    try {
      const b64 = dataUrl.split(",")[1] ?? "";
      const hash = await sha256Base64(b64);
      const res = await analyze({ data: { imageBase64: dataUrl, imageHash: hash, step: "before" } });
      if (!res.approved || res.estimated_volume_ml <= 0) {
        setRejectReason(res.reason);
        setPhase("rejected");
        return;
      }
      setBeforeMl(res.estimated_volume_ml);
      setBeforeHash(res.imageHash);
      setPhase("drink");
      // schedule 2-min reminder
      void scheduleSecondPhotoReminder(t("val.reminderTitle"), t("val.reminderBody"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("val.failed"));
      setPhase("camera-before");
    }
  }

  async function shootAfter() {
    const dataUrl = await capture();
    if (!dataUrl) return;
    setPhase("analyzing-after");
    try {
      const b64 = dataUrl.split(",")[1] ?? "";
      const hash = await sha256Base64(b64);
      if (hash === beforeHash) {
        toast.error(t("val.samePhoto"));
        setPhase("camera-after");
        return;
      }
      const res = await analyze({ data: { imageBase64: dataUrl, imageHash: hash, step: "after" } });
      if (!res.approved || !res.photoPath) {
        setRejectReason(res.reason);
        setPhase("rejected");
        return;
      }
      setAfterMl(res.estimated_volume_ml);
      setSaving(true);
      const fin = await finalize({
        data: {
          beforeMl,
          afterMl: res.estimated_volume_ml,
          beforeHash,
          afterHash: res.imageHash,
          afterPhotoPath: res.photoPath,
        },
      });
      setSaving(false);
      if (!fin.ok) {
        setRejectReason(fin.reason);
        setPhase("rejected");
        return;
      }
      setConsumedMl(fin.consumed_ml);
      await cancelSecondPhotoReminder();
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setPhase("done");
    } catch (e) {
      setSaving(false);
      toast.error(e instanceof Error ? e.message : t("val.failed"));
      setPhase("camera-after");
    }
  }

  function resetAll() {
    setBeforeMl(0);
    setBeforeHash("");
    setAfterMl(0);
    setConsumedMl(0);
    setRejectReason("");
    setSeconds(60);
    void cancelSecondPhotoReminder();
    setPhase("camera-before");
  }

  const isAnalyzing = phase === "analyzing-before" || phase === "analyzing-after";
  const headerLabel =
    phase === "camera-after" || phase === "analyzing-after" || phase === "drink"
      ? t("val.step2Header")
      : t("val.step1Header");

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0A0F1E] flex flex-col text-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <SplashDefs />

      {inCameraPhase && (
        <>
          <h1 className="sr-only">{t("val.headerSr")}</h1>
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => navigate({ to: "/home" })}
              aria-label={t("common.back")}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
            >
              <X size={20} />
            </button>
            <span className="font-display text-base font-semibold">{headerLabel}</span>
            {phase === "camera-before" ? (
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center text-sm font-bold" aria-label={`${seconds} seconds remaining`}>
                {seconds}
              </div>
            ) : (
              <div className="w-10 h-10" />
            )}
          </div>

          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative w-64 h-64 rounded-3xl border-2 border-white/50 flex items-center justify-center">
              <div className="text-center px-4">
                <span className="text-4xl">{phase === "camera-before" ? "💧" : "🥤"}</span>
                <p className="text-xs text-white/80 mt-2 leading-snug">
                  {phase === "camera-before" ? t("val.step1Hint") : t("val.step2Hint")}
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
              onClick={phase === "camera-before" ? shootBefore : shootAfter}
              disabled={!!errMsg}
              className="w-20 h-20 rounded-full bg-primary border-4 border-white flex items-center justify-center disabled:opacity-50"
              style={{ boxShadow: "0 0 0 8px rgba(59,130,246,0.3)" }}
            >
              <Camera size={30} />
            </button>
            <p className="text-xs text-white/60">{t("val.tapToCapture")}</p>
          </div>
        </>
      )}

      {isAnalyzing && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-white/85">{t("val.analyzing")}</p>
          <span className="text-4xl">🔍</span>
        </div>
      )}

      {phase === "drink" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 bg-gradient-to-b from-[#EFF6FF] to-[#DBEAFE] text-foreground">
          <Splash mood="encouraging" size={120} />
          <h2 className="font-display text-3xl font-bold text-center">{t("val.drinkTitle")}</h2>
          <div className="rounded-2xl bg-white/80 shadow-sm p-4 flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 text-primary">
              <Droplet size={18} />
              <span className="text-xs uppercase tracking-wide font-semibold">{t("val.beforeLabel")}</span>
            </div>
            <p className="font-display text-3xl font-bold text-primary">{beforeMl} ml</p>
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-xs">{t("val.drinkBody")}</p>
          <p className="text-xs text-muted-foreground/80 text-center max-w-xs">{t("val.reminderInfo")}</p>
          <button
            onClick={() => setPhase("camera-after")}
            className="mt-2 w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold active:scale-95 transition"
          >
            {t("val.tookSip")}
          </button>
          <button
            onClick={() => { void cancelSecondPhotoReminder(); navigate({ to: "/home" }); }}
            className="text-xs text-muted-foreground underline"
          >
            {t("val.later")}
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-b from-[#EFF6FF] to-[#DBEAFE] text-foreground">
          <Splash mood="celebrating" size={130} />
          <h2 className="font-display text-3xl font-bold">{t("val.approved")}</h2>
          <div className="rounded-2xl bg-white/80 shadow-sm p-4 flex flex-col items-center gap-1 min-w-[200px]">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{t("val.consumedLabel")}</span>
            <p className="font-display text-4xl font-bold text-primary">{consumedMl} ml</p>
            <p className="text-[11px] text-muted-foreground">
              {t("val.diffDetail", { before: beforeMl, after: afterMl })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-100">
            <Zap size={16} className="text-emerald-700" />
            <span className="text-sm font-semibold text-emerald-800">+10 XP</span>
          </div>
          <button
            onClick={() => navigate({ to: "/home" })}
            className="mt-4 w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold"
          >
            {t("val.continue")}
          </button>
        </div>
      )}

      {phase === "rejected" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-b from-rose-50 to-orange-50 text-foreground">
          <Splash mood="thinking" size={130} />
          <h2 className="font-display text-3xl font-bold">{t("val.rejected")}</h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {rejectReason || t("val.rejectGeneric")}
          </p>
          <div className="flex gap-2 mt-6 w-full max-w-xs">
            <button onClick={() => navigate({ to: "/home" })} className="flex-1 py-3 rounded-2xl border border-border bg-card">
              {t("val.later")}
            </button>
            <button
              onClick={resetAll}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold"
            >
              {t("val.retry")}
            </button>
          </div>
        </div>
      )}

      {saving && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-full bg-black/60 text-white text-xs">…</div>
        </div>
      )}
    </div>
  );
}
