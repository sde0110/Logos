import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vercel Supabase 연동이 NEXT_PUBLIC_* 이름으로 공개 키를 넣어 주므로 함께 노출
  envPrefix: ["VITE_", "NEXT_PUBLIC_SUPABASE_"],
});
