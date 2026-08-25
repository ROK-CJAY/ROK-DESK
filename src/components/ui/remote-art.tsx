import { useEffect, useMemo, useState } from "react";
import { cardImageCandidates } from "@/lib/card-lookup";
import { cn } from "@/lib/cn";

export function useCardImageSrc(image?: string, size: "low" | "high" = "high", id?: string) {
  const candidates = useMemo(() => cardImageCandidates(image, size, id), [image, size, id]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [image, size, id]);
  const src = candidates[index] ?? "";
  return {
    src,
    onError: () => {
      setIndex((current) => current + 1);
    },
    empty: !src,
  };
}

export function RemoteArt({
  image,
  id,
  size = "high",
  className,
  alt = "",
}: {
  image?: string;
  id?: string;
  size?: "low" | "high";
  className?: string;
  alt?: string;
}) {
  const { src, onError, empty } = useCardImageSrc(image, size, id);
  if (empty) {
    return (
      <span className={cn("grid place-items-center bg-surface text-[0.6rem] text-muted", className)}>
        —
      </span>
    );
  }
  return <img key={src} src={src} alt={alt} className={className} referrerPolicy="no-referrer" onError={onError} />;
}
