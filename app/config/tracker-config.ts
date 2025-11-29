export const GITLAB_CONFIG = {
  API_URL: "https://gitlab.com/api/graphql",
  PROJECT_PATH: "dhbw-se/se-tinf24b2/gruppe-4/dhubbw",
  TOKEN: process.env.NEXT_PUBLIC_GITLAB_TOKEN || "",
} as const;

export const PROJECT_PATH = GITLAB_CONFIG.PROJECT_PATH;

export const COLORS = {
  PRIMARY: ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"],
  TEAM: [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEEAD",
    "#D4A5A5",
    "#38bdf8",
    "#fb7185",
    "#facc15",
    "#4ade80",
    "#a855f7",
    "#f97316",
    "#06b6d4",
    "#ec4899",
    "#eab308",
    "#22c55e",
    "#8b5cf6",
    "#ea580c",
    "#0ea5e9",
    "#f43f5e",
    "#84cc16",
    "#10b981",
    "#7c3aed",
    "#dc2626",
    "#0891b2",
    "#e11d48",
    "#65a30d",
    "#059669",
    "#6366f1",
    "#b91c1c",
    "#0e7490",
    "#be185d",
    "#4d7c0f",
    "#047857",
    "#4f46e5",
    "#991b1b",
  ],
  HEATMAP: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
} as const;

export const APP_SETTINGS = {
  // Week start day (0=Sunday ... 6=Saturday). Default Monday (1).
  WEEK_START_DAY: 1,
} as const;
