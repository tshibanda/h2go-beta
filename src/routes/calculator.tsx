import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Splash, SplashDefs } from "@/components/h2go/Splash";

type Activity = "low" | "moderate" | "high";
type Unit = "metric" | "imperial";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "Water Intake Calculator — Daily Hydration Goal | H2GO" },
      {
        name: "description",
        content:
          "Free water intake calculator. Get your personalized daily hydration goal in liters or ounces based on weight, activity level, and climate.",
      },
      { property: "og:title", content: "Water Intake Calculator — Daily Hydration Goal | H2GO" },
      {
        property: "og:description",
        content:
          "Calculate how much water you should drink per day. Personalized recommendation based on weight and activity.",
      },
      { property: "og:url", content: "https://h2go-app.com/calculator" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://h2go-app.com/calculator" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "H2GO Water Intake Calculator",
          url: "https://h2go-app.com/calculator",
          applicationCategory: "HealthApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description:
            "Free water intake calculator that estimates your personalized daily hydration goal from weight and activity level.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How much water should I drink per day?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "A common baseline is roughly 35 ml of water per kilogram of body weight (about 0.5 oz per pound), then add 350–700 ml for every 30 minutes of exercise and more in hot climates.",
              },
            },
            {
              "@type": "Question",
              name: "Does coffee or tea count toward my water intake?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Most non-alcoholic fluids — including coffee, tea, milk, and water-rich foods — contribute to your daily hydration, though plain water is the most efficient source.",
              },
            },
            {
              "@type": "Question",
              name: "Can I drink too much water?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes, overhydration can dilute blood sodium (hyponatremia). For most healthy adults, intake under 3.7 L (men) or 2.7 L (women) per day is considered safe; consult a clinician if you have kidney or heart conditions.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: CalculatorPage,
});

function CalculatorPage() {
  const [unit, setUnit] = useState<Unit>("metric");
  const [weight, setWeight] = useState<string>("70");
  const [exerciseMin, setExerciseMin] = useState<string>("30");
  const [activity, setActivity] = useState<Activity>("moderate");
  const [hotClimate, setHotClimate] = useState<boolean>(false);

  const result = useMemo(() => {
    const w = parseFloat(weight);
    const ex = parseFloat(exerciseMin) || 0;
    if (!w || w <= 0) return null;

    // Convert to kg
    const kg = unit === "metric" ? w : w * 0.453592;

    // Base 35 ml per kg
    let ml = kg * 35;

    // Activity multiplier
    if (activity === "low") ml *= 0.95;
    if (activity === "high") ml *= 1.1;

    // Exercise: +500 ml per 30 minutes
    ml += (ex / 30) * 500;

    // Hot climate adds 10%
    if (hotClimate) ml *= 1.1;

    const liters = ml / 1000;
    const ounces = ml / 29.5735;
    const cups = ounces / 8;

    return {
      ml: Math.round(ml),
      liters: liters.toFixed(2),
      ounces: Math.round(ounces),
      cups: cups.toFixed(1),
    };
  }, [weight, exerciseMin, activity, hotClimate, unit]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#0D9488] text-white">
      <SplashDefs />
      <main className="max-w-xl mx-auto px-5 pt-10 pb-16 flex flex-col gap-6">
        <header className="flex flex-col items-center text-center gap-3">
          <Splash mood="happy" size={96} />
          <h1 className="font-display text-4xl font-bold leading-tight">Water Intake Calculator</h1>
          <p className="text-white/85">
            Estimate how much water you should drink each day — based on your weight, activity, and climate.
          </p>
        </header>

        <section className="bg-white/10 backdrop-blur rounded-3xl p-5 border border-white/15 flex flex-col gap-5">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setUnit("metric")}
              className={`flex-1 h-11 rounded-xl ${unit === "metric" ? "bg-white text-primary" : "bg-white/10 text-white"}`}
            >
              Metric (kg)
            </Button>
            <Button
              type="button"
              onClick={() => setUnit("imperial")}
              className={`flex-1 h-11 rounded-xl ${unit === "imperial" ? "bg-white text-primary" : "bg-white/10 text-white"}`}
            >
              Imperial (lb)
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="weight" className="text-white">
              Weight ({unit === "metric" ? "kg" : "lb"})
            </Label>
            <Input
              id="weight"
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-12 rounded-xl bg-white/15 border-white/20 text-white placeholder:text-white/60"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="exercise" className="text-white">
              Exercise per day (minutes)
            </Label>
            <Input
              id="exercise"
              type="number"
              inputMode="numeric"
              value={exerciseMin}
              onChange={(e) => setExerciseMin(e.target.value)}
              className="h-12 rounded-xl bg-white/15 border-white/20 text-white placeholder:text-white/60"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Activity level</span>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "moderate", "high"] as Activity[]).map((a) => (
                <Button
                  key={a}
                  type="button"
                  onClick={() => setActivity(a)}
                  className={`h-11 rounded-xl capitalize ${activity === a ? "bg-white text-primary" : "bg-white/10 text-white"}`}
                >
                  {a}
                </Button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={hotClimate}
              onChange={(e) => setHotClimate(e.target.checked)}
              className="h-5 w-5 rounded accent-white"
            />
            I live in a hot or humid climate (+10%)
          </label>
        </section>

        {result && (
          <section
            aria-live="polite"
            className="bg-white text-primary rounded-3xl p-6 flex flex-col items-center text-center gap-2 shadow-xl"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Your daily goal</p>
            <p className="font-display text-5xl font-bold">{result.liters} L</p>
            <p className="text-sm text-primary/80">
              ≈ {result.ounces} oz · {result.cups} cups · {result.ml} ml
            </p>
            <Link to="/auth" className="w-full mt-3">
              <Button className="w-full h-12 rounded-2xl bg-primary text-white font-bold">
                Track it with H2GO — free
              </Button>
            </Link>
          </section>
        )}

        <section className="bg-white/10 backdrop-blur rounded-3xl p-5 border border-white/15 flex flex-col gap-3 text-sm leading-relaxed">
          <h2 className="font-display text-xl font-bold">How much water should you drink?</h2>
          <p>
            A widely-used baseline is <strong>35 ml of water per kilogram of body weight</strong> (about 0.5 oz per
            pound). Add roughly <strong>500 ml for every 30 minutes</strong> of exercise, and increase intake in hot or
            humid weather.
          </p>
          <p>
            Our calculator combines these factors with your activity level to give a personalized starting point. Listen
            to your body — thirst, urine color, and energy levels are useful signals.
          </p>
          <h3 className="font-display text-lg font-bold mt-2">Tips to hit your goal</h3>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Start the day with a full glass of water.</li>
            <li>Keep a reusable bottle within arm's reach.</li>
            <li>Pair drinks with daily habits (meals, breaks, workouts).</li>
            <li>Use H2GO to verify real sips with your camera and grow your hydration tree.</li>
          </ul>
        </section>

        <div className="text-center">
          <Link to="/" className="text-white/80 underline text-sm">
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
