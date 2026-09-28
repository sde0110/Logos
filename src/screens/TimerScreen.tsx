import { useState, useEffect, useRef, useCallback } from "react";
import { BIBLE_BOOKS } from "../data/bible";
import { chapterCount, formatTime, passageLabel } from "../lib/utils";
import type { Passage } from "../types";

const TIMER_KEY = "logos_v1_active_timer";

/** 새로고침·탭 종료 후에도 이어서 읽을 수 있도록 저장하는 타이머 상태 */
export interface ActiveTimer {
  passage: Passage;
  /** 누적된(일시정지 전까지의) 밀리초 */
  accumulated: number;
  /** 현재 달리는 구간의 시작 시각(ms). 일시정지 중이면 null */
  runningSince: number | null;
}

export const loadActiveTimer = (): ActiveTimer | null => {
  try {
    return JSON.parse(localStorage.getItem(TIMER_KEY) || "null");
  } catch {
    return null;
  }
};

const saveActiveTimer = (t: ActiveTimer | null) => {
  try {
    if (t) localStorage.setItem(TIMER_KEY, JSON.stringify(t));
    else localStorage.removeItem(TIMER_KEY);
  } catch {
    // 저장 불가 환경에서는 메모리로만 동작
  }
};

const elapsedOf = (t: ActiveTimer, now = Date.now()) =>
  Math.floor((t.accumulated + (t.runningSince ? now - t.runningSince : 0)) / 1000);

type WakeLockSentinelLike = { release: () => Promise<void> };

export default function TimerScreen({
  passage,
  onFinish,
  onCancel,
}: {
  passage: Passage;
  onFinish: (duration: number) => void;
  onCancel: () => void;
}) {
  const [timer, setTimer] = useState<ActiveTimer>(() => {
    const saved = loadActiveTimer();
    if (saved && JSON.stringify(saved.passage) === JSON.stringify(passage)) return saved;
    return { passage, accumulated: 0, runningSince: Date.now() };
  });
  const [, setTick] = useState(0);
  const wakeLock = useRef<WakeLockSentinelLike | null>(null);
  const running = timer.runningSince !== null;

  useEffect(() => saveActiveTimer(timer), [timer]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [running]);

  // 읽는 동안 화면이 꺼지지 않게 (지원 브라우저만)
  useEffect(() => {
    if (!running) return;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    };
    let cancelled = false;
    const acquire = () =>
      nav.wakeLock
        ?.request("screen")
        .then((lock) => {
          if (cancelled) lock.release();
          else wakeLock.current = lock;
        })
        .catch(() => {});
    acquire();
    const onVisible = () => document.visibilityState === "visible" && acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, [running]);

  const start = useCallback(() => {
    setTimer((t) => (t.runningSince ? t : { ...t, runningSince: Date.now() }));
  }, []);

  const pause = useCallback(() => {
    setTimer((t) =>
      t.runningSince
        ? { ...t, accumulated: t.accumulated + Date.now() - t.runningSince, runningSince: null }
        : t
    );
  }, []);

  const elapsed = elapsedOf(timer);
  const chapters = chapterCount(passage);
  const pace = elapsed > 0 ? Math.round(elapsed / chapters) : 0;
  const book = BIBLE_BOOKS[passage.bookIndex];

  const finish = () => {
    saveActiveTimer(null);
    onFinish(elapsed);
  };

  const cancel = () => {
    saveActiveTimer(null);
    onCancel();
  };

  return (
    <div className="flex flex-col h-full bg-[#080808] text-white overflow-y-auto no-scrollbar">
      {/* Top bar */}
      <div className="px-6 safe-top pb-2 flex items-center justify-between">
        <button
          onClick={cancel}
          className="text-[#555] text-sm font-medium hover:text-[#888] transition-colors"
        >
          ← 취소
        </button>
        <div
          className={`flex items-center gap-2 text-xs font-semibold tracking-[0.15em] uppercase transition-colors ${
            running ? "text-[#c5ff50]" : "text-[#444]"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${running ? "bg-[#c5ff50] animate-pulse" : "bg-[#333]"}`}
          />
          {running ? "읽는 중" : "일시정지"}
        </div>
      </div>

      {/* Passage label */}
      <div className="px-6 pt-6 pb-2">
        <div className="text-[#444] text-[10px] font-bold tracking-[0.22em] uppercase mb-2">
          현재 읽는 말씀
        </div>
        <div
          className="text-white font-bold leading-none"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,8vw,44px)" }}
        >
          {passageLabel(passage)}
        </div>
        <div className="text-[#444] text-xs mt-1.5">
          {book.name} · {chapters}장
        </div>
      </div>

      {/* Big timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-2 py-8">
        <div
          className="font-black leading-none tabular-nums tracking-tight text-white"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(88px,22vw,120px)",
          }}
        >
          {formatTime(elapsed)}
        </div>
        <div className="text-[#333] text-xs tracking-[0.25em] uppercase font-medium">
          경과 시간
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 safe-bottom">
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-xl p-4">
            <div className="text-[#444] text-[10px] tracking-widest uppercase mb-2">
              평균 페이스
            </div>
            <div
              className="text-white text-2xl font-semibold"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {pace > 0 ? formatTime(pace) : "--:--"}
            </div>
            <div className="text-[#333] text-xs mt-0.5">장당</div>
          </div>
          <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-xl p-4">
            <div className="text-[#444] text-[10px] tracking-widest uppercase mb-2">
              읽은 장
            </div>
            <div
              className="text-white text-2xl font-semibold"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {chapters}
            </div>
            <div className="text-[#333] text-xs mt-0.5">{book.abbr}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={running ? pause : start}
            className="flex-1 py-[15px] border border-[#242424] rounded-2xl font-black text-base tracking-[0.18em] uppercase text-[#777] hover:border-[#333] hover:text-white transition-all"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {running ? "일시정지" : "계속하기"}
          </button>
          <button
            onClick={finish}
            className="flex-1 py-[15px] bg-[#c5ff50] text-[#080808] rounded-2xl font-black text-base tracking-[0.18em] uppercase hover:bg-[#d4ff70] active:scale-[0.98] transition-all"
            style={{ fontFamily: "var(--font-display)" }}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
