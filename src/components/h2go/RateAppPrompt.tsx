import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { Star } from "lucide-react";

const KEY_FIRST_SEEN = "h2go.rate.firstSeen";
const KEY_STATE = "h2go.rate.state"; // "pending" | "later" | "done" | "never"
const KEY_LATER_AT = "h2go.rate.laterAt";
const DAYS_BEFORE_PROMPT = 5;
const DAYS_LATER_SNOOZE = 3;

const APP_STORE_URL = "https://apps.apple.com/app/id6753142268"; // fallback for web / opens the App Store review page

async function requestNativeReview(): Promise<boolean> {
  try {
    if (Capacitor.getPlatform() === "ios") {
      const mod = await import("@capacitor-community/in-app-review");
      await mod.InAppReview.requestReview();
      return true;
    }
  } catch {
    /* fall through to store URL */
  }
  return false;
}

export function RateAppPrompt() {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const state = localStorage.getItem(KEY_STATE);
      if (state === "done" || state === "never") return;

      const now = Date.now();
      let firstSeen = Number(localStorage.getItem(KEY_FIRST_SEEN) || 0);
      if (!firstSeen) {
        firstSeen = now;
        localStorage.setItem(KEY_FIRST_SEEN, String(firstSeen));
      }

      const daysSinceFirst = (now - firstSeen) / (1000 * 60 * 60 * 24);
      if (daysSinceFirst < DAYS_BEFORE_PROMPT) return;

      if (state === "later") {
        const laterAt = Number(localStorage.getItem(KEY_LATER_AT) || 0);
        const daysSinceLater = (now - laterAt) / (1000 * 60 * 60 * 24);
        if (daysSinceLater < DAYS_LATER_SNOOZE) return;
      }

      // small delay to avoid clashing with initial mount work
      const to = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(to);
    } catch {
      /* noop */
    }
  }, []);

  const handleRate = async () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY_STATE, "done");
    } catch {
      /* noop */
    }
    const opened = await requestNativeReview();
    if (!opened) {
      try {
        window.open(APP_STORE_URL, "_blank", "noopener");
      } catch {
        /* noop */
      }
    }
  };

  const handleLater = () => {
    try {
      localStorage.setItem(KEY_STATE, "later");
      localStorage.setItem(KEY_LATER_AT, String(Date.now()));
    } catch {
      /* noop */
    }
    setOpen(false);
  };

  const handleNever = () => {
    try {
      localStorage.setItem(KEY_STATE, "never");
    } catch {
      /* noop */
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleLater())}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <div className="mx-auto mb-2 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
            <Star size={28} fill="white" />
          </div>
          <DialogTitle className="text-center">{t("rate.title")}</DialogTitle>
          <DialogDescription className="text-center">{t("rate.body")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleRate}
            className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold"
          >
            <Star size={16} className="mr-1" fill="white" /> {t("rate.cta")}
          </Button>
          <Button variant="ghost" onClick={handleLater} className="w-full">
            {t("rate.later")}
          </Button>
          <button
            type="button"
            onClick={handleNever}
            className="text-xs text-muted-foreground hover:underline mt-1"
          >
            {t("rate.never")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
