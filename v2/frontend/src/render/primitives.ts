import type { Block, PhotoCell, PhotoTransform } from "../api/types";
import { loadImage } from "./images";

type Ctx = CanvasRenderingContext2D;

export function roundRect(
  ctx: Ctx,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | undefined,
): void {
  const r = Math.max(0, Math.min(radius ?? 0, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawShape(ctx: Ctx, block: Block, fallbackFill: string): void {
  ctx.save();
  roundRect(ctx, block.x, block.y, block.width, block.height, block.radius ?? 0);
  ctx.fillStyle = block.fill || fallbackFill;
  ctx.fill();
  if ((block.borderWidth ?? 0) > 0) {
    ctx.lineWidth = block.borderWidth as number;
    ctx.strokeStyle = block.stroke || "#000000";
    ctx.stroke();
  }
  ctx.restore();
}

export async function drawContainImage(
  ctx: Ctx,
  imageSource: string,
  block: { x: number; y: number; width: number; height: number; radius?: number },
): Promise<void> {
  const image = await loadImage(imageSource);
  const scale = Math.min(block.width / image.width, block.height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = block.x + (block.width - drawWidth) / 2;
  const offsetY = block.y + (block.height - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

export function normalizePhotoTransform(
  image: HTMLImageElement,
  cell: Pick<PhotoCell, "width" | "height">,
  transform: PhotoTransform | undefined,
): PhotoTransform {
  const safe: PhotoTransform = {
    scale: Math.max(1, Math.min(transform?.scale ?? 1, 6)),
    offsetX: transform?.offsetX ?? 0,
    offsetY: transform?.offsetY ?? 0,
  };
  const baseScale = Math.max(cell.width / image.width, cell.height / image.height);
  const drawWidth = image.width * baseScale * safe.scale;
  const drawHeight = image.height * baseScale * safe.scale;
  const maxOffsetX = Math.max(0, (drawWidth - cell.width) / 2);
  const maxOffsetY = Math.max(0, (drawHeight - cell.height) / 2);
  safe.offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, safe.offsetX));
  safe.offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, safe.offsetY));
  return safe;
}

function drawCoverImage(
  ctx: Ctx,
  image: HTMLImageElement,
  cell: PhotoCell,
  transform: PhotoTransform,
): void {
  const baseScale = Math.max(cell.width / image.width, cell.height / image.height);
  const scale = baseScale * transform.scale;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = cell.x + (cell.width - drawWidth) / 2 + transform.offsetX;
  const offsetY = cell.y + (cell.height - drawHeight) / 2 + transform.offsetY;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

export async function drawPhotoCell(
  ctx: Ctx,
  src: string | null,
  cell: PhotoCell,
  transform: PhotoTransform,
): Promise<void> {
  drawShape(ctx, cell as unknown as Block, cell.fill ?? "#ffffff");
  if (!src) return;

  const image = await loadImage(src);
  ctx.save();
  roundRect(ctx, cell.x, cell.y, cell.width, cell.height, cell.radius ?? 0);
  ctx.clip();
  drawCoverImage(ctx, image, cell, normalizePhotoTransform(image, cell, transform));
  ctx.restore();

  if ((cell.borderWidth ?? 0) > 0) {
    ctx.lineWidth = cell.borderWidth as number;
    ctx.strokeStyle = cell.stroke || "#000000";
    roundRect(ctx, cell.x, cell.y, cell.width, cell.height, cell.radius ?? 0);
    ctx.stroke();
  }
}

export interface TextConfig {
  color: string;
  align: CanvasTextAlign;
  size: number;
  weight: number | string;
  paddingX?: number;
  font?: string;
  strike?: boolean;
}

export function drawTextAt(ctx: Ctx, text: string, x: number, y: number, config: TextConfig): void {
  ctx.fillStyle = config.color;
  ctx.textAlign = config.align;
  ctx.textBaseline = "middle";
  ctx.font = `${config.weight} ${config.size}px ${config.font ?? "Segoe UI"}`;
  ctx.fillText(text, x, y);

  if (config.strike && text) {
    const w = ctx.measureText(text).width;
    let x0 = x;
    let x1 = x + w;
    if (config.align === "center") {
      x0 = x - w / 2;
      x1 = x + w / 2;
    } else if (config.align === "right") {
      x0 = x - w;
      x1 = x;
    }
    ctx.save();
    ctx.strokeStyle = config.color;
    ctx.lineWidth = Math.max(2, config.size * 0.08);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawTextBlock(ctx: Ctx, text: string, block: Block, config: TextConfig): void {
  const paddingX = config.paddingX ?? 0;
  const textX =
    config.align === "center"
      ? block.x + block.width / 2
      : config.align === "right"
        ? block.x + block.width - paddingX
        : block.x + paddingX;
  drawTextAt(ctx, text, textX, block.y + block.height / 2, config);
}
