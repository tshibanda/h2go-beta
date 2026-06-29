import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Star, Crown, ChevronRight, LogOut, Languages, Camera, Trash2, Bug, Mail, Activity, CloudSun, ShieldAlert } from "lucide-react";
import { deleteAccount } from "@/lib/account.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getDashboard, getTotals, saveReminders, updateAvatar } from "@/lib/h2go.functions";
import { setProfilePreferences } from "@/lib/profile-prefs.functions";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { MobileShell } from "@/components/h2go/MobileShell";
import { levelForXp } from "@/lib/gamification";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useEffect } from "react";
import { maybePromptFirstLaunch, scheduleHydrationRemindersAtTimes, isNative } from "@/lib/notifications";
import { scheduleAdaptiveFromUserTimes } from "@/lib/adaptive-notifications";
import { useT } from "@/i18n";
import { LoadingScreen } from "@/components/h2go/LoadingScreen";
import { LEVEL_NAMES } from "@/i18n/translations";
import { uploadAvatar, removeAvatar, resolveAvatarUrl } from "@/lib/avatar";
import { BadgeShareModal, type ShareBadge } from "@/components/h2go/BadgeShareModal";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — H2GO" },
      {
        name: "description",
        content: "View your H2GO hydration stats, badges, level progress, reminders, and subscription settings.",
      },
      { property: "og:title", content: "Your Profile — H2GO" },
      {
        property: "og:description",
        content: "View your H2GO hydration stats, badges, level progress, reminders, and subscription settings.",
      },
      { property: "og:url", content: "https://h2go-app.com/profile" },
    ],
    links: [{ rel: "canonical", href: "https://h2go-app.com/profile" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { t, locale, setLocale } = useT();
  const fetchDash = useServerFn(getDashboard);
  const fetchTotals = useServerFn(getTotals);
  const save = useServerFn(saveReminders);
  const saveAvatar = useServerFn(updateAvatar);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const { data: totals } = useQuery({ queryKey: ["totals"], queryFn: () => fetchTotals() });
  const [editReminders, setEditReminders] = useState(false);
  const [times, setTimes] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const portalUrlRef = useRef<string | null>(null);
  const portalPromiseRef = useRef<Promise<string | null> | null>(null);
  const openPortalFn = useServerFn(createPortalSession);
  const savePrefs = useServerFn(setProfilePreferences);
  const [shareBadge, setShareBadge] = useState<ShareBadge | null>(null);

  const prefetchPortal = () => {
    if (portalUrlRef.current || portalPromiseRef.current) return portalPromiseRef.current;
    portalPromiseRef.current = (async () => {
      try {
        const r = await openPortalFn({
          data: { returnUrl: window.location.href, environment: getStripeEnvironment() },
        });
        if ("error" in r) return null;
        portalUrlRef.current = r.url;
        return r.url;
      } catch {
        return null;
      } finally {
        portalPromiseRef.current = null;
      }
    })();
    return portalPromiseRef.current;
  };

  async function openBilling() {
    if (openingPortal) return;
    setOpeningPortal(true);
    try {
      const url = portalUrlRef.current ?? (await prefetchPortal());
      if (!url) {
        toast.error("Erreur");
        return;
      }
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setOpeningPortal(false);
    }
  }

  useEffect(() => {
    void maybePromptFirstLaunch();
  }, []);

  // Re-schedule notifications when reminders or app language change, so titles/bodies match locale.
  // Adaptive: ajoute des créneaux extra selon météo + activité (HealthKit si dispo).
  useEffect(() => {
    if (!isNative() || !data?.reminders?.length) return;
    const t = data.reminders.map((r) => (r.reminder_time as string).slice(0, 5));
    void scheduleAdaptiveFromUserTimes(t, locale).catch(() =>
      scheduleHydrationRemindersAtTimes(t, locale),
    );
  }, [data?.reminders, locale]);

  useEffect(() => {
    resolveAvatarUrl(data?.profile?.avatar_url).then(setAvatarUrl);
  }, [data?.profile?.avatar_url]);

  // Pre-warm the Stripe billing portal URL so the click feels instant.
  const isPremiumEarly = ["active", "trialing"].includes(
    data?.profile?.subscription_status ?? "free",
  );
  useEffect(() => {
    if (isPremiumEarly) void prefetchPortal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremiumEarly]);


  if (!data)
    return (
      <MobileShell>
        <div className="p-6 text-muted-foreground">{t("common.loading")}</div>
      </MobileShell>
    );

  const xp = data.xp?.current_xp ?? 0;
  const lvl = levelForXp(xp);
  const name = data.profile?.name ?? "You";
  const streak = data.streak?.current_streak ?? 0;
  const best = data.streak?.best_streak ?? 0;
  const totalL = ((totals?.totalMl ?? 0) / 1000).toFixed(0);
  const validations = totals?.totalValidations ?? 0;
  const earned = new Set(data.userAchievements);
  const isPremium = ["active", "trialing"].includes(data.profile?.subscription_status ?? "free");

  function startEdit() {
    setTimes(data!.reminders.map((r) => (r.reminder_time as string).slice(0, 5)));
    setEditReminders(true);
  }
  async function saveTimes() {
    try {
      await save({ data: { times } });
      toast.success(t("p.remindersSaved"));
      setEditReminders(false);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (isNative()) {
        const res = await scheduleAdaptiveFromUserTimes(times, locale).catch(async () =>
          scheduleHydrationRemindersAtTimes(times, locale),
        );
        if (res.ok) toast.success(t("notif.scheduled").replace("{n}", String(res.count)));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const callDelete = useServerFn(deleteAccount);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await callDelete();
      if ("error" in res) throw new Error(res.error);
      toast.success(
        locale === "fr" ? "Compte supprimé" : "Account deleted",
      );
      try { await supabase.auth.signOut(); } catch { /* noop */ }
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setConfirmText("");
    }
  }



  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const extRaw = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const ext = extRaw === "png" || extRaw === "webp" ? extRaw : "jpg";
      const path = await uploadAvatar(u.user.id, file, ext);
      await saveAvatar({ data: { avatar_url: path } });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onRemoveAvatar() {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) await removeAvatar(u.user.id);
      await saveAvatar({ data: { avatar_url: null } });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-6">
        <div className="flex items-center justify-between px-5 pt-4">
          <h1 className="font-display text-2xl font-bold">{t("p.title")}</h1>
          <button onClick={signOut} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <LogOut size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="mx-4 rounded-3xl p-5 bg-gradient-to-br from-[#1E3A8A] via-primary to-secondary text-white">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-4xl bg-white/20 border-[3px] border-white/45">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span aria-hidden>🌊</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white text-primary flex items-center justify-center shadow-md disabled:opacity-60"
                aria-label="Change photo"
              >
                <Camera size={14} />
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow"
                  aria-label="Remove photo"
                >
                  <Trash2 size={11} />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
            </div>
            <div className="flex-1">
              <p className="font-display text-2xl font-bold">{name}</p>
              <p className="text-xs text-white/80">{LEVEL_NAMES[locale][lvl.name] ?? lvl.name}</p>
              <div className="flex items-center gap-1.5 mt-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={13}
                    color={i <= Math.min(5, lvl.level) ? "#FDE68A" : "rgba(255,255,255,0.3)"}
                    fill={i <= Math.min(5, lvl.level) ? "#FDE68A" : "none"}
                  />
                ))}
                <span className="text-[11px] text-white/75 ml-1">Lvl {lvl.level}</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-white/75 mb-1.5">
              <span>{xp.toLocaleString()} XP</span>
              <span>{lvl.next.toLocaleString()} XP next</span>
            </div>
            <div className="w-full rounded-full h-2.5 bg-white/20">
              <div
                className="h-2.5 rounded-full bg-white/85"
                style={{ width: `${Math.min(100, (xp / lvl.next) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-4">
          {[
            { label: t("p.currentStreak"), value: streak.toString(), icon: "🔥", color: "text-amber-600" },
            { label: t("p.bestStreak"), value: best.toString(), icon: "🏆", color: "text-primary" },
            { label: t("p.totalLiters"), value: `${totalL}L`, icon: "💧", color: "text-secondary" },
            { label: t("p.validations"), value: validations.toString(), icon: "📸", color: "text-emerald-600" },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-3 bg-card shadow-sm">
              <p className={`font-display text-xl font-bold ${s.color}`}>
                {s.value} <span className="text-base">{s.icon}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="px-4">
          <p className="font-display text-base font-semibold mb-2.5">{t("p.badges")}</p>
          <div className="grid grid-cols-4 gap-2.5">
            {data.achievements.map((a) => {
              const unlocked = earned.has(a.id);
              const tKey = `ach.${a.code}.title` as Parameters<typeof t>[0];
              let label = a.title;
              try {
                const translated = t(tKey);
                if (translated && translated !== tKey) label = translated;
              } catch {
                label = a.title;
              }
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() =>
                    setShareBadge({
                      emoji: a.badge_emoji ?? "🏅",
                      title: label,
                      description: a.description ?? undefined,
                      unlocked,
                      userName: data.profile?.name ?? undefined,
                    })
                  }
                  className="flex flex-col items-center gap-1 transition-transform active:scale-95 hover:scale-105"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all ${unlocked ? "bg-primary-soft border-primary-soft" : "bg-muted border-transparent opacity-40"}`}
                  >
                    {a.badge_emoji}
                  </div>
                  <span className={`text-[9px] text-center ${unlocked ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reminders */}
        <div className="mx-4 rounded-2xl p-4 bg-card shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="font-display text-base font-semibold">{t("p.reminders")}</p>
            {!editReminders && (
              <button onClick={startEdit} className="text-xs text-primary font-semibold">
                {t("p.edit")}
              </button>
            )}
          </div>
          {!editReminders ? (
            <div className="flex flex-wrap gap-2">
              {data.reminders.map((r) => (
                <span key={r.id} className="px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-semibold">
                  {(r.reminder_time as string).slice(0, 5)}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {times.map((time, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => {
                      const n = [...times];
                      n[i] = e.target.value;
                      setTimes(n);
                    }}
                  />
                  <button
                    onClick={() => times.length > 3 && setTimes(times.filter((_, j) => j !== i))}
                    className="px-3 text-destructive disabled:opacity-30"
                    disabled={times.length <= 3}
                  >
                    ×
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => times.length < 12 && setTimes([...times, "14:00"])}
                disabled={times.length >= 12}
              >
                {t("p.add")}
              </Button>
              <Button onClick={saveTimes}>{t("p.save")}</Button>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-2">{t("p.reminderHint")}</p>
        </div>

        {/* Dynamic goal preferences */}
        {(() => {
          const p = data.profile as typeof data.profile & {
            activity_level?: string | null;
            climate_zone?: string | null;
            dynamic_goal_enabled?: boolean | null;
          } | null;
          if (!p) return null;
          const activity = (p.activity_level as "low" | "moderate" | "high") ?? "moderate";
          const climate = (p.climate_zone as "temperate" | "hot" | "tropical" | "dry" | "cold") ?? "temperate";
          const dyn = p.dynamic_goal_enabled !== false;
          const fr = locale === "fr";
          const climates: { key: typeof climate; label: string }[] = [
            { key: "temperate", label: fr ? "Tempéré" : "Temperate" },
            { key: "hot", label: fr ? "Chaud" : "Hot" },
            { key: "tropical", label: fr ? "Tropical" : "Tropical" },
            { key: "dry", label: fr ? "Sec" : "Dry" },
            { key: "cold", label: fr ? "Froid" : "Cold" },
          ];
          const updatePref = async (patch: {
            activity_level?: "low" | "moderate" | "high";
            climate_zone?: typeof climate;
            dynamic_goal_enabled?: boolean;
          }) => {
            try {
              await savePrefs({ data: patch });
              qc.invalidateQueries({ queryKey: ["dashboard"] });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Échec");
            }
          };
          return (
            <div className="mx-4 rounded-2xl p-4 bg-card shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudSun size={16} className="text-secondary" />
                  <p className="font-display text-base font-semibold">
                    {fr ? "Objectif adaptatif" : "Adaptive goal"}
                  </p>
                </div>
                <Switch checked={dyn} onCheckedChange={(v) => void updatePref({ dynamic_goal_enabled: v })} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {fr
                  ? "Ajuste ton objectif quotidien selon ton poids, ton activité, ton climat et la météo du jour."
                  : "Adjusts your daily goal from weight, activity, climate and today's weather."}
              </p>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={14} className="text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">
                    {fr ? "Activité" : "Activity"}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["low", "moderate", "high"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => void updatePref({ activity_level: a })}
                      className={`h-9 rounded-xl text-xs font-semibold transition active:scale-95 ${activity === a ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {a === "low" && (fr ? "Faible" : "Low")}
                      {a === "moderate" && (fr ? "Modérée" : "Moderate")}
                      {a === "high" && (fr ? "Élevée" : "High")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {fr ? "Climat" : "Climate"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {climates.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => void updatePref({ climate_zone: c.key })}
                      className={`px-3 h-8 rounded-full text-xs font-semibold transition active:scale-95 ${climate === c.key ? "bg-secondary text-white" : "bg-muted text-muted-foreground"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}


        {/* Language */}
        <div className="mx-4 rounded-2xl p-4 bg-card shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Languages size={16} className="text-muted-foreground" />
            <p className="font-display text-base font-semibold">{t("p.language")}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLocale("en")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold ${locale === "en" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              🇬🇧 English
            </button>
            <button
              onClick={() => setLocale("fr")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold ${locale === "fr" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              🇫🇷 Français
            </button>
          </div>
        </div>

        {/* Premium */}

        {isPremium ? (
          <button
            type="button"
            onClick={openBilling}
            onMouseEnter={() => void prefetchPortal()}
            onTouchStart={() => void prefetchPortal()}
            disabled={openingPortal}
            className="mx-4 rounded-2xl p-4 flex items-center gap-3 bg-gradient-to-br from-[#1E3A8A] to-primary shadow-lg text-left w-[calc(100%-2rem)] disabled:opacity-70"
          >
            <Crown size={26} color="#FDE68A" />
            <div className="flex-1">
              <p className="font-display text-base font-bold text-white">{t("p.premium")}</p>
              <p className="text-[11px] text-white/80">
                {openingPortal ? "…" : t("p.premiumActive")}
              </p>
            </div>
            <ChevronRight size={18} className="text-white/60" />
          </button>



        ) : (
          <Link
            to="/premium"
            className="mx-4 rounded-2xl p-4 flex items-center gap-3 bg-gradient-to-br from-[#1E3A8A] to-primary shadow-lg"
          >
            <Crown size={26} color="#FDE68A" />
            <div className="flex-1">
              <p className="font-display text-base font-bold text-white">{t("p.premium")}</p>
              <p className="text-[11px] text-white/80">{t("p.premiumPitch")}</p>
            </div>
            <ChevronRight size={18} className="text-white/60" />
          </Link>
        )}

        {/* Support links */}
        <div className="mx-4 grid grid-cols-2 gap-2">
          <Link
            to="/report-bug"
            className="rounded-2xl p-3 bg-card shadow-sm flex items-center gap-2 text-sm font-medium text-foreground hover:bg-muted/60 transition active:scale-95"
          >
            <Bug size={16} className="text-destructive" />
            {locale === "fr" ? "Signaler un bug" : "Report a bug"}
          </Link>
          <Link
            to="/contact"
            className="rounded-2xl p-3 bg-card shadow-sm flex items-center gap-2 text-sm font-medium text-foreground hover:bg-muted/60 transition active:scale-95"
          >
            <Mail size={16} className="text-primary" />
            {locale === "fr" ? "Nous contacter" : "Contact us"}
          </Link>
        </div>

        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="w-full rounded-2xl p-3 bg-destructive/10 border border-destructive/30 flex items-center justify-center gap-2 text-sm font-semibold text-destructive hover:bg-destructive/15 transition active:scale-95"
          >
            <ShieldAlert size={16} />
            {locale === "fr" ? "Supprimer mon compte" : "Delete my account"}
          </button>
        </div>

        <div className="px-4 pt-2 pb-4 text-center">
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-primary underline">
            {t("p.terms")}
          </Link>
        </div>
      </div>
      <AlertDialog open={deleteOpen} onOpenChange={(o) => { if (!deleting) { setDeleteOpen(o); if (!o) setConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {locale === "fr" ? "Supprimer définitivement votre compte ?" : "Permanently delete your account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {locale === "fr"
                ? "Cette action est irréversible. Toutes vos données (profil, hydratation, badges, statistiques) seront supprimées et votre abonnement Premium sera résilié immédiatement, sans remboursement au prorata."
                : "This action is irreversible. All your data (profile, hydration, badges, stats) will be deleted and your Premium subscription will be canceled immediately, without proration refund."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2">
            <label className="text-xs text-muted-foreground">
              {locale === "fr" ? "Tapez SUPPRIMER pour confirmer" : "Type DELETE to confirm"}
            </label>
            <Input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={locale === "fr" ? "SUPPRIMER" : "DELETE"}
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {locale === "fr" ? "Annuler" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || (confirmText.trim().toUpperCase() !== (locale === "fr" ? "SUPPRIMER" : "DELETE"))}
              onClick={(e) => { e.preventDefault(); void handleDeleteAccount(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting
                ? (locale === "fr" ? "Suppression…" : "Deleting…")
                : (locale === "fr" ? "Supprimer définitivement" : "Delete forever")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {openingPortal && (
        <LoadingScreen
          title={t("p.premium")}
          subtitle={locale === "fr" ? "Ouverture de votre espace abonnement…" : "Opening your subscription space…"}
        />
      )}
      <BadgeShareModal badge={shareBadge} onClose={() => setShareBadge(null)} />
    </MobileShell>
  );
}
