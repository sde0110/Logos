import { useCallback, useEffect, useRef, useState } from "react";
import { connectKakao, handleKakaoCallback, isKakaoConfigured, signOut, toAccount, type Account } from "./lib/auth";
import { deleteAnonymousLeftovers, loadLocalSessions, pushSession, saveLocalSessions, syncSessions, type SyncStatus } from "./lib/sessions";
import { supabase } from "./lib/supabase";
import { calcStreak, todayStr, uuid } from "./lib/utils";
import CompleteScreen from "./screens/CompleteScreen";
import DashboardScreen from "./screens/DashboardScreen";
import HomeScreen from "./screens/HomeScreen";
import ShareCardScreen from "./screens/ShareCardScreen";
import TimerScreen, { loadActiveTimer } from "./screens/TimerScreen";
import type { Passage, Screen, Session } from "./types";

const PASSAGE_KEY = "logos_v1_last_passage";
/** 카카오 로그인에서 돌아오면 대시보드로 복귀 */
const RETURN_KEY = "logos_v1_return_screen";

// 모듈 로드 시 한 번만 읽는다 (StrictMode에서 초기화 함수가 두 번 호출돼도 안전)
const RETURN_SCREEN: Screen | null = (() => {
  try {
    const back = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return back === "dashboard" ? "dashboard" : null;
  } catch {
    return null;
  }
})();
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
  const [screen, setScreen] = useState<Screen>(activeTimer ? "timer" : (RETURN_SCREEN ?? "home"));
  const [passage, setPassage] = useState<Passage>(activeTimer?.passage ?? loadPassage);
  const [sessions, setSessions] = useState<Session[]>(loadLocalSessions);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(supabase ? "syncing" : "local");
  const [pending, setPending] = useState<{ passage: Passage; duration: number } | null>(null);
  const [shareSession, setShareSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PASSAGE_KEY, JSON.stringify(passage));
    } catch {
      // 무시
    }
  }, [passage]);

  // 동기화 요청이 겹치면 마지막 요청 결과만 반영
  const syncSeq = useRef(0);
  const runSync = useCallback((): Promise<boolean> => {
    if (!supabase) return Promise.resolve(false);
    const seq = ++syncSeq.current;
    setSyncStatus("syncing");
    return syncSessions(loadLocalSessions())
      .then((merged) => {
        if (seq !== syncSeq.current || !merged) return false;
        setSessions(merged);
        setSyncStatus("synced");
        return true;
      })
      .catch((err) => {
        console.warn("[LOGOS] Supabase 동기화 실패", err);
        if (seq === syncSeq.current) setSyncStatus("error");
        return false;
      });
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccount(toAccount(session?.user));
    });
    handleKakaoCallback()
      .catch((err): Awaited<ReturnType<typeof handleKakaoCallback>> => {
        console.warn("[LOGOS] 카카오 로그인 처리 실패", err);
        return { handled: true, error: "카카오 로그인에 실패했습니다." };
      })
      .then(async ({ error, previousAnonymous }) => {
        if (error) setAuthError(error);
        const merged = await runSync();
        // 기록이 카카오 계정으로 옮겨진 것을 확인한 뒤에만 익명 계정의 원본을 지운다
        if (merged && previousAnonymous) {
          deleteAnonymousLeftovers(previousAnonymous.userId, previousAnonymous.accessToken).catch((err) =>
            console.warn("[LOGOS] 이전 익명 기록 정리 실패", err)
          );
        }
      });
    return () => data.subscription.unsubscribe();
  }, [runSync]);

  const handleConnectKakao = async () => {
    setAuthError(null);
    try {
      sessionStorage.setItem(RETURN_KEY, "dashboard");
      await connectKakao();
    } catch (err) {
      console.warn("[LOGOS] 카카오 로그인 시작 실패", err);
      setAuthError("카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    // 이 기기에 남은 기록은 로그아웃한 계정의 것이므로 비우고, 새 익명 계정으로 시작
    saveLocalSessions([]);
    setSessions([]);
    runSync();
  };

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
            account={isKakaoConfigured ? account : undefined}
            authError={authError}
            onConnectKakao={handleConnectKakao}
            onSignOut={handleSignOut}
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
