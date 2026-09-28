export interface Passage {
  bookIndex: number;
  fromChapter: number;
  toChapter: number;
  /** 절 단위 선택일 때만 존재 */
  fromVerse?: number;
  toVerse?: number;
}

export interface Session extends Passage {
  id: string;
  /** 로컬 날짜 YYYY-MM-DD */
  date: string;
  /** 초 단위 읽은 시간 */
  duration: number;
  mood?: string;
  createdAt: string;
}

export type Screen = "home" | "timer" | "complete" | "sharecard" | "dashboard";
