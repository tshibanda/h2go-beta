import { useEffect, useState } from "react";
import { resolveAvatarUrl } from "@/lib/avatar";

interface AvatarProps {
  stored?: string | null;
  size?: number;
  fallback?: string;
  className?: string;
}

/** Resolves Google/Apple http URLs or signed storage URLs; falls back to an emoji. */
export function Avatar({ stored, size = 80, fallback = "🌊", className = "" }: AvatarProps) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    resolveAvatarUrl(stored).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [stored]);

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center bg-white/20 border-[3px] border-white/45 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span aria-hidden>{fallback}</span>
      )}
    </div>
  );
}
