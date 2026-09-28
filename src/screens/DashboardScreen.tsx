import { BIBLE_BOOKS } from "../data/bible";
import { moodEmoji } from "../data/moods";
import type { SyncStatus } from "../lib/sessions";
import {
  calcStreak,
  chapterCount,
  completedBooks,
  dateKey,
  formatTime,
  passageLabel,
} from "../lib/utils";
import type { Session } from "../types";

const SYNC_LABEL: Record<SyncStatus, string> = {
  local: "이 기기에 저장됨",
  syncing: "동기화 중…",
  synced: "클라우드 동기화됨",
  error: "동기화 실패 · 이 기기에 저장됨",
};

export default function DashboardScreen({
  sessions,
  syncStatus,
  onBack,
  onOpenSession,
}: {
  sessions: Session[];
  syncStatus: SyncStatus;
  onBack: () => void;
  onOpenSession: (s: Session) => void;
}) {
  const streak = calcStreak(sessions);
  const totalSec = sessions.reduce((s, x) => s + x.duration, 0);
  const totalMin = Math.round(totalSec / 60);
  const totalChapters = sessions.reduce((s, x) => s + chapterCount(x), 0);
  const booksDone = completedBooks(sessions);
  const avgMin = sessions.length > 0 ? Math.round(totalMin / sessions.length) : 0;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = dateKey(d);
    const label = d.toLocaleDateString("ko-KR", { weekday: "short" }).slice(0, 1);
    return { key, label, active: sessions.some((s) => s.date === key) };
  });

  // 최근 6개월 월별 총 읽은 시간
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const key = dateKey(d).slice(0, 7);
    const list = sessions.filter((s) => s.date.startsWith(key));
    return {
      key,
      label: `${d.getMonth() + 1}월`,
      minutes: Math.round(list.reduce((s, x) => s + x.duration, 0) / 60),
      count: list.length,
    };
  });
  const thisMonth = months[months.length - 1];
  const maxMonth = Math.max(1, ...months.map((m) => m.minutes));

  const recent = [...sessions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12);

  return (
    <div className="flex flex-col h-full bg-[#080808] text-white overflow-y-auto no-scrollbar">
      <div className="px-6 safe-top pb-5 flex items-end justify-between">
        <div>
          <div className="text-[#c5ff50] text-[10px] font-bold tracking-[0.22em] uppercase mb-1.5">
            나의 기록
          </div>
          <div
            className="font-black text-4xl leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            대시보드
          </div>
        </div>
        <button onClick={onBack} className="text-[#555] text-sm hover:text-[#888] transition-colors">
          ← 뒤로
        </button>
      </div>

      {/* Streak hero */}
      <div className="mx-6 mb-3 bg-[#0e0e0e] border border-[#1a1a1a] rounded-2xl p-5 flex items-center gap-5">
        <div>
          <div className="text-[#444] text-[10px] tracking-widest uppercase mb-1">현재 연속 일수</div>
          <div
            className="text-[#c5ff50] font-black leading-none"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(64px,16vw,84px)" }}
          >
            {streak}
          </div>
          <div className="text-[#444] text-xs mt-1">일 연속</div>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <div className="text-[#333] text-[10px] tracking-widest uppercase mb-1">누적 세션</div>
          <div className="text-white text-3xl font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
            {sessions.length}
          </div>
          <div className="text-[#333] text-xs">회</div>
        </div>
      </div>

      {/* Weekly dots */}
      <div className="mx-6 mb-3 bg-[#0e0e0e] border border-[#1a1a1a] rounded-2xl p-5">
        <div className="text-[#444] text-[10px] tracking-widest uppercase mb-4">이번 주</div>
        <div className="flex justify-between">
          {last7.map(({ key, label, active }) => (
            <div key={key} className="flex flex-col items-center gap-2">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  active ? "bg-[#c5ff50] text-[#080808]" : "bg-[#161616] text-[#333]"
                }`}
              >
                {active ? "✓" : ""}
              </div>
              <div className="text-[#444] text-xs">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly reading time */}
      <div className="mx-6 mb-3 bg-[#0e0e0e] border border-[#1a1a1a] rounded-2xl p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div className="text-[#444] text-[10px] tracking-widest uppercase">월별 읽기 시간</div>
          <div className="text-xs text-[#555]">
            이번 달{" "}
            <span className="text-white font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
              {thisMonth.minutes}
            </span>
            분 · {thisMonth.count}회
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 h-28">
          {months.map((m, i) => {
            const current = i === months.length - 1;
            return (
              <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                <div
                  className="text-[10px] text-[#555]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {m.minutes > 0 ? m.minutes : ""}
                </div>
                <div
                  className={`w-full max-w-7 rounded-t-md ${current ? "bg-[#c5ff50]" : "bg-[#2a2a2a]"}`}
                  style={{ height: `${Math.max(3, (m.minutes / maxMonth) * 72)}px` }}
                  title={`${m.label} ${m.minutes}분`}
                />
                <div className={`text-[10px] ${current ? "text-[#c5ff50]" : "text-[#444]"}`}>
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats grid */}
      <div className="mx-6 mb-3 grid grid-cols-2 gap-2.5">
        {[
          { label: "총 읽기 시간", value: totalMin, unit: "분", sub: "전체 세션" },
          { label: "읽은 장 수", value: totalChapters, unit: "장", sub: "누적 합계" },
          { label: "완독한 권", value: booksDone, unit: `/ ${BIBLE_BOOKS.length}`, sub: "모든 장 읽기 완료" },
          { label: "평균 세션", value: avgMin, unit: "분", sub: "1회 평균" },
        ].map(({ label, value, unit, sub }) => (
          <div key={label} className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-xl p-4">
            <div className="text-[#444] text-[9px] tracking-widest uppercase mb-2">{label}</div>
            <div className="text-white text-2xl font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
              {value}
              {unit && <span className="text-sm text-[#444] ml-1">{unit}</span>}
            </div>
            <div className="text-[#333] text-xs mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Recent readings */}
      <div className="mx-6 safe-bottom">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-[#444] text-[10px] tracking-widest uppercase">최근 읽기 기록</div>
          <div className="text-[10px] text-[#333]">{SYNC_LABEL[syncStatus]}</div>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-10 text-[#2a2a2a] text-sm">
            아직 기록이 없습니다.
            <br />
            첫 번째 읽기를 시작해 보세요!
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((s) => {
              const d = new Date(s.date + "T12:00:00");
              const dateStr = d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
              const emoji = moodEmoji(s.mood);
              return (
                <button
                  key={s.id}
                  onClick={() => onOpenSession(s)}
                  className="w-full text-left flex items-center gap-3 bg-[#0e0e0e] border border-[#1a1a1a] rounded-xl px-4 py-3 hover:border-[#252525] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{passageLabel(s)}</div>
                    <div className="text-[#444] text-xs mt-0.5">
                      {dateStr} · {chapterCount(s)}장{emoji ? ` · ${emoji}` : ""}
                    </div>
                  </div>
                  <div className="text-[#666] text-sm shrink-0" style={{ fontFamily: "var(--font-mono)" }}>
                    {formatTime(s.duration)}
                  </div>
                  <div className="text-[#333] text-xs shrink-0">카드 ›</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
