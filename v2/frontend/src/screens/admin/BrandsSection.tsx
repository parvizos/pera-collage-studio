import { useState } from "react";
import type { Brand, Template } from "../../api/types";
import { api, ApiError } from "../../api/client";
import { useI18n } from "../../i18n";

interface Props {
  template: Template;
  adminPin: string;
  onTemplateChange: (t: Template) => void;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

function newBrandId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `brand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function BrandsSection({ template, adminPin, onTemplateChange }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Brand[]>(() =>
    template.brands.map((b) => ({
      ...b,
      templateIds: [...(b.templateIds ?? [])],
      fieldSettings: { ...(b.fieldSettings ?? {}) },
    })),
  );
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "ok" | "error"; msg?: string }>({
    kind: "idle",
  });

  function patchBrand(index: number, patch: Partial<Brand>) {
    setDraft((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
    setStatus({ kind: "idle" });
  }

  function toggleTemplate(index: number, templateId: string) {
    setDraft((prev) =>
      prev.map((b, i) => {
        if (i !== index) return b;
        const has = b.templateIds.includes(templateId);
        const templateIds = has
          ? b.templateIds.filter((t) => t !== templateId)
          : [...b.templateIds, templateId];
        let defaultTemplateId = b.defaultTemplateId;
        if (has && defaultTemplateId === templateId) {
          defaultTemplateId = templateIds[0] ?? null;
        }
        return { ...b, templateIds, defaultTemplateId };
      }),
    );
    setStatus({ kind: "idle" });
  }

  function setFieldSetting(index: number, fieldId: string, patch: { defaultValue?: string; hidden?: boolean }) {
    setDraft((prev) =>
      prev.map((b, i) => {
        if (i !== index) return b;
        const current = b.fieldSettings[fieldId] ?? {};
        return { ...b, fieldSettings: { ...b.fieldSettings, [fieldId]: { ...current, ...patch } } };
      }),
    );
    setStatus({ kind: "idle" });
  }

  async function uploadLogo(index: number, file: File | undefined) {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    patchBrand(index, { logo: dataUrl });
  }

  function addBrand() {
    setDraft((prev) => [
      ...prev,
      {
        id: newBrandId(),
        name: `Бренд ${prev.length + 1}`,
        logo: null,
        templateIds: template.photoTemplates[0] ? [template.photoTemplates[0].id] : [],
        defaultTemplateId: template.photoTemplates[0]?.id ?? null,
        fieldSettings: {},
      },
    ]);
    setStatus({ kind: "idle" });
  }

  function removeBrand(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index));
    setStatus({ kind: "idle" });
  }

  async function save() {
    setStatus({ kind: "saving" });
    try {
      const next: Template = { ...template, brands: draft };
      await api.saveTemplate(next, adminPin);
      onTemplateChange(next);
      setStatus({ kind: "ok", msg: t("common.saved") });
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 401 ? t("common.no_access") : t("common.save_fail");
      setStatus({ kind: "error", msg });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl">{t("adm.brands_title")}</h1>
          <p className="text-sm text-ink/50">{t("adm.brands_sub")}</p>
        </div>
        <button className="btn-ghost" onClick={addBrand}>
          {t("common.add")}
        </button>
      </div>

      <div className="space-y-4">
        {draft.map((brand, index) => (
          <div key={brand.id} className="card p-5">
            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              {/* Logo */}
              <div>
                <label className="field-label">{t("adm.logo")}</label>
                <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-sand">
                  {brand.logo ? (
                    <img src={brand.logo} alt="" className="h-full w-full object-contain p-2" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-ink/40">
                      {t("adm.no_logo")}
                    </div>
                  )}
                  <label className="absolute inset-x-0 bottom-0 cursor-pointer bg-black/40 py-1 text-center text-xs font-semibold text-white hover:bg-black/60">
                    {t("adm.upload")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => uploadLogo(index, e.target.files?.[0])}
                    />
                  </label>
                </div>
                {brand.logo && (
                  <button
                    className="mt-1 w-full text-xs text-red-600 hover:underline"
                    onClick={() => patchBrand(index, { logo: null })}
                  >
                    {t("adm.remove_logo")}
                  </button>
                )}
              </div>

              {/* Main */}
              <div className="space-y-4">
                <div>
                  <label className="field-label">{t("adm.brand_name")}</label>
                  <input
                    className="input"
                    value={brand.name}
                    onChange={(e) => patchBrand(index, { name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="field-label">{t("adm.avail_templates")}</label>
                  <div className="flex flex-wrap gap-2">
                    {template.photoTemplates.map((pt) => {
                      const active = brand.templateIds.includes(pt.id);
                      return (
                        <button
                          key={pt.id}
                          onClick={() => toggleTemplate(index, pt.id)}
                          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                            active
                              ? "border-ink bg-ink text-white"
                              : "border-line bg-white text-ink/60 hover:border-ink/40"
                          }`}
                        >
                          {pt.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="field-label">{t("adm.default_template")}</label>
                  <select
                    className="input"
                    value={brand.defaultTemplateId ?? ""}
                    onChange={(e) => patchBrand(index, { defaultTemplateId: e.target.value || null })}
                  >
                    <option value="">{t("adm.not_selected")}</option>
                    {template.photoTemplates
                      .filter((pt) => brand.templateIds.includes(pt.id))
                      .map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Field settings */}
            <div className="mt-5 border-t border-line pt-4">
              <div className="field-label mb-2">{t("adm.brand_field_settings")}</div>
              <div className="space-y-2">
                {template.fields.map((field) => {
                  const setting = brand.fieldSettings[field.id] ?? {};
                  return (
                    <div key={field.id} className="grid items-center gap-2 sm:grid-cols-[140px_1fr_auto]">
                      <span className="text-sm text-ink/70">{field.label}</span>
                      <input
                        className="input"
                        placeholder={t("adm.default_value_ph")}
                        value={setting.defaultValue ?? ""}
                        onChange={(e) => setFieldSetting(index, field.id, { defaultValue: e.target.value })}
                      />
                      <label className="flex items-center gap-2 text-sm text-ink/60">
                        <input
                          type="checkbox"
                          checked={!!setting.hidden}
                          onChange={(e) => setFieldSetting(index, field.id, { hidden: e.target.checked })}
                        />
                        {t("adm.hide")}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                className="text-sm font-medium text-red-600 hover:underline"
                onClick={() => removeBrand(index)}
              >
                {t("adm.brand_delete")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-line bg-sand/80 py-3 backdrop-blur">
        {status.msg && (
          <span
            className={`text-sm font-medium ${
              status.kind === "error" ? "text-red-600" : "text-green-600"
            }`}
          >
            {status.msg}
          </span>
        )}
        <button className="btn-primary" onClick={save} disabled={status.kind === "saving"}>
          {status.kind === "saving" ? t("common.saving") : t("common.save_changes")}
        </button>
      </div>
    </div>
  );
}
