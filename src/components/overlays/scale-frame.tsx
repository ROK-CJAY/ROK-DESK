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
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const next = Math.min(rect.width / width, rect.height / height);
      setScale(next);
      setOffset({
        x: (rect.width - width * next) / 2,
        y: (rect.height - height * next) / 2,
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
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
          }}
        >
          {children}
        </div>
      </ScaleContext.Provider>
    </div>
  );
}
