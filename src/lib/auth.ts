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
    name: meta.nickname ?? meta.name ?? meta.full_name ?? meta.preferred_username ?? user.email,
    avatarUrl: meta.picture ?? meta.avatar_url,
  };
};

const KAKAO_REST_API_KEY = import.meta.env.KAKAO_REST_API_KEY as string | undefined;
export const isKakaoConfigured = Boolean(supabase && KAKAO_REST_API_KEY);

/** 인가 요청 때 만든 state/nonce를 콜백까지 보관 */
const PENDING_KEY = "logos_v1_kakao_pending";

const redirectUri = () => `${window.location.origin}/`;

const randomHex = (bytes = 32) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");

const sha256Hex = async (text: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * 카카오 OpenID Connect 로그인 시작.
 * Supabase의 카카오 OAuth는 이메일(account_email) 권한을 항상 요청해 비즈 앱이 아니면 KOE205가 나므로,
 * 닉네임·프로필 사진만 요청해 ID 토큰을 받은 뒤 Supabase에는 ID 토큰으로 로그인한다.
 */
export async function connectKakao() {
  if (!isKakaoConfigured) throw new Error("카카오 로그인이 설정되지 않았습니다.");
  const state = randomHex(16);
  const nonce = randomHex(32);
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state, nonce }));

  const params = new URLSearchParams({
    client_id: KAKAO_REST_API_KEY!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid profile_nickname profile_image",
    state,
    // Supabase는 전달한 nonce의 SHA-256 값을 ID 토큰의 nonce와 비교한다
    nonce: await sha256Hex(nonce),
  });
  window.location.assign(`https://kauth.kakao.com/oauth/authorize?${params}`);
}

type Pending = { state: string; nonce: string };

const takePending = (): Pending | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

let callbackHandled = false;

/**
 * 카카오에서 돌아온 ?code=&state= 를 처리한다.
 * - 익명 사용자: 지금 계정에 카카오를 연결(linkIdentity) → 기록 그대로 유지
 * - 이미 다른 사용자에 연결된 카카오 계정: 그 계정으로 로그인(이 기기 기록은 동기화 때 합쳐짐)
 */
export async function handleKakaoCallback(): Promise<{ handled: boolean; error?: string }> {
  if (!supabase || callbackHandled) return { handled: false };
  const query = new URLSearchParams(window.location.search);
  const code = query.get("code");
  const state = query.get("state");
  const kakaoError = query.get("error");
  if (!state || (!code && !kakaoError)) return { handled: false };
  callbackHandled = true;

  const pending = takePending();
  window.history.replaceState(null, "", window.location.pathname);

  // 사용자가 동의 화면에서 취소
  if (kakaoError === "access_denied") return { handled: true };
  if (kakaoError || !code) return { handled: true, error: "카카오 로그인에 실패했습니다." };
  if (!pending || pending.state !== state) {
    return { handled: true, error: "로그인 요청이 만료됐습니다. 다시 시도해 주세요." };
  }

  const res = await fetch("/api/kakao-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const tokens = await res.json().catch(() => ({}));
  if (!res.ok || !tokens.id_token) {
    console.warn("[LOGOS] 카카오 토큰 교환 실패", tokens);
    return {
      handled: true,
      error: `카카오 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요. (${tokens.error_code ?? tokens.error ?? res.status})`,
    };
  }

  const credentials = {
    provider: "kakao",
    token: tokens.id_token as string,
    access_token: tokens.access_token as string | undefined,
    nonce: pending.nonce,
  };

  const { data } = await supabase.auth.getSession();
  if (data.session?.user.is_anonymous) {
    const { error } = await supabase.auth.linkIdentity(credentials);
    if (!error) {
      // 연결된 카카오 프로필이 user 객체에 반영되도록 최신 정보로 갱신
      await supabase.auth.refreshSession();
      return { handled: true };
    }
    if (error.code !== "identity_already_exists") {
      console.warn("[LOGOS] 카카오 계정 연결 실패", error);
      return { handled: true, error: `카카오 계정 연결에 실패했습니다. (${error.code ?? error.message})` };
    }
  }

  const { error } = await supabase.auth.signInWithIdToken(credentials);
  if (error) {
    console.warn("[LOGOS] 카카오 로그인 실패", error);
    return { handled: true, error: `카카오 로그인에 실패했습니다. (${error.code ?? error.message})` };
  }
  return { handled: true };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
