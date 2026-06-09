import { useState } from "react";
import type { Template } from "../../api/types";
import { api, ApiError } from "../../api/client";
import { useI18n } from "../../i18n";

interface Props {
  template: Template;
  adminPin: string;
  onTemplateChange: (t: Template) => void;
}

const FONT_OPTS = [
  { id: "serif", label: "Classic (Serif)" },
  { id: "modern", label: "Modern (Poppins)" },
  { id: "elegant", label: "Elegant (Playfair)" },
  { id: "clean", label: "Clean (Montserrat)" },
];

type Status = { kind: "idle" | "saving" | "ok" | "error"; msg?: string };

export function StorePageSection({ template, adminPin, onTemplateChange }: Props) {
  const { t } = useI18n();
  const store0 = (template.store as Record<string, unknown>) || {};
  const home0 = (store0.home as Record<string, unknown>) || {};
  const b0 = (home0.branding as Record<string, string>) || {};

  const [accent, setAccent] = useState(b0.accent || "#d47516");
  const [bg, setBg] = useState(b0.bg || "#f6f1ea");
  const [font, setFont] = useState(b0.font || "serif");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [previewKey, setPreviewKey] = useState(0);

  async function save() {
    setStatus({ kind: "saving" });
    try {
      const next: Template = {
        ...template,
        store: {
          ...(template.store as Record<string, unknown>),
          home: { ...home0, branding: { accent, bg, font } },
        },
      };
      await api.saveTemplate(next, adminPin);
      onTemplateChange(next);
      setStatus({ kind: "ok", msg: t("common.saved") });
      setPreviewKey((k) => k + 1);
    } catch (e) {
      setStatus({
        kind: "error",
        msg: e instanceof ApiError && e.status === 401 ? t("common.no_access") : t("common.save_fail"),
      });
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl">{t("adm.page_title")}</h1>
        <p className="text-sm text-ink/50">{t("adm.page_sub")}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Controls */}
        <div className="card space-y-5 p-5">
          <div>
            <label className="field-label">{t("adm.brand_accent")}</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="h-10 w-14 cursor-pointer rounded border border-line"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
              />
              <input className="input w-40" value={accent} onChange={(e) => setAccent(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="field-label">{t("adm.brand_bg")}</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="h-10 w-14 cursor-pointer rounded border border-line"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
              />
              <input className="input w-40" value={bg} onChange={(e) => setBg(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="field-label">{t("adm.brand_font")}</label>
            <select className="input max-w-xs" value={font} onChange={(e) => setFont(e.target.value)}>
              {FONT_OPTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-primary" onClick={save} disabled={status.kind === "saving"}>
              {status.kind === "saving" ? t("common.saving") : t("common.save")}
            </button>
            {status.msg && (
              <span className={`text-sm font-medium ${status.kind === "error" ? "text-red-600" : "text-green-600"}`}>
                {status.msg}
              </span>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="card p-3">
          <div className="field-label">{t("adm.preview")}</div>
          <div className="overflow-hidden rounded-xl border border-line">
            <iframe
              key={previewKey}
              src="/"
              title="preview"
              className="h-[600px] w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
