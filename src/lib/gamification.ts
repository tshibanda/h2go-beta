// Pure functions for XP/level/tree calculations

export const LEVELS = [
  { level: 1, name: "Hydrated Beginner", xp: 0 },
  { level: 2, name: "Water Apprentice", xp: 200 },
  { level: 3, name: "Hydration Guardian", xp: 500 },
  { level: 5, name: "Water Explorer", xp: 1500 },
  { level: 10, name: "Hydration Guardian", xp: 5000 },
  { level: 20, name: "Ocean Master", xp: 15000 },
  { level: 50, name: "King of Hydration", xp: 50000 },
];

export function levelForXp(xp: number): { level: number; name: string; next: number } {
  let current = LEVELS[0];
  let next = LEVELS[LEVELS.length - 1].xp;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i];
      next = LEVELS[i + 1]?.xp ?? current.xp + 10000;
    }
  }
  return { level: current.level, name: current.name, next };
}

export const TREE_STAGES = [
  { stage: 0, name: "Seed", emoji: "🌱", minLogs: 0 },
  { stage: 1, name: "Sprout", emoji: "🌿", minLogs: 10 },
  { stage: 2, name: "Young Tree", emoji: "🌳", minLogs: 40 },
  { stage: 3, name: "Tree", emoji: "🌲", minLogs: 100 },
  { stage: 4, name: "Rare Tree", emoji: "🌸", minLogs: 300 },
  { stage: 5, name: "Legendary", emoji: "✨", minLogs: 1000 },
];

export function treeStageForLogs(totalLogs: number) {
  let stage = TREE_STAGES[0];
  for (const s of TREE_STAGES) if (totalLogs >= s.minLogs) stage = s;
  return stage;
}

export const XP_PER_DRINK = 10;
export const XP_DAILY_GOAL = 50;
export const XP_WEEK_STREAK = 100;

export function estimateVolumeMl(detected: string | null | undefined): number {
  switch (detected) {
    case "water_glass":
    case "water_cup":
      return 250;
    case "water_bottle":
      return 500;
    case "water_flask":
      return 750;
    default:
      return 250;
  }
}
