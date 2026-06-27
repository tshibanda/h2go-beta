import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";

export type ShareBadge = {
  emoji: string;
  title: string;
  description?: string;
  unlocked: boolean;
  userName?: string;
};

type Props = {
  badge: ShareBadge | null;
  onClose: () => void;
};

const W = 1080;
const H = 1920;

async function drawBadgeCard(canvas: HTMLCanvasElement, badge: ShareBadge) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = W;
  canvas.height = H;

  // Gradient background matching H2GO charter
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#1E3A8A");
  g.addColorStop(0.55, "#3B82F6");
  g.addColorStop(1, "#0D9488");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Decorative bubbles
  for (let i = 0; i < 18; i++) {
    const x = (i * 173 + 91) % W;
    const y = (i * 281 + 137) % H;
    const r = 30 + ((i * 53) % 110);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.04 + (i % 5) * 0.012})`;
    ctx.fill();
  }

  // Header: H2GO
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "700 56px 'Fredoka', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("H2GO", W / 2, 180);
  ctx.font = "500 32px 'Poppins', system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("Hydration Tracker", W / 2, 230);

  // Card
  const cardX = 90;
  const cardY = 380;
  const cardW = W - 180;
  const cardH = 1180;
  const r = 64;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  roundRect(ctx, cardX, cardY, cardW, cardH, r);
  ctx.fill();

  // Emoji
  ctx.font = "420px 'Apple Color Emoji','Segoe UI Emoji', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(badge.emoji, W / 2, cardY + 540);

  // Unlocked ribbon
  ctx.fillStyle = badge.unlocked ? "#0D9488" : "#94A3B8";
  const ribbonW = 360;
  const ribbonH = 70;
  roundRect(ctx, (W - ribbonW) / 2, cardY + 600, ribbonW, ribbonH, 35);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 36px 'Fredoka', system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(
    badge.unlocked ? "✓  Débloqué" : "Verrouillé",
    W / 2,
    cardY + 600 + ribbonH / 2,
  );

  // Title
  ctx.fillStyle = "#1E3A8A";
  ctx.font = "700 76px 'Fredoka', system-ui, sans-serif";
  ctx.textBaseline = "alphabetic";
  wrapText(ctx, badge.title, W / 2, cardY + 800, cardW - 120, 90);

  // Description
  if (badge.description) {
    ctx.fillStyle = "#475569";
    ctx.font = "400 40px 'Poppins', system-ui, sans-serif";
    wrapText(ctx, badge.description, W / 2, cardY + 1000, cardW - 160, 56);
  }

  // Footer with name
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "600 40px 'Poppins', system-ui, sans-serif";
  ctx.textAlign = "center";
  const tag = badge.userName ? `@${badge.userName}` : "h2go-app.com";
  ctx.fillText(tag, W / 2, cardY + cardH + 110);
  ctx.font = "400 32px 'Poppins', system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText("h2go-app.com", W / 2, cardY + cardH + 165);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const startY = cy - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
}

export function BadgeShareModal({ badge, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!badge || !canvasRef.current) return;
    void (async () => {
      await drawBadgeCard(canvasRef.current!, badge);
      setDataUrl(canvasRef.current!.toDataURL("image/png"));
    })();
  }, [badge]);

  async function handleShare() {
    if (!canvasRef.current || !badge) return;
    setBusy(true);
    try {
      const blob: Blob | null = await new Promise((res) =>
        canvasRef.current!.toBlob((b) => res(b), "image/png", 0.95),
      );
      if (!blob) throw new Error("Image creation failed");
      const file = new File([blob], `h2go-badge-${badge.title}.png`, { type: "image/png" });
      const navAny = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `H2GO — ${badge.title}`,
          text: `J'ai débloqué le badge "${badge.title}" sur H2GO 💧`,
        });
      } else {
        handleDownload();
      }
    } catch (e) {
      const err = e as { name?: string; message?: string };
      if (err.name !== "AbortError") {
        toast.error(err.message ?? "Partage impossible");
      }
    } finally {
      setBusy(false);
    }
  }

  function handleDownload() {
    if (!dataUrl || !badge) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `h2go-badge-${badge.title.replace(/\s+/g, "-")}.png`;
    a.click();
  }

  return (
    <Dialog open={!!badge} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {badge?.emoji} {badge?.title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="w-full aspect-[9/16] rounded-2xl overflow-hidden bg-muted shadow-lg">
            {dataUrl ? (
              <img src={dataUrl} alt={badge?.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Génération de l'image…
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-2 w-full">
            <Button
              type="button"
              className="flex-1 bg-gradient-to-r from-primary to-secondary"
              onClick={handleShare}
              disabled={!dataUrl || busy}
            >
              <Share2 size={16} /> Partager
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
              disabled={!dataUrl}
            >
              <Download size={16} /> Télécharger
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
