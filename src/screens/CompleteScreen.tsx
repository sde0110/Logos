import { useState } from "react";
import { BIBLE_BOOKS } from "../data/bible";
import { MOODS } from "../data/moods";
import { chapterCount, formatTime, paceOf, passageLabel } from "../lib/utils";
import type { Passage } from "../types";

export default function CompleteScreen({
  passage,
  duration,
  streak,
  onShare,
  onDone,
}: {
  passage: Passage;
  duration: number;
  streak: number;
  onShare: (mood: string) => void;
  onDone: (mood: string) => void;
}) {
  const [selectedMood, setSelectedMood] = useState("평온하게");
  const chapters = chapterCount(passage);
  const pace = paceOf(duration, passage);
  const label = passageLabel(passage);

  return (
    <div className="flex flex-col h-full bg-[#080808] text-white overflow-y-auto no-scrollbar">
      <div className="px-6 safe-top pb-5">
        <div className="text-[#c5ff50] text-[10px] font-bold tracking-[0.25em] uppercase mb-2">
          읽기 완료
        </div>
        <div
          className="font-black leading-none"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(44px,11vw,60px)" }}
        >
          잘 하셨습니다!
        </div>
        <div className="text-[#444] text-sm mt-1">{label} 기록 완료</div>
      </div>

      {/* Hero stat */}
      <div className="mx-6 mb-3 bg-[#0e0e0e] border border-[#1a1a1a] rounded-2xl p-5">
        <div className="text-[#444] text-[10px] tracking-widest uppercase mb-2">
          총 읽기 시간
        </div>
        <div
          className="text-[#c5ff50] font-black leading-none"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(60px,15vw,80px)",
          }}
        >
          {formatTime(duration)}
        </div>
        <div className="text-[#444] text-xs mt-2">{label}</div>
      </div>

      {/* Stats grid */}
      <div className="mx-6 grid grid-cols-3 gap-2.5 mb-5">
        {[
          { label: "페이스", value: formatTime(pace), sub: "장당" },
          { label: "읽은 장", value: String(chapters), sub: BIBLE_BOOKS[passage.bookIndex].abbr },
          { label: "연속 일수", value: String(streak), sub: "일 🔥", accent: true },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-xl p-4">
            <div className="text-[#444] text-[9px] tracking-widest uppercase mb-2">{label}</div>
            <div
              className={`text-xl font-semibold ${accent ? "text-[#c5ff50]" : "text-white"}`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {value}
            </div>
            <div className="text-[#333] text-[10px] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Mood picker */}
      <div className="mx-6 mb-5">
        <div className="text-[#444] text-[10px] tracking-widest uppercase mb-3">
          오늘 읽기는 어떠셨나요?
        </div>
        <div className="flex gap-2">
          {MOODS.map((m) => (
            <button
              key={m.label}
              onClick={() => setSelectedMood(m.label)}
              className={`flex-1 flex flex-col items-center py-3 rounded-xl border transition-all ${
                selectedMood === m.label
                  ? "border-[#c5ff50] bg-[#c5ff50]/8"
                  : "border-[#1a1a1a] bg-[#0e0e0e] hover:border-[#252525]"
              }`}
            >
              <span className="text-lg">{m.emoji}</span>
              <span className="text-[9px] text-[#555] mt-1 leading-tight text-center">
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mx-6 safe-bottom space-y-2.5">
        <button
          onClick={() => onShare(selectedMood)}
          className="w-full py-[16px] bg-[#c5ff50] text-[#080808] rounded-2xl font-black text-xl tracking-[0.18em] uppercase hover:bg-[#d4ff70] active:scale-[0.98] transition-all"
          style={{ fontFamily: "var(--font-display)" }}
        >
          공유 카드 만들기
        </button>
        <button
          onClick={() => onDone(selectedMood)}
          className="w-full py-[16px] border border-[#1e1e1e] text-[#666] rounded-2xl font-black text-xl tracking-[0.18em] uppercase hover:border-[#2a2a2a] hover:text-[#888] transition-all"
          style={{ fontFamily: "var(--font-display)" }}
        >
          저장하고 완료
        </button>
      </div>
    </div>
  );
}
