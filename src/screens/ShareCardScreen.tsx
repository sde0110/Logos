import { useEffect, useState, type ChangeEvent, type CSSProperties } from "react";
import { moodEmoji } from "../data/moods";
import { formatTime, paceOf, passageLabel } from "../lib/utils";
import type { Session } from "../types";

const TEMPLATES = ["클래식", "볼드", "분할", "미니멀"];

const DISPLAY = '"Barlow Condensed", "Noto Sans KR", sans-serif';
const BODY = '"Inter", "Noto Sans KR", sans-serif';
/** 미리보기와 같은 1080 좌표계로 그린 뒤 2배로 출력 (2160×2160) */
const EXPORT_SCALE = 2;

export default function ShareCardScreen({
  session,
  streak,
  onDone,
}: {
  session: Session;
  streak: number;
  onDone: () => void;
}) {
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [template, setTemplate] = useState(0);
  const [textColor, setTextColor] = useState<"light" | "dark">("light");
  const [opacity, setOpacity] = useState(55);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const passage = passageLabel(session);
  const timeStr = formatTime(session.duration);
  const paceStr = formatTime(paceOf(session.duration, session));
  const emoji = moodEmoji(session.mood);
  const moodSuffix = emoji ? ` · ${emoji}` : "";

  const fg = textColor === "light" ? "#ffffff" : "#080808";
  const fgClass = textColor === "light" ? "text-white" : "text-[#080808]";
  const subFgClass = textColor === "light" ? "text-white/60" : "text-black/50";
  const ov = opacity / 100;

  useEffect(() => {
    return () => {
      if (bgImage) URL.revokeObjectURL(bgImage);
    };
  }, [bgImage]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgImage(URL.createObjectURL(file));
    e.target.value = "";
  };

  const getOverlayStyle = (): CSSProperties => {
    if (template === 0)
      return {
        background: `linear-gradient(to top, rgba(0,0,0,${ov + 0.15}) 0%, rgba(0,0,0,${ov * 0.3}) 50%, rgba(0,0,0,0) 100%)`,
      };
    if (template === 1) return { background: `rgba(0,0,0,${ov})` };
    if (template === 2)
      return {
        background: `linear-gradient(to right, rgba(0,0,0,${ov + 0.1}) 55%, transparent 55%)`,
      };
    return { background: `rgba(0,0,0,${ov * 0.4})` };
  };

  const renderCard = async (): Promise<Blob> => {
    const W = 1080,
      H = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = W * EXPORT_SCALE;
    canvas.height = H * EXPORT_SCALE;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
    ctx.imageSmoothingQuality = "high";

    if (bgImage) {
      const img = new Image();
      img.src = bgImage;
      await img.decode();
      const scale = Math.max(W / img.width, H / img.height);
      const sw = W / scale,
        sh = H / scale;
      const sx = (img.width - sw) / 2,
        sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    } else {
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, W, H);
    }

    // 캔버스는 폰트가 로드돼 있어야 그려지므로 사용할 글자로 미리 로드
    const text = `${passage}${timeStr}총 읽기 시간일 연속장LOGOS`;
    await Promise.all([
      document.fonts.load(`900 1px "Barlow Condensed"`, text),
      document.fonts.load(`700 1px "Inter"`, text),
      document.fonts.load(`900 1px "Noto Sans KR"`, text),
      document.fonts.load(`400 1px "Noto Sans KR"`, text),
    ]).catch(() => {});

    if (template === 0) {
      const grad = ctx.createLinearGradient(0, H * 0.35, 0, H);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, `rgba(0,0,0,${ov + 0.15})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#c5ff50";
      ctx.font = `900 44px ${DISPLAY}`;
      ctx.textAlign = "left";
      ctx.fillText("LOGOS", 72, 100);
      ctx.fillStyle = fg;
      ctx.font = `900 160px ${DISPLAY}`;
      ctx.textAlign = "right";
      ctx.fillText(timeStr, W - 72, 200);
      ctx.font = `400 26px ${BODY}`;
      ctx.fillStyle = fg + "88";
      ctx.fillText("총 읽기 시간", W - 72, 240);
      ctx.textAlign = "left";
      ctx.fillStyle = fg;
      ctx.font = `900 76px ${DISPLAY}`;
      ctx.fillText(passage, 72, H - 190);
      ctx.fillStyle = fg + "99";
      ctx.font = `400 28px ${BODY}`;
      ctx.fillText(`${paceStr} / 장  ·  ${streak}일 연속${moodSuffix}`, 72, H - 130);
      ctx.fillStyle = "#c5ff50";
      ctx.fillRect(72, H - 100, 90, 3);
      ctx.fillStyle = fg + "55";
      ctx.font = `400 24px ${BODY}`;
      ctx.fillText(
        new Date(session.date + "T12:00:00").toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        72,
        H - 60
      );
    } else if (template === 1) {
      ctx.fillStyle = `rgba(0,0,0,${ov})`;
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#c5ff50";
      ctx.font = `700 32px ${BODY}`;
      ctx.fillText("LOGOS", W / 2, 88);
      ctx.fillStyle = fg;
      ctx.font = `900 220px ${DISPLAY}`;
      ctx.fillText(timeStr, W / 2, H / 2 + 70);
      ctx.fillStyle = fg + "77";
      ctx.font = `500 30px ${BODY}`;
      ctx.fillText("총 읽기 시간", W / 2, H / 2 + 120);
      ctx.fillStyle = fg;
      ctx.font = `700 70px ${DISPLAY}`;
      ctx.fillText(passage, W / 2, H / 2 + 220);
      ctx.fillStyle = fg + "99";
      ctx.font = `400 28px ${BODY}`;
      ctx.fillText(`${paceStr} / 장  ·  ${streak}일 연속${moodSuffix}`, W / 2, H / 2 + 280);
    } else if (template === 2) {
      ctx.fillStyle = `rgba(0,0,0,${ov + 0.1})`;
      ctx.fillRect(0, 0, W * 0.55, H);
      ctx.textAlign = "left";
      ctx.fillStyle = "#c5ff50";
      ctx.font = `700 30px ${BODY}`;
      ctx.fillText("LOGOS", 72, 88);
      ctx.fillStyle = fg;
      ctx.font = `900 120px ${DISPLAY}`;
      ctx.fillText(timeStr, 72, H / 2 - 30);
      ctx.fillStyle = fg + "77";
      ctx.font = `500 24px ${BODY}`;
      ctx.fillText("총 읽기 시간", 72, H / 2 + 10);
      ctx.fillStyle = "#c5ff50";
      ctx.fillRect(72, H / 2 + 38, 64, 2);
      ctx.fillStyle = fg;
      ctx.font = `700 56px ${DISPLAY}`;
      ctx.fillText(passage, 72, H / 2 + 110, W * 0.55 - 100);
      ctx.fillStyle = fg + "88";
      ctx.font = `400 24px ${BODY}`;
      ctx.fillText(`${paceStr}/장`, 72, H / 2 + 155);
      ctx.fillText(`${streak}일 연속${moodSuffix}`, 72, H / 2 + 190);
    } else {
      ctx.fillStyle = `rgba(0,0,0,${ov * 0.4})`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(0,0,0,${ov + 0.15})`;
      ctx.fillRect(0, H - 180, W, 180);
      ctx.textAlign = "left";
      ctx.fillStyle = "#c5ff50";
      ctx.font = `700 20px ${BODY}`;
      ctx.fillText("LOGOS", 72, H - 136);
      ctx.fillStyle = fg;
      ctx.font = `900 88px ${DISPLAY}`;
      ctx.fillText(passage, 72, H - 56, W * 0.55);
      ctx.textAlign = "right";
      ctx.fillStyle = fg + "88";
      ctx.font = `400 26px ${BODY}`;
      ctx.fillText(`${timeStr}  ·  ${paceStr}/장  ·  ${streak}일${moodSuffix}`, W - 72, H - 36);
    }

    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 생성 실패"))), "image/png")
    );
  };

  const downloadCard = async () => {
    setDownloading(true);
    setNotice(null);
    try {
      const blob = await renderCard();
      const fileName = `logos-${session.date}-${passage.replace(/[\s:–]/g, "-")}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const isTouch = window.matchMedia("(pointer: coarse)").matches;

      // 모바일은 공유 시트(사진에 저장·인스타그램 등)로, 데스크톱은 파일 다운로드로
      if (isTouch && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "LOGOS 리딩 인증" });
          return;
        } catch (err) {
          if ((err as DOMException).name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = fileName;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setNotice("고화질(2160×2160) 이미지를 저장했습니다.");
    } catch {
      setNotice("이미지를 만드는 중 문제가 발생했습니다. 다른 사진으로 다시 시도해 주세요.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#080808] text-white overflow-y-auto no-scrollbar">
      <div className="px-6 safe-top pb-4 flex items-start justify-between">
        <div>
          <div className="text-[#c5ff50] text-[10px] font-bold tracking-[0.22em] uppercase mb-1.5">
            공유 카드
          </div>
          <div className="font-black text-3xl" style={{ fontFamily: "var(--font-display)" }}>
            카드 만들기
          </div>
        </div>
        <button
          onClick={onDone}
          className="text-[#555] text-sm hover:text-[#888] transition-colors mt-1"
        >
          완료
        </button>
      </div>

      {/* Card preview */}
      <div className="mx-6 mb-5">
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#111]">
          {bgImage ? (
            <img
              src={bgImage}
              alt="카드 배경"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
              <div className="text-4xl opacity-20">📷</div>
              <div className="text-[#333] text-xs">배경 사진을 업로드하세요</div>
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0" style={getOverlayStyle()} />

          {/* Template 0: Classic */}
          {template === 0 && (
            <>
              <div className="absolute top-4 left-4">
                <span
                  className="text-[#c5ff50] text-lg font-black tracking-widest"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  LOGOS
                </span>
              </div>
              <div className="absolute top-4 right-4 text-right">
                <div
                  className={`font-black leading-none ${fgClass}`}
                  style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px,9vw,52px)" }}
                >
                  {timeStr}
                </div>
                <div className={`text-[9px] tracking-[0.18em] uppercase ${subFgClass}`}>
                  총 읽기 시간
                </div>
              </div>
              <div className="absolute bottom-5 left-4">
                <div
                  className={`font-black leading-none ${fgClass}`}
                  style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,6vw,36px)" }}
                >
                  {passage}
                </div>
                <div className={`text-[10px] ${subFgClass} mt-1`}>
                  {paceStr}/장 · {streak}일 연속{moodSuffix}
                </div>
                <div className="h-0.5 w-8 bg-[#c5ff50] mt-2" />
              </div>
            </>
          )}

          {/* Template 1: Bold centered */}
          {template === 1 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-5">
              <div className="text-[#c5ff50] text-[10px] font-bold tracking-[0.2em] uppercase mb-3">
                LOGOS
              </div>
              <div
                className={`font-black leading-none ${fgClass}`}
                style={{ fontFamily: "var(--font-display)", fontSize: "clamp(54px,13vw,72px)" }}
              >
                {timeStr}
              </div>
              <div className={`text-[9px] tracking-[0.18em] uppercase ${subFgClass} mt-1 mb-5`}>
                총 읽기 시간
              </div>
              <div
                className={`font-bold ${fgClass}`}
                style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,5.5vw,30px)" }}
              >
                {passage}
              </div>
              <div className={`text-[10px] ${subFgClass} mt-1`}>
                {paceStr}/장 · {streak}일 연속{moodSuffix}
              </div>
            </div>
          )}

          {/* Template 2: Split */}
          {template === 2 && (
            <div className="absolute inset-0 flex items-center p-5">
              <div className="w-1/2">
                <div className="text-[#c5ff50] text-[9px] font-bold tracking-[0.2em] uppercase mb-3">
                  LOGOS
                </div>
                <div
                  className={`font-black leading-none ${fgClass}`}
                  style={{ fontFamily: "var(--font-display)", fontSize: "clamp(38px,9vw,50px)" }}
                >
                  {timeStr}
                </div>
                <div className={`text-[9px] tracking-[0.15em] uppercase ${subFgClass}`}>
                  총 읽기 시간
                </div>
                <div className="h-0.5 w-6 bg-[#c5ff50] my-3" />
                <div
                  className={`font-bold ${fgClass}`}
                  style={{ fontFamily: "var(--font-display)", fontSize: "clamp(18px,4.5vw,24px)" }}
                >
                  {passage}
                </div>
                <div className={`text-[9px] ${subFgClass} mt-1`}>
                  {paceStr}/장 · {streak}일{moodSuffix}
                </div>
              </div>
            </div>
          )}

          {/* Template 3: Minimal */}
          {template === 3 && (
            <div
              className="absolute bottom-0 left-0 right-0 px-4 py-3"
              style={{ background: `rgba(0,0,0,${ov + 0.15})` }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[#c5ff50] text-[9px] font-bold tracking-[0.2em] uppercase">
                    LOGOS
                  </div>
                  <div
                    className={`font-black leading-tight truncate ${fgClass}`}
                    style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,6vw,32px)" }}
                  >
                    {passage}
                  </div>
                </div>
                <div className={`text-right shrink-0 ${subFgClass}`}>
                  <div className="text-base font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
                    {timeStr}
                  </div>
                  <div className="text-[9px]">
                    {paceStr}/장 · {streak}일{moodSuffix}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mx-6 space-y-4 safe-bottom">
        {/* Template */}
        <div>
          <div className="text-[#444] text-[10px] tracking-widest uppercase mb-2.5">템플릿</div>
          <div className="grid grid-cols-4 gap-2">
            {TEMPLATES.map((label, i) => (
              <button
                key={i}
                onClick={() => setTemplate(i)}
                className={`py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all ${
                  template === i
                    ? "bg-[#c5ff50] text-[#080808]"
                    : "bg-[#0e0e0e] border border-[#1a1a1a] text-[#555] hover:border-[#252525]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Text color */}
        <div className="flex items-center gap-4">
          <div className="text-[#444] text-[10px] tracking-widest uppercase">텍스트 색상</div>
          <div className="flex gap-2 ml-auto">
            {(["light", "dark"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setTextColor(c)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  textColor === c
                    ? c === "light"
                      ? "bg-white text-black border-white"
                      : "bg-[#111] text-white border-[#c5ff50]"
                    : "border-[#1e1e1e] text-[#555]"
                }`}
              >
                {c === "light" ? "◑ 밝게" : "● 어둡게"}
              </button>
            ))}
          </div>
        </div>

        {/* Overlay opacity */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[#444] text-[10px] tracking-widest uppercase">오버레이 투명도</div>
            <div className="text-[#555] text-xs" style={{ fontFamily: "var(--font-mono)" }}>
              {opacity}%
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="90"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full"
            aria-label="오버레이 투명도"
          />
        </div>

        {/* Upload */}
        <label className="block w-full py-3 border border-dashed border-[#1e1e1e] rounded-xl text-center text-[#555] text-xs cursor-pointer hover:border-[#c5ff50]/30 hover:text-[#c5ff50]/50 transition-all">
          {bgImage ? "📷  배경 사진 변경" : "📷  배경 사진 업로드"}
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>

        {/* Download */}
        <button
          onClick={downloadCard}
          disabled={downloading}
          className="w-full py-[16px] bg-[#c5ff50] text-[#080808] rounded-2xl font-black text-xl tracking-[0.18em] uppercase hover:bg-[#d4ff70] active:scale-[0.98] transition-all disabled:opacity-50"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {downloading ? "저장 중..." : "카드 저장하기"}
        </button>
        {notice && <div className="text-center text-[#555] text-xs">{notice}</div>}
      </div>
    </div>
  );
}
