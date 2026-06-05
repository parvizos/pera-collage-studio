import { useEffect, useMemo, useRef } from "react";
import type { CollageState, PhotoCell, PhotoTransform, Template } from "../api/types";
import { CollageCanvas } from "./CollageCanvas";
import { resolveScene } from "../render/scene";
import { normalizePhotoTransform } from "../render/primitives";
import { loadImage } from "../render/images";

interface Props {
  template: Template;
  state: CollageState;
  onChange: (next: CollageState) => void;
  onUploadPhoto?: (index: number, file: File) => void;
  showGuides?: boolean;
}

interface DragState {
  index: number;
  pointers: Map<number, { x: number; y: number }>;
  startTransform: PhotoTransform;
  startClientX: number;
  startClientY: number;
  startDistance: number;
  startCenterX: number;
  startCenterY: number;
  scaleFactor: number;
  rectLeft: number;
  rectTop: number;
  moved: boolean;
  imgW: number;
  imgH: number;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function CollageEditor({ template, state, onChange, onUploadPhoto, showGuides }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const dimsRef = useRef<Map<string, { w: number; h: number }>>(new Map());
  const fileInputs = useRef<(HTMLInputElement | null)[]>([]);

  const scene = useMemo(() => resolveScene(template, state), [template, state]);
  const canvasW = template.canvas.width;
  const canvasH = scene.canvasHeight;

  // Prevent the page from scrolling while zooming a photo with the wheel.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const handler = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-photo-cell="true"]')) e.preventDefault();
    };
    node.addEventListener("wheel", handler, { passive: false });
    return () => node.removeEventListener("wheel", handler);
  }, []);

  // Preload natural dimensions of every photo for bounds clamping.
  useEffect(() => {
    (state.photos ?? []).forEach((src) => {
      if (src && !dimsRef.current.has(src)) {
        loadImage(src)
          .then((img) => dimsRef.current.set(src, { w: img.width, h: img.height }))
          .catch(() => {});
      }
    });
  }, [state.photos]);

  function getTransform(index: number): PhotoTransform {
    return state.photoTransforms?.[index] ?? { scale: 1, offsetX: 0, offsetY: 0 };
  }

  function commitTransform(index: number, cell: PhotoCell, raw: PhotoTransform) {
    const src = state.photos?.[index];
    const dims = src ? dimsRef.current.get(src) : undefined;
    let next = raw;
    if (dims) {
      next = normalizePhotoTransform(
        { width: dims.w, height: dims.h } as HTMLImageElement,
        cell,
        raw,
      );
    } else {
      next = { ...raw, scale: Math.max(1, Math.min(raw.scale, 6)) };
    }
    const transforms = [...(state.photoTransforms ?? [])];
    transforms[index] = next;
    onChange({ ...state, photoTransforms: transforms });
  }

  function onPointerDown(index: number, cell: PhotoCell, e: React.PointerEvent) {
    if (!state.photos?.[index]) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleFactor = canvasW / rect.width;
    const src = state.photos[index]!;
    const dims = dimsRef.current.get(src) ?? { w: cell.width, h: cell.height };

    let drag = dragRef.current;
    if (!drag || drag.index !== index) {
      drag = {
        index,
        pointers: new Map(),
        startTransform: getTransform(index),
        startClientX: e.clientX,
        startClientY: e.clientY,
        startDistance: 0,
        startCenterX: 0,
        startCenterY: 0,
        scaleFactor,
        rectLeft: rect.left,
        rectTop: rect.top,
        moved: false,
        imgW: dims.w,
        imgH: dims.h,
      };
      dragRef.current = drag;
    }
    drag.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (drag.pointers.size === 1) {
      drag.startTransform = getTransform(index);
      drag.startClientX = e.clientX;
      drag.startClientY = e.clientY;
    } else if (drag.pointers.size === 2) {
      const pts = Array.from(drag.pointers.values());
      drag.startTransform = getTransform(index);
      drag.startDistance = distance(pts[0], pts[1]);
      drag.startCenterX = (pts[0].x + pts[1].x) / 2;
      drag.startCenterY = (pts[0].y + pts[1].y) / 2;
    }
  }

  function onPointerMove(index: number, cell: PhotoCell, e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.index !== index || !drag.pointers.has(e.pointerId)) return;
    drag.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const sf = drag.scaleFactor;

    if (drag.pointers.size >= 2) {
      const pts = Array.from(drag.pointers.values());
      const currentDistance = distance(pts[0], pts[1]);
      const ratio = drag.startDistance > 0 ? currentDistance / drag.startDistance : 1;
      const scale = drag.startTransform.scale * ratio;

      const cellCenterX = cell.x + cell.width / 2;
      const cellCenterY = cell.y + cell.height / 2;
      const startCenterCanvasX = (drag.startCenterX - drag.rectLeft) * sf;
      const startCenterCanvasY = (drag.startCenterY - drag.rectTop) * sf;
      const currentCenterX = (pts[0].x + pts[1].x) / 2;
      const currentCenterY = (pts[0].y + pts[1].y) / 2;
      const currentCenterCanvasX = (currentCenterX - drag.rectLeft) * sf;
      const currentCenterCanvasY = (currentCenterY - drag.rectTop) * sf;

      const anchorX = startCenterCanvasX - cellCenterX - drag.startTransform.offsetX;
      const anchorY = startCenterCanvasY - cellCenterY - drag.startTransform.offsetY;

      const offsetX =
        drag.startTransform.offsetX +
        (currentCenterCanvasX - startCenterCanvasX) +
        anchorX * (1 - ratio);
      const offsetY =
        drag.startTransform.offsetY +
        (currentCenterCanvasY - startCenterCanvasY) +
        anchorY * (1 - ratio);

      drag.moved = true;
      commitTransform(index, cell, { scale, offsetX, offsetY });
    } else {
      const dx = (e.clientX - drag.startClientX) * sf;
      const dy = (e.clientY - drag.startClientY) * sf;
      if (Math.hypot(dx, dy) > 4) drag.moved = true;
      commitTransform(index, cell, {
        scale: drag.startTransform.scale,
        offsetX: drag.startTransform.offsetX + dx,
        offsetY: drag.startTransform.offsetY + dy,
      });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    drag.pointers.delete(e.pointerId);
    if (drag.pointers.size === 0) {
      dragRef.current = null;
    }
  }

  function onWheel(index: number, cell: PhotoCell, e: React.WheelEvent) {
    if (!state.photos?.[index]) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sf = canvasW / rect.width;
    const transform = getTransform(index);
    const ratio = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    const scale = transform.scale * ratio;

    const cellCenterX = cell.x + cell.width / 2;
    const cellCenterY = cell.y + cell.height / 2;
    const pointerCanvasX = (e.clientX - rect.left) * sf;
    const pointerCanvasY = (e.clientY - rect.top) * sf;
    const anchorX = pointerCanvasX - cellCenterX - transform.offsetX;
    const anchorY = pointerCanvasY - cellCenterY - transform.offsetY;

    commitTransform(index, cell, {
      scale,
      offsetX: transform.offsetX + anchorX * (1 - ratio),
      offsetY: transform.offsetY + anchorY * (1 - ratio),
    });
  }

  return (
    <div ref={containerRef} className="relative select-none">
      <CollageCanvas template={template} state={state} showGuides={showGuides} className="rounded-lg" />
      <div className="absolute inset-0">
        {scene.photoCells.map((cell, index) => {
          const hasPhoto = !!state.photos?.[index];
          return (
            <div
              key={index}
              data-photo-cell={hasPhoto ? "true" : undefined}
              className={`group absolute ${hasPhoto ? "cursor-move touch-none" : "cursor-pointer"}`}
              style={{
                left: `${(cell.x / canvasW) * 100}%`,
                top: `${(cell.y / canvasH) * 100}%`,
                width: `${(cell.width / canvasW) * 100}%`,
                height: `${(cell.height / canvasH) * 100}%`,
              }}
              onPointerDown={(e) => onPointerDown(index, cell, e)}
              onPointerMove={(e) => onPointerMove(index, cell, e)}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={(e) => onWheel(index, cell, e)}
              onDoubleClick={() => fileInputs.current[index]?.click()}
            >
              {onUploadPhoto && (
                <input
                  ref={(el) => {
                    fileInputs.current[index] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadPhoto(index, f);
                    e.target.value = "";
                  }}
                />
              )}
              {!hasPhoto && (
                <div className="pointer-events-none absolute inset-1 flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-ink/25 bg-white/50 text-center text-ink/45 transition group-hover:border-clay group-hover:text-clay">
                  <span className="text-2xl leading-none">＋</span>
                  <span className="text-[11px] font-semibold">Дважды нажмите,<br />чтобы добавить фото</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
