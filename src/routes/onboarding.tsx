import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Bell, Camera, Sparkles } from "lucide-react";
import { completeOnboarding } from "@/lib/h2go.functions";
import { Splash, SplashDefs } from "@/components/h2go/Splash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { uploadAvatar, resolveAvatarUrl } from "@/lib/avatar";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({ meta: [{ title: "Get started — H2GO" }] }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const submit = useServerFn(completeOnboarding);
  const { t, locale, setLocale } = useT();
  // step 0 = concept intro, 1-3 = form
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState("28");
  const [weight, setWeight] = useState("70");
  const [goal, setGoal] = useState("2500");
  const [times, setTimes] = useState<string[]>(["08:00", "12:00", "16:00", "20:00"]);
  const [busy, setBusy] = useState(false);

  // Avatar: defaults to Google/Apple photo from auth metadata; user can override or remove.
  const [avatarStored, setAvatarStored] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const meta = data.user?.user_metadata as { avatar_url?: string; picture?: string } | undefined;
      const fromOAuth = meta?.avatar_url ?? meta?.picture ?? null;
      if (fromOAuth) {
        setAvatarStored(fromOAuth);
        setAvatarPreview(fromOAuth);
      }
    });
  }, []);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = await uploadAvatar(u.user.id, file, ext === "png" || ext === "webp" ? ext : "jpg");
      setAvatarStored(path);
      const signed = await resolveAvatarUrl(path);
      setAvatarPreview(signed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePhoto() {
    setAvatarStored(null);
    setAvatarPreview(null);
  }

  const recommended = Math.round(Number(weight) * 35);
  const total = 3;

  function updateTime(i: number, v: string) {
    const next = [...times];
    next[i] = v;
    setTimes(next);
  }
  function addTime() {
    if (times.length >= 12) return;
    setTimes([...times, "14:00"]);
  }
  function removeTime(i: number) {
    if (times.length <= 3) return;
    setTimes(times.filter((_, j) => j !== i));
  }

  async function finish() {
    setBusy(true);
    try {
      await submit({
        data: {
          name,
          age: Number(age),
          weight_kg: Number(weight),
          daily_goal_ml: Number(goal),
          times,
          avatar_url: avatarStored,
        },
      });
      toast.success(t("ob.toastReady"));
      // After onboarding, check subscription and redirect accordingly
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_status, trial_ends_at")
          .eq("id", user.id)
          .maybeSingle();
        const status = profile?.subscription_status ?? "free";
        const trialEnd = profile?.trial_ends_at;
        const trialActive = status === "trialing" && trialEnd && new Date(trialEnd).getTime() > Date.now();
        const hasAccess = status === "active" || trialActive;
        navigate({ to: hasAccess ? "/home" : "/premium" });
      } else {
        navigate({ to: "/home" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("ob.toastFail"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#0D9488] p-4 flex items-center justify-center">
      <SplashDefs />
      <div className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl">
        {/* Language switch */}
        <div className="flex justify-end mb-2 gap-1 text-[11px]">
          <button
            onClick={() => setLocale("en")}
            className={`px-2 py-0.5 rounded ${locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >EN</button>
          <button
            onClick={() => setLocale("fr")}
            className={`px-2 py-0.5 rounded ${locale === "fr" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >FR</button>
        </div>

        {step === 0 ? (
          <ConceptIntro onContinue={() => setStep(1)} />
        ) : (
          <>
            <div className="flex flex-col items-center gap-2 mb-4">
              <Splash mood={step === 3 ? "excited" : "thinking"} size={70} />
              <h1 className="font-display text-2xl font-bold">{t("ob.setup")}</h1>
              <p className="text-xs text-muted-foreground">
                {t("ob.step", { current: step, total })}
              </p>
            </div>

            {step === 1 && (
              <div className="flex flex-col gap-3">
                {/* Optional avatar */}
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-primary-soft border-2 border-primary/30 flex items-center justify-center text-2xl">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span aria-hidden>🌊</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">{t("ob.photo")}</Label>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="text-xs px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-60"
                      >
                        {uploading ? t("ob.photoUploading") : t("ob.photoChange")}
                      </button>
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground font-semibold"
                        >
                          {t("ob.photoRemove")}
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onPickFile}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1">{t("ob.photoHint")}</p>

                <div>
                  <Label>{t("ob.callYou")}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("ob.yourName")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("ob.age")}</Label>
                    <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t("ob.weight")}</Label>
                    <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
                  </div>
                </div>
                <Button onClick={() => setStep(2)} disabled={!name} className="rounded-2xl h-12 mt-2">
                  {t("ob.next")}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-3">
                <Label>{t("ob.goal")}</Label>
                <Input type="number" step="100" value={goal} onChange={(e) => setGoal(e.target.value)} />
                <button onClick={() => setGoal(String(recommended))} className="text-sm text-primary text-left">
                  {t("ob.recommended", { kg: weight, ml: recommended })}
                </button>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-2xl h-12">{t("ob.back")}</Button>
                  <Button onClick={() => setStep(3)} className="flex-1 rounded-2xl h-12">{t("ob.next")}</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-3">
                <Label>{t("ob.reminders", { n: times.length })}</Label>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {times.map((time, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input type="time" value={time} onChange={(e) => updateTime(i, e.target.value)} />
                      <button
                        onClick={() => removeTime(i)}
                        disabled={times.length <= 3}
                        className="px-3 py-2 text-destructive disabled:opacity-30"
                      >×</button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" onClick={addTime} disabled={times.length >= 12} className="rounded-2xl">
                  {t("ob.addReminder")}
                </Button>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 rounded-2xl h-12">{t("ob.back")}</Button>
                  <Button onClick={finish} disabled={busy} className="flex-1 rounded-2xl h-12 bg-gradient-to-r from-primary to-secondary">
                    {busy ? "..." : t("ob.finish")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ConceptIntro({ onContinue }: { onContinue: () => void }) {
  const { t } = useT();
  const items = [
    { Icon: Bell, color: "text-amber-500", bg: "bg-amber-100", title: t("intro.s1.title"), body: t("intro.s1.body") },
    { Icon: Camera, color: "text-primary", bg: "bg-primary-soft", title: t("intro.s2.title"), body: t("intro.s2.body") },
    { Icon: Sparkles, color: "text-emerald-600", bg: "bg-emerald-100", title: t("intro.s3.title"), body: t("intro.s3.body") },
  ];
  return (
    <div className="flex flex-col items-center gap-4">
      <Splash mood="excited" size={80} />
      <h1 className="font-display text-2xl font-bold text-center">{t("intro.title")}</h1>
      <div className="flex flex-col gap-3 w-full">
        {items.map(({ Icon, color, bg, title, body }) => (
          <div key={title} className="flex gap-3 items-start">
            <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${bg}`}>
              <Icon className={color} size={20} />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground leading-snug">{body}</p>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={onContinue} className="rounded-2xl h-12 w-full bg-gradient-to-r from-primary to-secondary mt-1">
        {t("intro.continue")} →
      </Button>
    </div>
  );
}
