import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";

export type TreeShareData = {
  stage: number;
  stageName: string;
  emoji: string;
  totalSips: number;
  userName?: string;
};

type Props = {
  data: TreeShareData | null;
  onClose: () => void;
};

const W = 1080;
const H = 1920;

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

function drawTree(ctx: CanvasRenderingContext2D, stage: number, cx: number, cy: number, scale = 4) {
  const canopySize = (18 + stage * 10) * scale;
  // shadow
  ctx.fillStyle = "rgba(22,163,74,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 90 * scale, 82 * scale, 11 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (stage >= 1) {
    ctx.fillStyle = "#92400E";
    const trunkH = (75 + stage * 6) * scale;
    const trunkW = 26 * scale;
    roundRect(ctx, cx - trunkW / 2, cy + 30 * scale - trunkH, trunkW, trunkH, 7 * scale);
    ctx.fill();
  }
  const layers: Array<[number, number, number, string]> = [];
  if (stage >= 2) {
    layers.push([cx, cy - (10 + stage * 4) * scale, canopySize + 30 * scale, "#15803D"]);
    layers.push([cx, cy - (32 + stage * 4) * scale, canopySize + 18 * scale, "#16A34A"]);
  }
  if (stage >= 1) layers.push([cx, cy - (50 + stage * 4) * scale, canopySize + 6 * scale, "#22C55E"]);
  layers.push([cx, cy - (66 + stage * 4) * scale, Math.max(18 * scale, canopySize - 8 * scale), "#4ADE80"]);

  for (const [x, y, r, color] of layers) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (stage === 0) {
    ctx.fillStyle = "#16A34A";
    ctx.beginPath();
    ctx.moveTo(cx - 3 * scale, cy + 62 * scale);
    ctx.quadraticCurveTo(cx, cy + 42 * scale, cx + 3 * scale, cy + 62 * scale);
    ctx.closePath();
    ctx.fill();
  }
  if (stage >= 4) {
    [[-44, -8], [34, -18], [-24, 12]].forEach(([dx, dy]) => {
      ctx.fillStyle = "#F472B6";
      ctx.beginPath();
      ctx.arc(cx + dx * scale, cy - 30 * scale + dy * scale, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

async function drawTreeCard(canvas: HTMLCanvasElement, data: TreeShareData) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = W;
  canvas.height = H;

  // Sky-to-grass gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#BAE6FD");
  g.addColorStop(0.55, "#DBEAFE");
  g.addColorStop(1, "#86EFAC");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Sun
  ctx.fillStyle = "#FCD34D";
  ctx.beginPath();
  ctx.arc(880, 220, 90, 0, Math.PI * 2);
  ctx.fill();
  // Clouds
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(220, 200, 130, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(420, 320, 90, 35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Header
  ctx.fillStyle = "rgba(15,23,42,0.85)";
  ctx.font = "700 64px 'Fredoka', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("H2GO", W / 2, 130);
  ctx.font = "500 32px 'Poppins', system-ui, sans-serif";
  ctx.fillStyle = "rgba(15,23,42,0.6)";
  ctx.fillText("Mon arbre d'hydratation", W / 2, 180);

  // Tree
  drawTree(ctx, data.stage, W / 2, 1100, 5);

  // Card with info
  const cardX = 90;
  const cardY = 1320;
  const cardW = W - 180;
  const cardH = 420;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 56);
  ctx.fill();

  // Emoji + stage
  ctx.textAlign = "center";
  ctx.fillStyle = "#0F172A";
  ctx.font = "120px 'Apple Color Emoji','Segoe UI Emoji', sans-serif";
  ctx.fillText(data.emoji, W / 2 - 220, cardY + 180);

  ctx.textAlign = "left";
  ctx.font = "700 64px 'Fredoka', system-ui, sans-serif";
  ctx.fillStyle = "#15803D";
  ctx.fillText(data.stageName, cardX + 380, cardY + 150);

  ctx.font = "500 38px 'Poppins', system-ui, sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText(`${data.totalSips} gorgées validées 💧`, cardX + 380, cardY + 210);

  // Ribbon
  ctx.fillStyle = "#10B981";
  const ribbonW = 520;
  const ribbonH = 80;
  roundRect(ctx, (W - ribbonW) / 2, cardY + 280, ribbonW, ribbonH, 40);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 38px 'Fredoka', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🌱 Je fais pousser mon arbre", W / 2, cardY + 280 + ribbonH / 2);

  // Footer
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(15,23,42,0.85)";
  ctx.font = "600 42px 'Poppins', system-ui, sans-serif";
  const tag = data.userName ? `@${data.userName}` : "h2go-app.com";
  ctx.fillText(tag, W / 2, 1820);
  ctx.font = "400 32px 'Poppins', system-ui, sans-serif";
  ctx.fillStyle = "rgba(15,23,42,0.6)";
  ctx.fillText("h2go-app.com", W / 2, 1870);
}

export function TreeShareModal({ data, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    void (async () => {
      await drawTreeCard(canvasRef.current!, data);
      setDataUrl(canvasRef.current!.toDataURL("image/png"));
    })();
  }, [data]);

  async function handleShare() {
    if (!canvasRef.current || !data) return;
    setBusy(true);
    try {
      const blob: Blob | null = await new Promise((res) =>
        canvasRef.current!.toBlob((b) => res(b), "image/png", 0.95),
      );
      if (!blob) throw new Error("Image creation failed");
      const file = new File([blob], `h2go-tree-${data.stageName}.png`, { type: "image/png" });
      const navAny = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
      };
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `H2GO — Mon arbre ${data.stageName}`,
          text: `Mon arbre d'hydratation H2GO est au stade "${data.stageName}" 🌳💧`,
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
    if (!dataUrl || !data) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `h2go-tree-${data.stageName.replace(/\s+/g, "-")}.png`;
    a.click();
  }

  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {data?.emoji} Partager mon arbre
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-full aspect-[9/16] rounded-2xl overflow-hidden bg-muted shadow-lg">
            {dataUrl ? (
              <img src={dataUrl} alt="Mon arbre H2GO" className="w-full h-full object-cover animate-scale-in" />
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
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover-scale"
              onClick={handleShare}
              disabled={!dataUrl || busy}
            >
              <Share2 size={16} /> Partager
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 hover-scale"
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
