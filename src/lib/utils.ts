import { BIBLE_BOOKS } from "../data/bible";
import type { Passage, Session } from "../types";

/** 로컬 시간대 기준 YYYY-MM-DD (toISOString은 UTC라 한국 오전 9시 이전에 날짜가 밀림) */
export const dateKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayStr = () => dateKey();

export const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const hasVerses = (p: Passage) => p.fromVerse != null && p.toVerse != null;

export const passageLabel = (p: Passage) => {
  const abbr = BIBLE_BOOKS[p.bookIndex].abbr;
  if (hasVerses(p)) {
    if (p.fromChapter === p.toChapter) {
      return p.fromVerse === p.toVerse
        ? `${abbr} ${p.fromChapter}:${p.fromVerse}`
        : `${abbr} ${p.fromChapter}:${p.fromVerse}–${p.toVerse}`;
    }
    return `${abbr} ${p.fromChapter}:${p.fromVerse}–${p.toChapter}:${p.toVerse}`;
  }
  return p.fromChapter === p.toChapter
    ? `${abbr} ${p.fromChapter}`
    : `${abbr} ${p.fromChapter}–${p.toChapter}`;
};

export const chapterCount = (p: Passage) => p.toChapter - p.fromChapter + 1;

/** 장당 평균 페이스(초) */
export const paceOf = (duration: number, p: Passage) => {
  const chs = chapterCount(p);
  return chs > 0 ? Math.round(duration / chs) : 0;
};

/** asOf 날짜(기본 오늘) 기준 연속 읽기 일수 */
export const calcStreak = (sessions: Pick<Session, "date">[], asOf?: string): number => {
  if (!sessions.length) return 0;
  const dates = new Set(sessions.map((s) => s.date));
  let streak = 0;
  const base = asOf ? new Date(asOf + "T12:00:00") : new Date();
  for (let i = 0; i < 3650; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    if (dates.has(dateKey(d))) {
      streak++;
    } else if (i === 0) {
      // 오늘 아직 안 읽었으면 어제부터 이어서 센다
    } else {
      break;
    }
  }
  return streak;
};

/** 실제로 끝까지 읽은 장만 모아 권별 완독 여부를 계산 */
export const completedChapters = (sessions: Session[]) => {
  const read = BIBLE_BOOKS.map(() => new Set<number>());
  for (const s of sessions) {
    const book = BIBLE_BOOKS[s.bookIndex];
    if (!book) continue;
    for (let ch = s.fromChapter; ch <= s.toChapter; ch++) {
      if (hasVerses(s)) {
        const startsAtTop = ch > s.fromChapter || s.fromVerse === 1;
        const endsAtBottom = ch < s.toChapter || s.toVerse! >= book.verses[ch - 1];
        if (!startsAtTop || !endsAtBottom) continue;
      }
      read[s.bookIndex].add(ch);
    }
  }
  return read;
};

export const completedBooks = (sessions: Session[]) =>
  completedChapters(sessions).filter((set, i) => set.size >= BIBLE_BOOKS[i].chapters).length;

export const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (+c ^ (Math.random() * 16) >> (+c / 4)).toString(16)
      );
