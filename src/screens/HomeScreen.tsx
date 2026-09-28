import { useState } from "react";
import WheelPicker from "../components/WheelPicker";
import { BIBLE_BOOKS } from "../data/bible";
import { calcStreak, chapterCount, hasVerses, passageLabel } from "../lib/utils";
import type { Passage, Session } from "../types";

const range = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1));
const lastVerse = (bookIndex: number, ch: number) => BIBLE_BOOKS[bookIndex].verses[ch - 1];

/** 범위를 권/장/절 한계 안으로 넣고, 끝이 시작보다 앞서지 않게 맞춘다 */
function normalize(p: Passage, anchor: "from" | "to"): Passage {
  const book = BIBLE_BOOKS[p.bookIndex];
  const clampCh = (c: number) => Math.min(Math.max(c, 1), book.chapters);
  let { fromChapter, toChapter, fromVerse, toVerse } = p;
  fromChapter = clampCh(fromChapter);
  toChapter = clampCh(toChapter);
  const verses = hasVerses(p);
  if (verses) {
    fromVerse = Math.min(Math.max(fromVerse!, 1), lastVerse(p.bookIndex, fromChapter));
    toVerse = Math.min(Math.max(toVerse!, 1), lastVerse(p.bookIndex, toChapter));
  }
  const before =
    toChapter < fromChapter || (verses && toChapter === fromChapter && toVerse! < fromVerse!);
  if (before) {
    if (anchor === "from") {
      toChapter = fromChapter;
      toVerse = fromVerse;
    } else {
      fromChapter = toChapter;
      fromVerse = toVerse;
    }
  }
  return verses
    ? { bookIndex: p.bookIndex, fromChapter, toChapter, fromVerse, toVerse }
    : { bookIndex: p.bookIndex, fromChapter, toChapter };
}

export default function HomeScreen({
  passage,
  setPassage,
  sessions,
  onStart,
  onDashboard,
}: {
  passage: Passage;
  setPassage: (p: Passage) => void;
  sessions: Session[];
  onStart: () => void;
  onDashboard: () => void;
}) {
  const [edge, setEdge] = useState<"from" | "to">("from");
  const book = BIBLE_BOOKS[passage.bookIndex];
  const chapters = range(book.chapters);
  const bookNames = BIBLE_BOOKS.map((b) => b.name);
  const streak = calcStreak(sessions);
  const verseMode = hasVerses(passage);

  const update = (patch: Partial<Passage>, anchor: "from" | "to") =>
    setPassage(normalize({ ...passage, ...patch }, anchor));

  const handleBookChange = (idx: number) => {
    const next: Passage = { ...passage, bookIndex: idx };
    if (verseMode) {
      // 권이 바뀌면 절 범위는 장 전체로 초기화
      const max = BIBLE_BOOKS[idx].chapters;
      const to = Math.min(passage.toChapter, max);
      next.fromVerse = 1;
      next.toVerse = lastVerse(idx, to);
    }
    setPassage(normalize(next, "from"));
  };

  const setVerseMode = (on: boolean) => {
    if (on === verseMode) return;
    if (on) {
      setPassage({
        ...passage,
        fromVerse: 1,
        toVerse: lastVerse(passage.bookIndex, passage.toChapter),
      });
    } else {
      setPassage({
        bookIndex: passage.bookIndex,
        fromChapter: passage.fromChapter,
        toChapter: passage.toChapter,
      });
    }
    setEdge("from");
  };

  const edgeChapter = edge === "from" ? passage.fromChapter : passage.toChapter;
  const edgeVerse = (edge === "from" ? passage.fromVerse : passage.toVerse) ?? 1;

  const columns = verseMode
    ? [
        { items: bookNames, selectedIndex: passage.bookIndex, onSelect: handleBookChange },
        {
          items: chapters,
          selectedIndex: edgeChapter - 1,
          onSelect: (i: number) =>
            update(edge === "from" ? { fromChapter: i + 1 } : { toChapter: i + 1 }, edge),
        },
        {
          items: range(lastVerse(passage.bookIndex, edgeChapter)),
          selectedIndex: edgeVerse - 1,
          onSelect: (i: number) =>
            update(edge === "from" ? { fromVerse: i + 1 } : { toVerse: i + 1 }, edge),
        },
      ]
    : [
        { items: bookNames, selectedIndex: passage.bookIndex, onSelect: handleBookChange },
        {
          items: chapters,
          selectedIndex: passage.fromChapter - 1,
          onSelect: (i: number) => update({ fromChapter: i + 1 }, "from"),
        },
        {
          items: chapters,
          selectedIndex: passage.toChapter - 1,
          onSelect: (i: number) => update({ toChapter: i + 1 }, "to"),
        },
      ];

  const headers = verseMode
    ? ["성경 권", edge === "from" ? "시작 장" : "끝 장", edge === "from" ? "시작 절" : "끝 절"]
    : ["성경 권", "시작", "끝"];

  return (
    <div className="flex flex-col h-full bg-[#080808] text-white overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="px-6 safe-top pb-3 flex items-center justify-between">
        <div>
          <div
            className="text-[#c5ff50] text-2xl font-black tracking-[0.18em] uppercase"
            style={{ fontFamily: "var(--font-display)" }}
          >
            LOGOS
          </div>
          <div className="text-[#555] text-xs font-medium tracking-wider mt-0.5">
            성경 통독 트래커
          </div>
        </div>
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-[#1a1a1a] px-3 py-1.5 rounded-full border border-[#2a2a2a]">
              <span className="text-sm">🔥</span>
              <span
                className="text-[#c5ff50] text-sm font-bold"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {streak}
              </span>
            </div>
          )}
          <button
            onClick={onDashboard}
            aria-label="대시보드"
            className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center hover:border-[#c5ff50]/30 transition-colors"
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4 fill-[#777]">
              <rect x="2" y="2" width="7" height="7" rx="1.5" />
              <rect x="11" y="2" width="7" height="7" rx="1.5" />
              <rect x="2" y="11" width="7" height="7" rx="1.5" />
              <rect x="11" y="11" width="7" height="7" rx="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Passage display */}
      <div className="px-6 pb-4 pt-2">
        <div className="text-[#444] text-[10px] font-semibold tracking-[0.22em] uppercase mb-1.5">
          오늘의 말씀
        </div>
        <div
          className="text-white leading-none font-black"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(42px,10vw,58px)" }}
        >
          {passageLabel(passage)}
        </div>
        <div className="text-[#444] text-xs mt-1.5 flex items-center gap-2">
          <span className="bg-[#1a1a1a] px-2 py-0.5 rounded text-[#666] text-[10px] tracking-wider font-medium">
            {book.testament === "OT" ? "구약" : "신약"}
          </span>
          <span>{book.name}</span>
          <span>·</span>
          <span>{chapterCount(passage)}장</span>
        </div>
      </div>

      <div className="mx-6 h-px bg-[#141414]" />

      {/* Wheel picker section */}
      <div className="flex-1 flex flex-col justify-center px-5 py-4">
        {/* 장 단위 / 절 단위 전환 */}
        <div className="flex items-center justify-between mb-4 px-1 gap-2">
          <div className="flex bg-[#0e0e0e] border border-[#1a1a1a] rounded-xl p-1">
            {[
              { on: false, label: "장 단위" },
              { on: true, label: "절 단위" },
            ].map(({ on, label }) => (
              <button
                key={label}
                onClick={() => setVerseMode(on)}
                className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-all ${
                  verseMode === on ? "bg-[#c5ff50] text-[#080808]" : "text-[#555] hover:text-[#888]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {verseMode && (
            <div className="flex bg-[#0e0e0e] border border-[#1a1a1a] rounded-xl p-1">
              {(["from", "to"] as const).map((e) => (
                <button
                  key={e}
                  onClick={() => setEdge(e)}
                  className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-all ${
                    edge === e ? "bg-[#1e1e1e] text-white" : "text-[#555] hover:text-[#888]"
                  }`}
                >
                  {e === "from" ? "시작" : "끝"}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex text-[#3a3a3a] text-[10px] font-bold tracking-[0.18em] uppercase mb-2 px-3">
          <div className="flex-1 text-center">{headers[0]}</div>
          <div className="w-[72px] text-center">{headers[1]}</div>
          <div className="w-[72px] text-center">{headers[2]}</div>
        </div>
        <WheelPicker
          key={verseMode ? `v-${edge}` : "c"}
          columns={columns}
          columnWidths={["flex-1", "w-[72px]", "w-[72px]"]}
        />
      </div>

      {/* Start button */}
      <div className="px-6 safe-bottom pt-3">
        <button
          onClick={onStart}
          className="w-full py-[18px] rounded-2xl font-black text-xl tracking-[0.2em] uppercase text-[#080808] bg-[#c5ff50] hover:bg-[#d4ff70] active:scale-[0.98] transition-all duration-150"
          style={{ fontFamily: "var(--font-display)" }}
        >
          읽기 시작
        </button>
      </div>
    </div>
  );
}
