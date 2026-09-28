import { useCallback, useEffect, useState } from "react";
import { loadLocalSessions, pushSession, saveLocalSessions, syncSessions, type SyncStatus } from "./lib/sessions";
import { supabase } from "./lib/supabase";
import { calcStreak, todayStr, uuid } from "./lib/utils";
import CompleteScreen from "./screens/CompleteScreen";
import DashboardScreen from "./screens/DashboardScreen";
import HomeScreen from "./screens/HomeScreen";
import ShareCardScreen from "./screens/ShareCardScreen";
import TimerScreen, { loadActiveTimer } from "./screens/TimerScreen";
import type { Passage, Screen, Session } from "./types";

const PASSAGE_KEY = "logos_v1_last_passage";
const DEFAULT_PASSAGE: Passage = { bookIndex: 42, fromChapter: 1, toChapter: 1 }; // 요한복음 1장

const loadPassage = (): Passage => {
  try {
    return JSON.parse(localStorage.getItem(PASSAGE_KEY) || "null") ?? DEFAULT_PASSAGE;
  } catch {
    return DEFAULT_PASSAGE;
  }
};

export default function App() {
  // 읽는 도중 새로고침했다면 타이머 화면으로 복귀
  const [activeTimer] = useState(loadActiveTimer);
  const [screen, setScreen] = useState<Screen>(activeTimer ? "timer" : "home");
  const [passage, setPassage] = useState<Passage>(activeTimer?.passage ?? loadPassage);
  const [sessions, setSessions] = useState<Session[]>(loadLocalSessions);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(supabase ? "syncing" : "local");
  const [pending, setPending] = useState<{ passage: Passage; duration: number } | null>(null);
  const [shareSession, setShareSession] = useState<Session | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PASSAGE_KEY, JSON.stringify(passage));
    } catch {
      // 무시
    }
  }, [passage]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    syncSessions(loadLocalSessions())
      .then((merged) => {
        if (cancelled || !merged) return;
        setSessions(merged);
        setSyncStatus("synced");
      })
      .catch((err) => {
        console.warn("[LOGOS] Supabase 동기화 실패", err);
        if (!cancelled) setSyncStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSession = useCallback((p: Passage, duration: number, mood: string) => {
    const s: Session = {
      ...p,
      id: uuid(),
      date: todayStr(),
      duration,
      mood,
      createdAt: new Date().toISOString(),
    };
    setSessions((prev) => {
      const updated = [...prev, s];
      saveLocalSessions(updated);
      return updated;
    });
    if (supabase) {
      pushSession(s)
        .then(() => setSyncStatus("synced"))
        .catch((err) => {
          console.warn("[LOGOS] 기록 업로드 실패 — 다음 접속 때 다시 시도합니다", err);
          setSyncStatus("error");
        });
    }
    return s;
  }, []);

  const handleFinish = (duration: number) => {
    setPending({ passage, duration });
    setScreen("complete");
  };

  const handleShare = (mood: string) => {
    if (!pending) return;
    setShareSession(saveSession(pending.passage, pending.duration, mood));
    setPending(null);
    setScreen("sharecard");
  };

  const handleDone = (mood: string) => {
    if (pending) saveSession(pending.passage, pending.duration, mood);
    setPending(null);
    setScreen("home");
  };

  return (
    <div className="h-dvh bg-[#080808] overflow-hidden">
      <div className="mx-auto h-full max-w-[480px] sm:border-x sm:border-[#111]">
        {screen === "home" && (
          <HomeScreen
            passage={passage}
            setPassage={setPassage}
            sessions={sessions}
            onStart={() => setScreen("timer")}
            onDashboard={() => setScreen("dashboard")}
          />
        )}
        {screen === "timer" && (
          <TimerScreen passage={passage} onFinish={handleFinish} onCancel={() => setScreen("home")} />
        )}
        {screen === "complete" && pending && (
          <CompleteScreen
            passage={pending.passage}
            duration={pending.duration}
            // 오늘 기록을 저장하면 달성될 연속 일수
            streak={calcStreak([...sessions, { date: todayStr() }])}
            onShare={handleShare}
            onDone={handleDone}
          />
        )}
        {screen === "sharecard" && shareSession && (
          <ShareCardScreen
            session={shareSession}
            streak={calcStreak(sessions, shareSession.date)}
            onDone={() => setScreen("home")}
          />
        )}
        {screen === "dashboard" && (
          <DashboardScreen
            sessions={sessions}
            syncStatus={syncStatus}
            onBack={() => setScreen("home")}
            onOpenSession={(s) => {
              setShareSession(s);
              setScreen("sharecard");
            }}
          />
        )}
      </div>
    </div>
  );
}
