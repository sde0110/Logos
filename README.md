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

## Supabase 연결 (선택)

환경 변수가 없으면 브라우저 localStorage에만 저장됩니다.

1. Supabase 대시보드 → Authentication → Sign In / Providers에서 **Anonymous sign-ins**를 활성화합니다.
2. SQL Editor에서 `supabase/migrations/20260928000001_reading_logs.sql`을 실행합니다.
3. `.env.example`을 `.env`로 복사해 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`를 채웁니다.

익명 로그인으로 브라우저마다 계정이 하나씩 생기고, 로컬 기록은 서버와 자동으로 병합·업로드됩니다. 업로드에 실패한 기록은 다음 접속 때 다시 올립니다.

## Vercel 배포

- **GitHub 연동**: 저장소를 Vercel에 Import할 때 **Root Directory를 `web`**으로 지정합니다. Framework는 Vite로 자동 인식됩니다.
- **CLI**: `web/` 폴더에서 `npx vercel`(미리보기) 또는 `npx vercel --prod`를 실행합니다.
- Supabase를 쓰려면 Vercel 프로젝트 Settings → Environment Variables에 위 두 값을 넣고 다시 배포합니다.

## 참고

- 절 수 데이터는 KJV 기준이라 개역개정과 일부 장에서 1~2절 차이가 날 수 있습니다.
- 페이스는 선택한 범위의 장 수로 나눠 계산합니다. 절 단위로 선택하면 걸친 장 수가 기준입니다.
