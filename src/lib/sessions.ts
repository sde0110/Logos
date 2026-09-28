import type { Session } from "../types";
import { ensureUserId, supabase } from "./supabase";
import { uuid } from "./utils";

const STORAGE_KEY = "logos_v1_sessions";

export type SyncStatus = "local" | "syncing" | "synced" | "error";

export const loadLocalSessions = (): Session[] => {
  try {
    const raw: Session[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    // Figma 초안 시절 데이터(createdAt 없음)도 읽을 수 있게 보정
    return raw.map((s) => ({ ...s, createdAt: s.createdAt ?? `${s.date}T12:00:00` }));
  } catch {
    return [];
  }
};

export const saveLocalSessions = (s: Session[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // 저장소를 쓸 수 없어도 화면은 메모리 상태로 계속 동작
  }
};

type Row = {
  id: string;
  read_on: string;
  book_index: number;
  from_chapter: number;
  to_chapter: number;
  from_verse: number | null;
  to_verse: number | null;
  duration_seconds: number;
  mood: string | null;
  created_at: string;
};

const toRow = (s: Session, userId: string) => ({
  id: s.id,
  user_id: userId,
  read_on: s.date,
  book_index: s.bookIndex,
  from_chapter: s.fromChapter,
  to_chapter: s.toChapter,
  from_verse: s.fromVerse ?? null,
  to_verse: s.toVerse ?? null,
  duration_seconds: s.duration,
  mood: s.mood ?? null,
  created_at: s.createdAt,
});

const fromRow = (r: Row): Session => ({
  id: r.id,
  date: r.read_on,
  bookIndex: r.book_index,
  fromChapter: r.from_chapter,
  toChapter: r.to_chapter,
  fromVerse: r.from_verse ?? undefined,
  toVerse: r.to_verse ?? undefined,
  duration: r.duration_seconds,
  mood: r.mood ?? undefined,
  createdAt: r.created_at,
});

const COLUMNS =
  "id,read_on,book_index,from_chapter,to_chapter,from_verse,to_verse,duration_seconds,mood,created_at";

async function fetchRemote(): Promise<Session[]> {
  const { data, error } = await supabase!
    .from("reading_logs")
    .select(COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

/** 서버 기록과 로컬 기록을 합치고, 서버에 없는 로컬 기록은 업로드 */
export async function syncSessions(local: Session[]): Promise<Session[] | null> {
  if (!supabase) return null;
  const userId = await ensureUserId();
  if (!userId) return null;

  let remote = await fetchRemote();
  const remoteIds = new Set(remote.map((s) => s.id));
  const missing = local.filter((s) => !remoteIds.has(s.id));

  if (missing.length) {
    // 같은 id가 다른 계정(예: 로그인 전 익명 계정)에 있으면 RLS 때문에 덮어쓸 수 없으므로 건너뛴다
    const { error } = await supabase
      .from("reading_logs")
      .upsert(missing.map((s) => toRow(s, userId)), { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
    remote = await fetchRemote();

    // 건너뛴 기록은 새 id로 복사해 현재 계정으로 옮긴다
    const nowIds = new Set(remote.map((s) => s.id));
    const foreign = missing.filter((s) => !nowIds.has(s.id));
    if (foreign.length) {
      const { error: copyErr } = await supabase
        .from("reading_logs")
        .insert(foreign.map((s) => toRow({ ...s, id: uuid() }, userId)));
      if (copyErr) throw copyErr;
      remote = await fetchRemote();
    }
  }

  saveLocalSessions(remote);
  return remote;
}

export async function pushSession(s: Session) {
  if (!supabase) return;
  const userId = await ensureUserId();
  if (!userId) return;
  const { error } = await supabase.from("reading_logs").upsert(toRow(s, userId));
  if (error) throw error;
}
