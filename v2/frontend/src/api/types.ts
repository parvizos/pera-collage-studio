export interface FieldDef {
  id: string;
  label: string;
  inputType: "text" | "select" | string;
  defaultValue: string;
  options: string[];
}

export interface BrandFieldSetting {
  defaultValue?: string;
  hidden?: boolean;
}

export interface Brand {
  id: string;
  name: string;
  logo: string | null;
  templateIds: string[];
  defaultTemplateId: string | null;
  fieldSettings: Record<string, BrandFieldSetting>;
}

export interface PhotoTemplate {
  id: string;
  name: string;
}

export interface PhotoCell {
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  radius?: number;
  borderWidth?: number;
  brandLogo?: { enabled: boolean; height: number; gap: number; fill: string };
  linkedBrandLogoKey?: string | null;
}

export interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  radius?: number;
  borderWidth?: number;
  hidden?: boolean;
  kind?: string;
  name?: string;
  /** draw the fill rectangle behind a text block (e.g. a price pill) */
  background?: boolean;
  imageSrc?: string | null;
  linkedPhoto?: number | null;
}

export interface TextBinding {
  /** legacy/field binding: id of the product field shown as primary text */
  primary?: string;
  /** legacy/field binding: id of the product field shown as secondary text */
  secondary?: string;
  /** "static" = fixed text, "field" = bound to a product field (variable) */
  type?: "static" | "field";
  /** static text content when type === "static" */
  text?: string;
  /** which product this block shows (0-based) for multi-product layouts */
  productIndex?: number;
}

export interface TextStyle {
  color?: string;
  align?: string;
}

export interface SceneLayout {
  blocks: Record<string, Block>;
  blockOrder: string[];
  textBindings: Record<string, TextBinding>;
  textStyles: Record<string, TextStyle>;
  canvasHeight?: number;
}

export interface TemplateScene {
  layouts: { single: SceneLayout; byCount?: Record<string, SceneLayout> };
  photoLayout: PhotoCell[];
}

export interface Template {
  security?: { adminPin?: string };
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
    guideColor: string;
    showGuides: boolean;
  };
  theme: Record<string, string>;
  store: Record<string, unknown>;
  fields: FieldDef[];
  textBindings: Record<string, TextBinding>;
  textStyles: Record<string, TextStyle>;
  blocks: Record<string, Block>;
  blockOrder: string[];
  photoTemplates: PhotoTemplate[];
  photoLayouts: Record<string, PhotoCell[]>;
  templateScenes: Record<string, TemplateScene>;
  brands: Brand[];
  multiProduct: { enabled: boolean; maxCount: number; previewCount: number; previewOnCanvas: boolean };
  users?: User[];
}

export interface User {
  id: string;
  name: string;
  pin: string;
  brandIds: string[];
}

export interface HistoryRecord {
  id: string;
  createdAt: string;
  userId?: string;
  userName?: string;
  brandId?: string;
  brandName?: string;
  brandSlug?: string;
  productCode?: string;
  productCodes?: string[];
  productCount?: number;
  templateId?: string;
  templateName?: string;
  imageFileName?: string;
  imagePath?: string;
  hasState?: boolean;
  originalPhotoCount?: number;
  state?: CollageState;
  originalPhotos?: { index: number; fileName?: string; imagePath: string }[];
  imageDataUrl?: string;
}

export interface HistoryPage {
  records: HistoryRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PhotoTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface CollageState {
  photoTemplateId: string;
  brandId: string | null;
  values: Record<string, string>;
  photos: (string | null)[];
  photoTransforms: PhotoTransform[];
  products?: { id: string; values: Record<string, string> }[];
}
