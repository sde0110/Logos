import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface Account {
  id: string;
  isAnonymous: boolean;
  name?: string;
  avatarUrl?: string;
}

export const toAccount = (user?: User | null): Account | null => {
  if (!user) return null;
  const kakao = user.identities?.find((i) => i.provider === "kakao")?.identity_data ?? {};
  const meta = { ...kakao, ...user.user_metadata } as Record<string, string | undefined>;
  return {
    id: user.id,
    isAnonymous: user.is_anonymous ?? false,
    name: meta.name ?? meta.full_name ?? meta.nickname ?? meta.preferred_username ?? user.email,
    avatarUrl: meta.avatar_url ?? meta.picture,
  };
};

const redirectTo = () => window.location.origin + window.location.pathname;

const signInWithKakao = () =>
  supabase!.auth.signInWithOAuth({ provider: "kakao", options: { redirectTo: redirectTo() } });

/**
 * 익명 사용자는 지금 계정에 카카오를 연결(linkIdentity)해 기록을 그대로 유지한다.
 * 이미 로그인된 적 있는 카카오 계정이면 돌아온 뒤 handleAuthRedirect가 그 계정으로 로그인시킨다.
 */
export async function connectKakao() {
  if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.is_anonymous) {
    const { error } = await supabase.auth.linkIdentity({
      provider: "kakao",
      options: { redirectTo: redirectTo() },
    });
    if (!error) return;
    console.warn("[LOGOS] 계정 연결 실패, 카카오 로그인으로 전환", error);
  }
  const { error } = await signInWithKakao();
  if (error) throw error;
}

let redirectHandled = false;

/**
 * OAuth에서 돌아온 URL의 오류를 처리한다.
 * - identity_already_exists: 이 카카오 계정이 다른(기존) 사용자에 이미 연결됨 → 그 계정으로 로그인
 *   (로그인 후 동기화 과정에서 이 기기의 기록이 기존 계정으로 합쳐진다)
 */
export async function handleAuthRedirect(): Promise<{ redirecting: boolean; error?: string }> {
  if (!supabase || redirectHandled) return { redirecting: false };
  redirectHandled = true;

  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = query.get("error_code") ?? hash.get("error_code");
  const description = query.get("error_description") ?? hash.get("error_description");
  if (!code && !description) return { redirecting: false };

  window.history.replaceState(null, "", redirectTo());
  if (code === "identity_already_exists") {
    const { error } = await signInWithKakao();
    if (!error) return { redirecting: true };
  }
  return { redirecting: false, error: "카카오 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요." };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
