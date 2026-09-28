import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vercel Supabase 연동이 NEXT_PUBLIC_* 이름으로 공개 키를 넣어 주므로 함께 노출.
  // KAKAO_REST_API_KEY는 인가 URL에 그대로 드러나는 공개 값 (Client Secret은 노출하지 않음)
  envPrefix: ["VITE_", "NEXT_PUBLIC_SUPABASE_", "KAKAO_REST_"],
});
