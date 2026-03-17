const CALENDAR_COLORS = [
  {
    bg: "bg-blue-500",
    border: "border-blue-600",
    text: "text-white",
    dot: "bg-blue-500",
  },
  {
    bg: "bg-green-600",
    border: "border-green-700",
    text: "text-white",
    dot: "bg-green-600",
  },
  {
    bg: "bg-purple-500",
    border: "border-purple-600",
    text: "text-white",
    dot: "bg-purple-500",
  },
  {
    bg: "bg-orange-500",
    border: "border-orange-600",
    text: "text-white",
    dot: "bg-orange-500",
  },
  {
    bg: "bg-teal-500",
    border: "border-teal-600",
    text: "text-white",
    dot: "bg-teal-500",
  },
  {
    bg: "bg-rose-500",
    border: "border-rose-600",
    text: "text-white",
    dot: "bg-rose-500",
  },
  {
    bg: "bg-indigo-500",
    border: "border-indigo-600",
    text: "text-white",
    dot: "bg-indigo-500",
  },
];

export function hashCalendarName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % CALENDAR_COLORS.length;
}

export function getCalendarColor(name: string) {
  return CALENDAR_COLORS[hashCalendarName(name)];
}
