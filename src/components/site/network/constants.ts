export const REL_STYLES: Record<string, { color: string; label: string }> = {
  أب: { color: "#d4b05e", label: "أب" },
  أم: { color: "#e3c878", label: "أم" },
  صديق: { color: "#22c55e", label: "صديق" },
  عدو: { color: "#ef4444", label: "عدو" },
  معلم: { color: "#3b82f6", label: "معلم" },
  تلميذ: { color: "#60a5fa", label: "تلميذ" },
  عائلة: { color: "#fbbf24", label: "عائلة" },
  حليف: { color: "#a78bfa", label: "حليف" },
  زوج: { color: "#ec4899", label: "زوج" },
  زوجة: { color: "#ec4899", label: "زوجة" },
  أخ: { color: "#06b6d4", label: "أخ" },
  أخت: { color: "#06b6d4", label: "أخت" },
  ابن: { color: "#f59e0b", label: "ابن" },
  ابنة: { color: "#f59e0b", label: "ابنة" },
  تابع: { color: "#8b5cf6", label: "تابع" },
  سيده: { color: "#dc2626", label: "سيده" },
};

// Rich faction palette (gold-themed story → warm jewel tones)
export const FACTION_COLORS = [
  "#d4b05e", "#e3c878", "#c96f4a", "#8b5cf6", "#22c55e", "#38bdf8",
  "#f472b6", "#a3e635", "#fb7185", "#34d399", "#a78bfa", "#fbbf24",
  "#2dd4bf", "#60a5fa", "#f97316", "#4ade80", "#e879f9", "#facc15",
  "#7dd3fc", "#fdba74", "#c084fc", "#86efac", "#fda4af", "#94a3b8",
  "#fcd34d", "#5eead4",
];

export function getRelStyle(type: string) {
  return REL_STYLES[type] || { color: "#888", label: type };
}
