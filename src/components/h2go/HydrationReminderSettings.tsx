import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useT } from "@/i18n";
import {
  DEFAULT_CONFIG,
  isNative,
  loadConfig,
  saveConfig,
  scheduleHydrationReminders,
  cancelAllHydrationReminders,
  requestNotificationPermission,
  type ReminderConfig,
} from "@/lib/notifications";

export function HydrationReminderSettings() {
  const { t, locale } = useT();
  const [cfg, setCfg] = useState<ReminderConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const native = isNative();

  useEffect(() => {
    setCfg(loadConfig());
  }, []);

  function update<K extends keyof ReminderConfig>(key: K, value: ReminderConfig[K]) {
    setCfg((c) => ({ ...c, [key]: value }));
  }

  async function save() {
    saveConfig(cfg);
    if (!native) {
      toast.success(t("notif.savedWeb"));
      return;
    }
    setSaving(true);
    const res = await scheduleHydrationReminders(cfg, locale);
    setSaving(false);
    if (res.ok) toast.success(t("notif.scheduled").replace("{n}", String(res.count)));
    else if (res.reason === "permission-denied") toast.error(t("notif.permDenied"));
    else toast.error(t("notif.scheduleFailed"));
  }

  async function disable() {
    await cancelAllHydrationReminders();
    toast.success(t("notif.disabled"));
  }

  async function askPerm() {
    const ok = await requestNotificationPermission();
    if (ok) toast.success(t("notif.permGranted"));
    else toast.error(t("notif.permDenied"));
  }

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="mx-4 rounded-2xl p-4 bg-card shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Bell size={16} className="text-muted-foreground" />
        <p className="font-display text-base font-semibold">{t("notif.title")}</p>
      </div>

      {!native && (
        <p className="text-[11px] text-muted-foreground mb-3">{t("notif.webHint")}</p>
      )}

      <div className="flex flex-col gap-3">
        <label className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("notif.interval")}</span>
          <select
            className="rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold"
            value={cfg.intervalHours}
            onChange={(e) => update("intervalHours", Number(e.target.value))}
          >
            {[1, 2, 3, 4].map((h) => (
              <option key={h} value={h}>
                {t("notif.everyHours").replace("{n}", String(h))}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground text-xs">{t("notif.start")}</span>
            <select
              className="rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold"
              value={cfg.startHour}
              onChange={(e) => update("startHour", Number(e.target.value))}
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground text-xs">{t("notif.end")}</span>
            <select
              className="rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold"
              value={cfg.endHour}
              onChange={(e) => update("endHour", Number(e.target.value))}
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-2">
          {native && (
            <Button variant="outline" onClick={askPerm} className="flex-1">
              {t("notif.askPerm")}
            </Button>
          )}
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving ? t("common.loading") : t("notif.saveSchedule")}
          </Button>
        </div>
        {native && (
          <Button variant="ghost" onClick={disable} className="text-destructive">
            <BellOff size={14} className="mr-1" />
            {t("notif.disable")}
          </Button>
        )}
      </div>
    </div>
  );
}
