"use client";

import { TouchEvent, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { ProductMedia } from "@/lib/types";

interface ProductMediaCarouselProps {
  media: ProductMedia[];
  productName: string;
  className?: string;
}

export function ProductMediaCarousel({ media, productName, className }: ProductMediaCarouselProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const sortedMedia = useMemo(
    () => [...media].sort((a, b) => a.sortOrder - b.sortOrder),
    [media]
  );

  if (sortedMedia.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded bg-slate-100 text-slate-500 ${className || "h-56"}`}>
        No media
      </div>
    );
  }

  const active = sortedMedia[index];
  const mediaBaseUrl = API_BASE_URL.replace(/\/api$/, "");
  const src = `${mediaBaseUrl}/uploads/${active.filePath}`;

  const hasMultiple = sortedMedia.length > 1;

  function prev() {
    setIndex((current) => (current === 0 ? sortedMedia.length - 1 : current - 1));
  }

  function next() {
    setIndex((current) => (current === sortedMedia.length - 1 ? 0 : current + 1));
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const deltaX = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(deltaX) < 40) return;
    if (deltaX < 0) {
      next();
      return;
    }
    prev();
  }

  return (
    <div className="relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {active.fileType === "VIDEO" ? (
        <video controls className={`w-full rounded object-cover ${className || "h-56"}`} src={src} />
      ) : (
        <img className={`w-full rounded object-cover ${className || "h-56"}`} src={src} alt={productName} />
      )}

      {hasMultiple ? (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded bg-black/60 px-2 py-1 text-xs text-white"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-black/60 px-2 py-1 text-xs text-white"
          >
            Next
          </button>
          <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-1.5 rounded bg-black/40 px-2 py-1">
            {sortedMedia.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Go to media ${itemIndex + 1}`}
                className={`h-2 w-2 rounded-full ${itemIndex === index ? "bg-white" : "bg-white/50"}`}
                onClick={() => setIndex(itemIndex)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
