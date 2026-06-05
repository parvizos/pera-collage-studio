import type {
  Block,
  PhotoCell,
  SceneLayout,
  Template,
  CollageState,
  TextBinding,
  TextStyle,
} from "../api/types";

export interface ResolvedScene {
  blocks: Record<string, Block>;
  blockOrder: string[];
  textBindings: Record<string, TextBinding>;
  textStyles: Record<string, TextStyle>;
  photoCells: PhotoCell[];
  canvasHeight: number;
}

export function resolveLayoutKeyForProductCount(count: number, template: Template): string {
  const mp = template.multiProduct;
  if (count <= 1 || !mp?.enabled) return "single";
  const maxCount = mp.maxCount ?? 4;
  return String(Math.min(Math.max(2, count), maxCount));
}

function sliceIsUsable(slice: SceneLayout | undefined): slice is SceneLayout {
  return !!slice && !!slice.blocks && Object.keys(slice.blocks).length > 0;
}

export function resolveScene(template: Template, state: CollageState): ResolvedScene {
  const templateId = state.photoTemplateId;
  const productCount = state.products?.length ?? 1;
  const layoutKey = resolveLayoutKeyForProductCount(productCount, template);

  const scene = template.templateScenes?.[templateId];
  let slice: SceneLayout | undefined;
  if (scene) {
    if (layoutKey === "single") {
      slice = scene.layouts.single;
    } else {
      slice = scene.layouts.byCount?.[layoutKey] ?? scene.layouts.single;
    }
    if (!sliceIsUsable(slice)) slice = scene.layouts.single;
  }

  const blocks = sliceIsUsable(slice) ? slice.blocks : template.blocks;
  const blockOrder = sliceIsUsable(slice) ? slice.blockOrder : template.blockOrder;
  const textBindings = sliceIsUsable(slice) ? slice.textBindings : template.textBindings;
  const textStyles = sliceIsUsable(slice) ? slice.textStyles : template.textStyles;

  const photoCells = scene?.photoLayout?.length
    ? scene.photoLayout
    : (template.photoLayouts?.[templateId] ?? []);

  const sliceHeight = sliceIsUsable(slice) ? slice.canvasHeight ?? 0 : 0;
  const canvasHeight = sliceHeight > 0 ? sliceHeight : template.canvas.height;

  return { blocks, blockOrder, textBindings, textStyles, photoCells, canvasHeight };
}

export function getFieldValue(state: CollageState, fieldId: string | undefined, productIndex = 0): string {
  if (!fieldId) return "";
  const product = state.products?.[productIndex];
  if (product?.values && fieldId in product.values) {
    return product.values[fieldId] ?? "";
  }
  return state.values?.[fieldId] ?? "";
}
