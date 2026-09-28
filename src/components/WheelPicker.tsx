import { useRef, useEffect, useCallback, useState, type PointerEvent } from "react";

const ITEM_H = 52;
const VISIBLE = 5;

interface Column {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

interface WheelPickerProps {
  columns: Column[];
  columnWidths?: string[];
}

function WheelColumn({
  items,
  selectedIndex,
  onSelect,
  widthClass = "flex-1",
}: Column & { widthClass?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const animating = useRef(false);
  const mounted = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const drag = useRef<{ y: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  // 스크롤 도중에도 가운데 항목이 강조되도록 실시간 인덱스를 따로 둔다
  const [liveIndex, setLiveIndex] = useState(selectedIndex);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setLiveIndex(selectedIndex);
    const target = selectedIndex * ITEM_H;
    if (Math.abs(el.scrollTop - target) < 2) return;
    if (!mounted.current) {
      // 첫 렌더에서는 애니메이션 없이 바로 위치시킨다
      el.scrollTop = target;
      mounted.current = true;
      return;
    }
    animating.current = true;
    el.scrollTo({ top: target, behavior: "smooth" });
    const t = setTimeout(() => {
      animating.current = false;
    }, 450);
    return () => clearTimeout(t);
  }, [selectedIndex, items.length]);

  useEffect(() => {
    mounted.current = true;
  }, []);

  const clampIndex = useCallback(
    (top: number) => Math.max(0, Math.min(Math.round(top / ITEM_H), items.length - 1)),
    [items.length]
  );

  const settle = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = clampIndex(el.scrollTop);
    animating.current = true;
    el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    if (idx !== selectedIndex) onSelect(idx);
    setTimeout(() => {
      animating.current = false;
    }, 400);
  }, [clampIndex, onSelect, selectedIndex]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setLiveIndex(clampIndex(el.scrollTop));
    if (animating.current || drag.current) return;
    clearTimeout(timeout.current);
    timeout.current = setTimeout(settle, 90);
  }, [clampIndex, settle]);

  // 데스크톱 마우스 드래그 지원 (터치는 네이티브 스크롤 사용)
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !scrollRef.current) return;
    drag.current = { y: e.clientY, top: scrollRef.current.scrollTop, moved: false };
    scrollRef.current.style.scrollSnapType = "none";
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !scrollRef.current) return;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dy) > 3) drag.current.moved = true;
    scrollRef.current.scrollTop = drag.current.top - dy;
  };
  const endDrag = () => {
    if (!drag.current || !scrollRef.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    scrollRef.current.style.scrollSnapType = "y mandatory";
    if (moved) {
      // 드래그 직후 발생하는 click 이벤트는 무시
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      settle();
    }
  };

  const selectItem = (i: number) => {
    onSelect(i);
    animating.current = true;
    scrollRef.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
    setTimeout(() => {
      animating.current = false;
    }, 400);
  };

  return (
    <div className={`${widthClass} relative`} style={{ height: ITEM_H * VISIBLE }}>
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 z-10"
        style={{
          height: ITEM_H * 2,
          background: "linear-gradient(to bottom, #080808 0%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-10"
        style={{
          height: ITEM_H * 2,
          background: "linear-gradient(to top, #080808 0%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-0 right-0 z-10"
        style={{
          top: ITEM_H * 2,
          height: ITEM_H,
          borderTop: "1px solid rgba(197,255,80,0.2)",
          borderBottom: "1px solid rgba(197,255,80,0.2)",
          background: "rgba(255,255,255,0.02)",
        }}
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className="no-scrollbar h-full overflow-y-scroll cursor-grab active:cursor-grabbing"
        style={{ scrollSnapType: "y mandatory", touchAction: "pan-y" }}
      >
        <div style={{ height: ITEM_H * 2 }} />
        {items.map((item, i) => {
          const dist = Math.abs(i - liveIndex);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.35 : 0.12;
          const scale = dist === 0 ? 1 : dist === 1 ? 0.9 : 0.8;
          return (
            <div
              key={i}
              style={{ height: ITEM_H, scrollSnapAlign: "center", opacity, transform: `scale(${scale})` }}
              className={`flex items-center justify-center select-none transition-all duration-200 px-1 text-white text-sm ${
                i === liveIndex ? "font-semibold" : "font-normal"
              }`}
              onClick={() => {
                if (!suppressClick.current && i !== selectedIndex) selectItem(i);
              }}
            >
              <span className="text-center leading-tight truncate px-1">{item}</span>
            </div>
          );
        })}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
    </div>
  );
}

export default function WheelPicker({ columns, columnWidths }: WheelPickerProps) {
  return (
    <div
      className="flex overflow-hidden rounded-2xl"
      style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
    >
      {columns.map((col, i) => (
        <WheelColumn key={i} {...col} widthClass={columnWidths?.[i] ?? "flex-1"} />
      ))}
    </div>
  );
}
