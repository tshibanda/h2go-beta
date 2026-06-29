import { useId } from "react";

export type SplashMood = "happy" | "excited" | "celebrating" | "thinking" | "sleeping" | "encouraging";

// Conservé pour compatibilité si tu l'utilises encore ailleurs,
// mais Splash n'en dépend plus : chaque instance porte désormais
// son propre <defs> avec un id unique (voir plus bas).
export function SplashDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", overflow: "hidden" }}>
      <defs>
        <linearGradient id="dropGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Splash({ mood = "happy", size = 80 }: { mood?: SplashMood; size?: number }) {
  const h = Math.round(size * 1.2);
  const isSleeping = mood === "sleeping";
  const isCelebrating = mood === "celebrating";
  const isThinking = mood === "thinking";
  const isExcited = mood === "excited";
  const hasBlush = ["happy", "celebrating", "encouraging", "excited"].includes(mood);

  // id unique par instance : évite tout conflit si plusieurs <Splash />
  // sont rendus en même temps sur la page (deux SVG ne peuvent pas
  // partager un id="dropGrad" sans risquer un rendu sans remplissage).
  const gradientId = useId();

  return (
    <svg width={size} height={h} viewBox="0 0 100 120" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <path
        d="M50 8C50 8 17 53 17 77C17 96 31.8 112 50 112C68.2 112 83 96 83 77C83 53 50 8 50 8Z"
        fill={`url(#${gradientId})`}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="2"
      />
      <ellipse cx="34" cy="58" rx="8" ry="13" fill="white" opacity="0.3" transform="rotate(-22 34 58)" />
      {isSleeping ? (
        <>
          <path d="M33 52Q40 46 47 52" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M53 52Q60 46 67 52" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="39" cy="51" r={isExcited ? 7 : 6.5} fill="#1E3A8A" />
          <circle cx="61" cy="51" r={isExcited ? 7 : 6.5} fill="#1E3A8A" />
          <circle cx="41" cy="49" r="2.5" fill="white" />
          <circle cx="63" cy="49" r="2.5" fill="white" />
        </>
      )}
      {isThinking ? (
        <path d="M38 65Q50 61 62 65" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      ) : isCelebrating ? (
        <path d="M33 64Q50 78 67 64" stroke="#1E3A8A" strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : isSleeping ? (
        <path d="M41 66Q50 71 59 66" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M36 63Q50 73 64 63" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      )}
      {hasBlush && (
        <>
          <ellipse cx="27" cy="65" rx="8" ry="5" fill="#FCA5A5" opacity="0.4" />
          <ellipse cx="73" cy="65" rx="8" ry="5" fill="#FCA5A5" opacity="0.4" />
        </>
      )}
      {isCelebrating && (
        <>
          <path d="M19 74L6 56" stroke="#60A5FA" strokeWidth="5" strokeLinecap="round" />
          <path d="M81 74L94 56" stroke="#60A5FA" strokeWidth="5" strokeLinecap="round" />
          <circle cx="5" cy="53" r="5" fill="#F59E0B" />
          <circle cx="95" cy="53" r="5" fill="#22C55E" />
        </>
      )}
    </svg>
  );
}
