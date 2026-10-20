import type { ManaColor } from "@/lib/commander-colors";

export function ManaPip({ color, className = "size-[1.35rem]" }: { color: ManaColor | "C"; className?: string }) {
  const fill = color === "W" ? "#f4edd4" : color === "U" ? "#0e68ab" : color === "B" ? "#16141c" : color === "R" ? "#d3202a" : color === "G" ? "#00733e" : "#9a9388";
  const ink = color === "W" ? "#c4a24a" : color === "B" ? "#ddd8cf" : "#f7f4ee";
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={`${className} shrink-0 drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.65)]`}>
      <circle cx="8" cy="8" r="7.2" fill={fill} stroke={color === "W" ? "#c4a24a" : "rgb(255 255 255 / 0.35)"} strokeWidth="0.8" />
      {color === "W" ? <path fill={ink} d="M8 2.2 9.1 6.2h4.1L10 8.6l1.1 4L8 10.2 4.9 12.6 6 8.6 2.8 6.2h4.1z" /> : null}
      {color === "U" ? <path fill={ink} d="M8 2.4c2.2 2.6 3.3 4.4 3.3 6.1A3.3 3.3 0 0 1 8 11.8 3.3 3.3 0 0 1 4.7 8.5C4.7 6.8 5.8 5 8 2.4Z" /> : null}
      {color === "B" ? (
        <path
          fill={ink}
          d="M8 3.1a2.1 2.1 0 0 0-2.1 2.2c0 .8.4 1.3.4 1.8 0 .3-.3.5-.6.7-.7.4-1.2 1.1-1.2 2a2.4 2.4 0 0 0 2.5 2.4h2c1.4 0 2.5-1 2.5-2.4 0-.9-.5-1.6-1.2-2-.3-.2-.6-.4-.6-.7 0-.5.4-1 .4-1.8A2.1 2.1 0 0 0 8 3.1Zm-1.15 2.3a.55.55 0 1 1 0 1.1.55.55 0 0 1 0-1.1Zm2.3 0a.55.55 0 1 1 0 1.1.55.55 0 0 1 0-1.1ZM8 8.2c.7 0 1.15.45.7 1.15-.35.5-.7.55-.7.55s-.35-.05-.7-.55c-.45-.7 0-1.15.7-1.15Z"
        />
      ) : null}
      {color === "R" ? <path fill={ink} d="M8.2 2.2c.4 1.8-.2 2.7-.8 3.6-.5.7-.5 1.3-.1 1.9.5.8 1.6.7 2 .1.3 1.5-.2 2.6-1.3 3.5-1.7 1.3-4.2.4-4.4-1.7-.1-1.5.8-2.4 1.1-3.6.2-.8-.1-1.5-.6-2.3 1.2.2 2.1-.2 4.1-1.5Z" /> : null}
      {color === "G" ? <path fill={ink} d="M8 2.3 11.4 8H9.3v1.2h1.4L8 13.2 5.3 9.2h1.4V8H4.6L8 2.3Z" /> : null}
      {color === "C" ? <path fill={ink} d="M8 3.2 12.2 8 8 12.8 3.8 8 8 3.2Z" /> : null}
    </svg>
  );
}
