// 카카오 인가 코드 → ID 토큰 교환 (Vercel Function)
// Client Secret은 브라우저에 노출하면 안 되므로 서버에서만 교환한다.
// 필요한 환경 변수: KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET(카카오에서 Client Secret을 켠 경우)

export async function POST(request) {
  const clientId = process.env.KAKAO_REST_API_KEY;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  if (!clientId) return Response.json({ error: "not_configured" }, { status: 500 });

  let code;
  try {
    ({ code } = await request.json());
  } catch {
    // 아래에서 처리
  }
  if (typeof code !== "string" || !code || code.length > 1024) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  // 인가 요청 때와 같은 redirect_uri여야 한다. 클라이언트 입력을 믿지 않고 요청 주소로 계산
  const redirectUri = `${new URL(request.url).origin}/`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
  });
  if (clientSecret) body.set("client_secret", clientSecret);

  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id_token) {
    return Response.json(
      { error: data.error ?? "token_exchange_failed", error_code: data.error_code },
      { status: 400 }
    );
  }
  // refresh_token은 필요 없으므로 돌려주지 않는다
  return Response.json(
    { id_token: data.id_token, access_token: data.access_token },
    { headers: { "Cache-Control": "no-store" } }
  );
}
