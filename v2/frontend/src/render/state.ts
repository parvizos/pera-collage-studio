import type { Brand, Template, User, CollageState } from "../api/types";

export function getFieldDefaultValue(
  template: Template,
  fieldId: string,
  brand: Brand | null,
): string {
  const field = template.fields.find((f) => f.id === fieldId);
  const brandSetting = brand?.fieldSettings?.[fieldId];
  if (brandSetting && brandSetting.defaultValue != null && brandSetting.defaultValue !== "") {
    return brandSetting.defaultValue;
  }
  if (field?.defaultValue) return field.defaultValue;
  if (field?.options?.length) return field.options[0];
  return "";
}

export function buildDefaultFieldValues(template: Template, brand: Brand | null): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of template.fields) {
    values[field.id] = getFieldDefaultValue(template, field.id, brand);
  }
  return values;
}

export function resolveBrandForUser(template: Template, user: User | null): Brand | null {
  if (!template.brands.length) return null;
  if (user?.brandIds?.length) {
    const allowed = template.brands.find((b) => user.brandIds.includes(b.id));
    if (allowed) return allowed;
  }
  return template.brands[0] ?? null;
}

export function resolveTemplateIdForBrand(template: Template, brand: Brand | null): string {
  if (brand?.defaultTemplateId) return brand.defaultTemplateId;
  if (brand?.templateIds?.length) return brand.templateIds[0];
  return template.photoTemplates[0]?.id ?? "template_1";
}

export function buildDefaultState(template: Template, user: User | null): CollageState {
  const brand = resolveBrandForUser(template, user);
  const photoTemplateId = resolveTemplateIdForBrand(template, brand);
  const values = buildDefaultFieldValues(template, brand);
  return {
    photoTemplateId,
    brandId: brand?.id ?? null,
    values,
    photos: Array(8).fill(null),
    photoTransforms: Array.from({ length: 8 }, () => ({ scale: 1, offsetX: 0, offsetY: 0 })),
    products: [{ id: "product_0", values: { ...values } }],
  };
}
