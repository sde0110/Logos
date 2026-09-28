# LOGOS 웹 MVP — 성경 통독 트래커

Figma Make 초안(다크 버전)을 기반으로 만든 Vite + React + Tailwind 웹앱입니다.

## 로컬 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ 생성
```

## 기능

- **범위 선택**: iOS 스타일 휠 피커로 권·장을 고릅니다. `절 단위`로 바꾸면 시작/끝의 장:절까지 지정할 수 있습니다. 모바일은 터치, 데스크톱은 마우스 드래그·휠·클릭을 지원합니다.
- **타이머**: 시작, 일시정지, 계속하기, 완료를 지원하고 장당 평균 페이스를 자동으로 계산합니다. 새로고침하거나 탭을 닫아도 이어서 읽을 수 있고, 지원하는 브라우저에서는 화면 꺼짐을 막습니다.
- **완료**: 총 시간, 페이스, 연속 일수를 보여 주고 오늘의 기분을 고를 수 있습니다.
- **공유 카드**: 배경 사진을 올리고 템플릿 4종을 고를 수 있으며, 글자색(밝게/어둡게)과 오버레이 투명도를 조절합니다. 2160×2160 PNG로 저장되며, 모바일에서는 공유 시트로, 데스크톱에서는 파일로 다운로드됩니다.
- **대시보드**: 연속 일수, 이번 주 기록, 월별 읽기 시간(최근 6개월), 총 시간, 읽은 장 수, 완독한 권 수, 최근 기록을 보여 줍니다. 기록을 누르면 그 기록으로 카드를 다시 만들 수 있습니다.

## Supabase 연결

Vercel 마켓플레이스로 만든 Supabase 프로젝트 `logos-db`(서울 리전)가 `logos` Vercel 프로젝트에 연결돼 있습니다.

- 환경 변수는 Vercel이 자동으로 넣어 줍니다. 앱은 공개 값인 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만 번들에 포함합니다(`vite.config.ts`의 `envPrefix`). 직접 지정하려면 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`를 쓰면 되고, 이 값이 우선합니다.
- 로컬 개발 환경에서는 `vercel env pull .env.local`로 변수를 받아오면 됩니다.
- 스키마는 `supabase/migrations/20260928000001_reading_logs.sql`에 있고, 이미 적용돼 있습니다. RLS가 켜져 있어 사용자는 자기 기록만 볼 수 있습니다.
- Authentication에서 **Anonymous sign-ins**를 켜 두었습니다. 브라우저마다 익명 계정이 하나씩 생기고, 로컬 기록은 서버와 자동으로 병합·업로드됩니다. 업로드에 실패한 기록은 다음 접속 때 다시 올립니다.
- 환경 변수가 없으면 브라우저 localStorage에만 저장됩니다.

### 카카오 로그인 (계정 연동)

대시보드의 **카카오 로그인** 버튼으로 동작합니다.

- 익명 사용자가 누르면 `linkIdentity`로 **지금 계정에 카카오를 연결**합니다. 사용자 id가 그대로라 기록도 그대로 남습니다.
- 그 카카오 계정이 이미 다른 기기에서 쓰이고 있으면(`identity_already_exists`) 그 계정으로 로그인합니다. 이 기기의 기록은 새 id로 복사해 기존 계정에 합칩니다.
- 로그아웃하면 이 기기의 로컬 기록을 비우고 새 익명 계정으로 시작합니다. 서버 기록은 그대로 있어서 다시 로그인하면 불러옵니다.

필요한 설정:

1. **Kakao Developers**
   - 앱을 만든 뒤 REST API 키를 확인합니다.
   - Kakao Login Redirect URI: `https://urgizmyvekrkdogzrpjy.supabase.co/auth/v1/callback`
   - Client Secret을 발급하고 활성화합니다.
   - 카카오 로그인 상태를 ON으로 켭니다.
   - 동의항목: 닉네임, 프로필 사진(이메일은 비즈 앱일 때만 가능)
2. **Supabase → Authentication**
   - Providers → Kakao: 켜고, REST API 키와 Client Secret을 넣고, **Allow users without an email**을 켭니다.
   - **Allow manual linking**을 켭니다.
   - URL Configuration → Site URL: `https://logos-livid-nu.vercel.app`
   - Redirect URLs: `https://logos-livid-nu.vercel.app/**`, `http://localhost:5173/**`, `http://localhost:4173/**`

## Vercel 배포

- GitHub 저장소 `sde0110/Logos`가 Vercel 프로젝트 `logos`에 연결돼 있습니다. `main`에 push하면 프로덕션에, 다른 브랜치나 PR은 미리보기 주소에 자동으로 배포됩니다.
- 직접 배포하려면 `vercel`(미리보기) 또는 `vercel --prod`를 실행합니다.
- 프로덕션 주소: https://logos-livid-nu.vercel.app

## 참고

- 절 수 데이터는 KJV 기준이라 개역개정과 일부 장에서 1~2절 차이가 날 수 있습니다.
- 페이스는 선택한 범위의 장 수로 나눠 계산합니다. 절 단위로 선택하면 걸친 장 수가 기준입니다.
