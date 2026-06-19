import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Camera, X, Zap, Flame } from "lucide-react";
import { validatePhoto } from "@/lib/validate.functions";
import { Splash, SplashDefs } from "@/components/h2go/Splash";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/validate")({
  ssr: false,
  head: () => ({ meta: [{ title: "Snap your sip — H2GO" }] }),
  component: ValidatePage,
});

type Phase = "camera" | "analyzing" | "approved" | "rejected";

async function sha256Base64(b64: string): Promise<string> {
  const bin = atob(b64.replace(/^data:image\/\w+;base64,/, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ValidatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const submit = useServerFn(validatePhoto);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("camera");
  const [seconds, setSeconds] = useState(60);
  const [result, setResult] = useState<Awaited<ReturnType<typeof validatePhoto>> | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // start camera
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        setErrMsg("Camera access denied. Please allow camera to validate hydration.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // countdown
  useEffect(() => {
    if (phase !== "camera") return;
    if (seconds <= 0) {
      navigate({ to: "/home" });
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, phase, navigate]);

  async function shoot() {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    const canvas = document.createElement("canvas");
    const w = video.videoWidth || 720;
    const h = video.videoHeight || 720;
    canvas.width = Math.min(w, 1024);
    canvas.height = Math.min(h, 1024);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    setPhase("analyzing");
    try {
      const b64 = dataUrl.split(",")[1] ?? "";
      const hash = await sha256Base64(b64);
      const res = await submit({ data: { imageBase64: dataUrl, imageHash: hash } });
      setResult(res);
      setPhase(res.approved ? "approved" : "rejected");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Validation failed");
      setPhase("camera");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0F1E] flex flex-col text-white">
      <SplashDefs />
      {phase === "camera" && (
        <>
          <div className="flex items-center justify-between px-4 py-4">
            <button onClick={() => navigate({ to: "/home" })} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <X size={20} />
            </button>
            <span className="font-display text-base font-semibold">📸 Snap your sip</span>
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center text-sm font-bold">
              {seconds}
            </div>
          </div>

          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative w-64 h-64 rounded-3xl border-2 border-white/50 flex items-center justify-center">
              <div className="text-center px-4">
                <span className="text-4xl">💧</span>
                <p className="text-xs text-white/70 mt-2 leading-snug">
                  Show a glass, bottle, cup or flask of <b>water</b>
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
              onClick={shoot}
              disabled={!!errMsg}
              className="w-20 h-20 rounded-full bg-primary border-4 border-white flex items-center justify-center disabled:opacity-50"
              style={{ boxShadow: "0 0 0 8px rgba(59,130,246,0.3)" }}
            >
              <Camera size={30} />
            </button>
            <p className="text-xs text-white/50">Tap to capture</p>
          </div>
        </>
      )}

      {phase === "analyzing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-white/85">AI is checking your sip…</p>
          <span className="text-4xl">🔍</span>
        </div>
      )}

      {phase === "approved" && result && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-b from-[#EFF6FF] to-[#DBEAFE] text-foreground">
          <Splash mood="celebrating" size={130} />
          <h2 className="font-display text-4xl font-bold">Nice sip!</h2>
          <p className="text-muted-foreground">+{result.volume_ml} ml logged 💧</p>
          <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-100">
            <Zap size={16} className="text-emerald-700" />
            <span className="text-sm font-semibold text-emerald-800">+10 XP</span>
          </div>
          <button
            onClick={() => navigate({ to: "/home" })}
            className="mt-8 w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold"
          >
            Continue
          </button>
        </div>
      )}

      {phase === "rejected" && result && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-b from-rose-50 to-orange-50 text-foreground">
          <Splash mood="thinking" size={130} />
          <h2 className="font-display text-3xl font-bold">Hmm, not water</h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">{result.reason}</p>
          <div className="flex gap-2 mt-6 w-full max-w-xs">
            <button onClick={() => navigate({ to: "/home" })} className="flex-1 py-3 rounded-2xl border border-border bg-card">
              Later
            </button>
            <button
              onClick={() => { setResult(null); setPhase("camera"); setSeconds(60); }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
