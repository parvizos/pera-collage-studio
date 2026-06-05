import { useEffect, useRef } from "react";
import type { Template, CollageState } from "../api/types";
import { renderCollage } from "../render/renderer";

interface Props {
  template: Template;
  state: CollageState;
  showGuides?: boolean;
  className?: string;
}

export function CollageCanvas({ template, state, showGuides, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    renderCollage(ctx, template, state, { showGuides }).catch((err) => {
      if (!cancelled) console.error("Ошибка отрисовки коллажа:", err);
    });
    return () => {
      cancelled = true;
    };
  }, [template, state, showGuides]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "auto", display: "block" }}
    />
  );
}
