import { useState } from "react";

/** Lightweight WebP preview URL for a same-origin data image (originals untouched). */
export function thumbUrl(src: string, w: number): string {
  if (!src || /^https?:|^data:/.test(src)) return src;
  return `/api/img/thumb?src=${encodeURIComponent(src)}&w=${w}`;
}

/** <img> that loads a small preview, falling back to the original if it fails. */
export function Thumb({
  src,
  w,
  alt,
  className,
}: {
  src: string;
  w: number;
  alt?: string;
  className?: string;
}) {
  const [orig, setOrig] = useState(false);
  return (
    <img
      src={orig ? src : thumbUrl(src, w)}
      alt={alt || ""}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        if (!orig) setOrig(true);
      }}
    />
  );
}
