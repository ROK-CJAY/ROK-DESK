import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const ScaleContext = createContext(1);

export function useOverlayScale() {
  return useContext(ScaleContext);
}

export function ScaleFrame({
  children,
  width = 1920,
  height = 1080,
}: {
  children: ReactNode;
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef({ scale: 1, x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const boxW = el.clientWidth || rect.width;
      const boxH = el.clientHeight || rect.height;
      if (boxW < 2 || boxH < 2) return;
      const nearNative = Math.abs(boxW - width) <= 16 && Math.abs(boxH - height) <= 16;
      const next = nearNative ? 1 : Math.round(Math.min(boxW / width, boxH / height) * 1000) / 1000;
      const x = nearNative ? 0 : Math.round((boxW - width * next) / 2);
      const y = nearNative ? 0 : Math.round((boxH - height * next) / 2);
      if (
        Math.abs(last.current.scale - next) < 0.001 &&
        Math.abs(last.current.x - x) < 1 &&
        Math.abs(last.current.y - y) < 1
      ) {
        return;
      }
      last.current = { scale: next, x, y };
      setScale(next);
      setOffset({ x, y });
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    update();
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [width, height]);

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      <ScaleContext.Provider value={scale}>
        <div
          className="absolute"
          style={{
            width,
            height,
            left: offset.x,
            top: offset.y,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            contain: "strict",
            willChange: "transform",
          }}
        >
          {children}
        </div>
      </ScaleContext.Provider>
    </div>
  );
}
