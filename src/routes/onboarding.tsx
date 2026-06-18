import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { completeOnboarding } from "@/lib/h2go.functions";
import { Splash, SplashDefs } from "@/components/h2go/Splash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({ meta: [{ title: "Get started — H2GO" }] }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const submit = useServerFn(completeOnboarding);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState("28");
  const [weight, setWeight] = useState("70");
  const [goal, setGoal] = useState("2500");
  const [times, setTimes] = useState<string[]>(["08:00", "12:00", "16:00", "20:00"]);
  const [busy, setBusy] = useState(false);

  const recommended = Math.round(Number(weight) * 35);

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
        },
      });
      toast.success("You're all set!");
      navigate({ to: "/home" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#0D9488] p-4 flex items-center justify-center">
      <SplashDefs />
      <div className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col items-center gap-2 mb-4">
          <Splash mood={step === 2 ? "excited" : "thinking"} size={70} />
          <h1 className="font-display text-2xl font-bold">Let's set you up</h1>
          <p className="text-xs text-muted-foreground">Step {step + 1} of 3</p>
        </div>

        {step === 0 && (
          <div className="flex flex-col gap-3">
            <div>
              <Label>What should we call you?</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Age</Label>
                <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
            </div>
            <Button onClick={() => setStep(1)} disabled={!name} className="rounded-2xl h-12 mt-2">Next</Button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <Label>Daily hydration goal (ml)</Label>
            <Input type="number" step="100" value={goal} onChange={(e) => setGoal(e.target.value)} />
            <button onClick={() => setGoal(String(recommended))} className="text-sm text-primary text-left">
              💡 Recommended for {weight}kg: {recommended} ml
            </button>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1 rounded-2xl h-12">Back</Button>
              <Button onClick={() => setStep(2)} className="flex-1 rounded-2xl h-12">Next</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <Label>Your reminders ({times.length}/12 — at least 3, 1h apart)</Label>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {times.map((t, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input type="time" value={t} onChange={(e) => updateTime(i, e.target.value)} />
                  <button
                    onClick={() => removeTime(i)}
                    disabled={times.length <= 3}
                    className="px-3 py-2 text-destructive disabled:opacity-30"
                  >×</button>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={addTime} disabled={times.length >= 12} className="rounded-2xl">+ Add reminder</Button>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-2xl h-12">Back</Button>
              <Button onClick={finish} disabled={busy} className="flex-1 rounded-2xl h-12 bg-gradient-to-r from-primary to-secondary">
                {busy ? "..." : "Let's go 💧"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
