export const MOODS = [
  { emoji: "🔥", label: "뜨겁게" },
  { emoji: "🙏", label: "평온하게" },
  { emoji: "💡", label: "영감받아" },
  { emoji: "💭", label: "묵상하며" },
  { emoji: "😴", label: "신실하게" },
];

export const moodEmoji = (label?: string) => MOODS.find((m) => m.label === label)?.emoji;
