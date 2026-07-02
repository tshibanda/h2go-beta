import { Splash, SplashDefs } from "./Splash";

export function LoadingScreen({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#1E3A8A] via-primary to-secondary text-white pt-safe pb-safe animate-fade-in">
      <SplashDefs />
      <div className="flex flex-col items-center gap-5 px-6 text-center">

        <div className="animate-bounce">
          <Splash mood="excited" size={100} />
        </div>
        <h2 className="font-display text-2xl font-bold">
          {title ?? "H2GO"}
        </h2>
        <p className="text-sm text-white/80 max-w-[260px]">
          {subtitle ?? "Chargement en cours…"}
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="inline-block w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "0ms" }} />
          <span className="inline-block w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "200ms" }} />
          <span className="inline-block w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "400ms" }} />
        </div>
      </div>
    </div>
  );
}
