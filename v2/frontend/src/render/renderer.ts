import type { Block, Template, CollageState } from "../api/types";
import {
  drawShape,
  drawContainImage,
  drawPhotoCell,
  drawTextBlock,
  drawTextAt,
} from "./primitives";
import { resolveScene, getFieldValue, type ResolvedScene } from "./scene";
import { loadImage } from "./images";

type Ctx = CanvasRenderingContext2D;

const HEADER_FONT = "Georgia";
const FOOTER_FONT = "Segoe UI";

function isBlockVisible(block: Block | undefined): block is Block {
  return !!block && !block.hidden;
}

function styleFor(
  scene: ResolvedScene,
  key: string,
  fallbackColor: string,
): { color: string; align: CanvasTextAlign; strike: boolean } {
  const style = scene.textStyles[key] ?? {};
  const align = (style.align as CanvasTextAlign) ?? "left";
  return { color: style.color || fallbackColor, align, strike: !!style.strike };
}

/**
 * Resolves the text to draw for a block:
 * - static blocks return their literal text
 * - field (variable) blocks return the product value for the bound field,
 *   using the block's productIndex (0 by default) so each product shows its own data
 */
function blockText(
  scene: ResolvedScene,
  state: CollageState,
  key: string,
): { primary: string; secondary: string } {
  const b = scene.textBindings[key] ?? {};
  if (b.type === "static") {
    return { primary: b.text ?? "", secondary: "" };
  }
  const productIndex = b.productIndex ?? 0;
  return {
    primary: getFieldValue(state, b.primary, productIndex),
    secondary: getFieldValue(state, b.secondary, productIndex),
  };
}

async function drawImageOrBadge(
  ctx: Ctx,
  src: string | null | undefined,
  block: Block,
  fallbackText: string,
): Promise<void> {
  if (src) {
    await drawContainImage(ctx, src, block);
    return;
  }
  ctx.save();
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(
    block.x + block.width / 2,
    block.y + block.height / 2,
    Math.min(block.width, block.height) * 0.42,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(block.height * 0.4)}px ${HEADER_FONT}`;
  ctx.fillText(fallbackText, block.x + block.width / 2, block.y + block.height / 2 + 6);
  ctx.restore();
}

async function drawHeaderAssets(ctx: Ctx, template: Template, scene: ResolvedScene): Promise<void> {
  const store = template.store as Record<string, unknown>;
  const storeTextColor = template.theme.storeTextColor || "#121212";

  const leftBadge = scene.blocks.leftBadge;
  if (isBlockVisible(leftBadge)) {
    await drawImageOrBadge(ctx, store.leftBadge as string | null, leftBadge, "P");
  }
  const rightBadge = scene.blocks.rightBadge;
  if (isBlockVisible(rightBadge)) {
    await drawImageOrBadge(ctx, store.rightBadge as string | null, rightBadge, "P");
  }

  const logoBlock = scene.blocks.headerLogo;
  if (isBlockVisible(logoBlock)) {
    const logo = store.logo as string | null;
    if (logo) {
      await drawContainImage(ctx, logo, logoBlock);
    } else {
      const title = (store.title as string) ?? "";
      const subtitle = (store.subtitle as string) ?? "";
      const titleSize = (store.titleSize as number) ?? 74;
      const subtitleSize = (store.subtitleSize as number) ?? 26;
      const cx = logoBlock.x + logoBlock.width / 2;
      const cy = logoBlock.y + logoBlock.height / 2;
      if (title) {
        drawTextAt(ctx, title, cx, cy - subtitleSize * 0.45, {
          color: storeTextColor,
          align: "center",
          size: titleSize,
          weight: 700,
          font: HEADER_FONT,
        });
      }
      if (subtitle) {
        drawTextAt(ctx, subtitle, cx, cy + titleSize * 0.2, {
          color: storeTextColor,
          align: "center",
          size: subtitleSize,
          weight: 500,
          font: HEADER_FONT,
        });
      }
    }
  }
}

async function drawPhotoLayout(ctx: Ctx, scene: ResolvedScene, state: CollageState): Promise<void> {
  const cells = scene.photoCells;
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];
    const src = state.photos?.[index] ?? null;
    const transform = state.photoTransforms?.[index] ?? { scale: 1, offsetX: 0, offsetY: 0 };
    await drawPhotoCell(ctx, src, cell, transform);
  }
}

function drawFooterText(ctx: Ctx, template: Template, scene: ResolvedScene, state: CollageState): void {
  const footerColor = template.theme.footerTextColor || "#121212";

  const left = scene.blocks.textLeft;
  if (isBlockVisible(left)) {
    const style = styleFor(scene, "textLeft", footerColor);
    const { primary, secondary } = blockText(scene, state, "textLeft");
    if (primary) {
      drawTextBlock(ctx, primary, left, {
        color: style.color,
        align: style.align,
        size: Math.round(left.height * 0.34),
        weight: 600,
        paddingX: 0,
        font: FOOTER_FONT,
        strike: style.strike,
      });
    }
    if (secondary) {
      const textX =
        style.align === "center"
          ? left.x + left.width / 2
          : style.align === "right"
            ? left.x + left.width
            : left.x;
      drawTextAt(ctx, secondary, textX, left.y + left.height * 0.62, {
        color: style.color,
        align: style.align,
        size: Math.round(left.height * 0.22),
        weight: 500,
        font: FOOTER_FONT,
        strike: style.strike,
      });
    }
  }

  const centerTop = scene.blocks.textCenterTop;
  if (isBlockVisible(centerTop)) {
    const style = styleFor(scene, "textCenterTop", footerColor);
    const value = blockText(scene, state, "textCenterTop").primary;
    if (value) {
      drawTextBlock(ctx, value, centerTop, {
        color: style.color,
        align: style.align,
        size: Math.round(centerTop.height * 0.78),
        weight: 500,
        paddingX: 0,
        font: FOOTER_FONT,
        strike: style.strike,
      });
    }
  }

  const centerBottom = scene.blocks.textCenterBottom;
  if (isBlockVisible(centerBottom)) {
    const style = styleFor(scene, "textCenterBottom", footerColor);
    const value = blockText(scene, state, "textCenterBottom").primary;
    if (value) {
      drawTextBlock(ctx, value, centerBottom, {
        color: style.color,
        align: style.align,
        size: Math.round(centerBottom.height * 0.78),
        weight: 500,
        paddingX: 0,
        font: FOOTER_FONT,
        strike: style.strike,
      });
    }
  }

  const priceBox = scene.blocks.priceBox;
  if (isBlockVisible(priceBox)) {
    drawShape(ctx, priceBox, priceBox.fill || "#050505");
    const style = styleFor(scene, "priceBox", template.theme.priceTextColor || "#ffffff");
    const value = blockText(scene, state, "priceBox").primary;
    if (value) {
      drawTextBlock(ctx, value, priceBox, {
        color: style.color,
        align: style.align,
        size: Math.round(priceBox.height * 0.5),
        weight: 700,
        paddingX: 0,
        font: FOOTER_FONT,
        strike: style.strike,
      });
    }
  }
}

async function drawBrandPlate(ctx: Ctx, template: Template, scene: ResolvedScene, state: CollageState): Promise<void> {
  const block = scene.blocks.brandPlate;
  if (!isBlockVisible(block)) return;

  drawShape(ctx, block, block.fill || "#ffffff");

  const binding = scene.textBindings.brandPlate ?? {};
  const style = styleFor(scene, "brandPlate", template.theme.brandTextColor || "#151515");
  const hasBinding = binding.type === "static" || !!binding.primary;

  if (hasBinding) {
    const value = blockText(scene, state, "brandPlate").primary;
    if (value) {
      drawTextBlock(ctx, value, block, {
        color: style.color,
        align: style.align,
        size: Math.round(block.height * 0.42),
        weight: 600,
        paddingX: 24,
        font: FOOTER_FONT,
        strike: style.strike,
      });
    }
    return;
  }

  const brand = template.brands.find((b) => b.id === state.brandId);
  if (brand?.logo) {
    await drawContainImage(ctx, brand.logo, {
      x: block.x + 24,
      y: block.y + 18,
      width: Math.max(40, block.width - 48),
      height: Math.max(40, block.height - 36),
      radius: 0,
    });
  } else if (brand?.name) {
    drawTextBlock(ctx, brand.name, block, {
      color: style.color,
      align: style.align || "center",
      size: Math.round(block.height * 0.42),
      weight: 600,
      paddingX: 24,
      font: FOOTER_FONT,
    });
  }
}

async function drawCustomBlocks(ctx: Ctx, template: Template, scene: ResolvedScene, state: CollageState): Promise<void> {
  for (const key of scene.blockOrder) {
    const block = scene.blocks[key];
    if (!block || !block.kind || !block.kind.startsWith("custom-")) continue;
    if (block.hidden) continue;

    if (block.kind === "custom-shape") {
      drawShape(ctx, block, block.fill || "#ffffff");
    } else if (block.kind === "custom-text") {
      if (block.background && block.fill) drawShape(ctx, block, block.fill);
      const style = styleFor(scene, key, template.theme.footerTextColor || "#121212");
      const value = blockText(scene, state, key).primary;
      if (value) {
        drawTextBlock(ctx, value, block, {
          color: style.color,
          align: style.align,
          size: Math.max(18, Math.round(block.height * 0.45)),
          weight: 600,
          paddingX: 16,
          font: FOOTER_FONT,
          strike: style.strike,
        });
      }
    } else if (block.kind === "custom-image") {
      if (block.fill) drawShape(ctx, block, block.fill);
      if (block.imageSrc) await drawContainImage(ctx, block.imageSrc, block);
    } else if (block.kind === "custom-brand-logo") {
      const brand = template.brands.find((b) => b.id === state.brandId);
      if (brand?.logo) {
        await drawContainImage(ctx, brand.logo, {
          x: block.x + 12,
          y: block.y + 12,
          width: Math.max(20, block.width - 24),
          height: Math.max(20, block.height - 24),
          radius: 0,
        });
      }
    }
  }
}

export interface RenderOptions {
  showGuides?: boolean;
}

export async function renderCollage(
  ctx: Ctx,
  template: Template,
  state: CollageState,
  options: RenderOptions = {},
): Promise<{ width: number; height: number }> {
  const scene = resolveScene(template, state);
  const width = template.canvas.width;
  const height = scene.canvasHeight;

  const canvas = ctx.canvas;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = template.canvas.backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const header = scene.blocks.header;
  if (isBlockVisible(header)) {
    drawShape(ctx, header, template.theme.headerBackground || "#ffffff");
  }
  await drawHeaderAssets(ctx, template, scene);
  await drawPhotoLayout(ctx, scene, state);

  const footer = scene.blocks.footer;
  if (isBlockVisible(footer)) {
    drawShape(ctx, footer, template.theme.footerBackground || "#ffffff");
  }

  // Text/variable blocks render the same way for single and multi-product:
  // each block pulls its bound field for its own product index, so the layout
  // you design in the editor is exactly what gets drawn.
  drawFooterText(ctx, template, scene, state);
  await drawBrandPlate(ctx, template, scene, state);
  await drawCustomBlocks(ctx, template, scene, state);

  if (options.showGuides) {
    ctx.save();
    ctx.strokeStyle = template.canvas.guideColor || "#d47516";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    Object.values(scene.blocks).forEach((b) => {
      if (b && !b.hidden) ctx.strokeRect(b.x, b.y, b.width, b.height);
    });
    scene.photoCells.forEach((c) => ctx.strokeRect(c.x, c.y, c.width, c.height));
    ctx.restore();
  }

  return { width, height };
}

export { loadImage };
