import { createClient } from "@supabase/supabase-js";

const env = import.meta.env;
const url = (env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined;
const key = (env.VITE_SUPABASE_ANON_KEY ??
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string | undefined;

export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // 카카오 로그인 후 돌아온 ?code= 를 자동으로 세션으로 교환
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      })
    : null;

/** 기존 세션이 없으면 익명 로그인 (Supabase 대시보드에서 Anonymous Sign-Ins 활성화 필요) */
export async function ensureUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return anon.user?.id ?? null;
}
