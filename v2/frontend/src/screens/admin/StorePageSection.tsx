import { useState } from "react";
import type { Template } from "../../api/types";
import { api, ApiError } from "../../api/client";
import { useI18n } from "../../i18n";

interface Props {
  template: Template;
  adminPin: string;
  onTemplateChange: (t: Template) => void;
}

interface HomeSection {
  id: string;
  type: string;
  enabled?: boolean;
  image?: string;
  title?: string;
  text?: string;
  link?: string;
  button?: string;
}

const FONT_OPTS = [
  { id: "serif", label: "Classic (Serif)" },
  { id: "modern", label: "Modern (Poppins)" },
  { id: "elegant", label: "Elegant (Playfair)" },
  { id: "clean", label: "Clean (Montserrat)" },
];

const DEFAULT_SECTIONS: HomeSection[] = [
  { id: "categories", type: "categories", enabled: true },
  { id: "sale", type: "sale", enabled: true },
  { id: "new", type: "new", enabled: true },
  { id: "brands", type: "brands", enabled: true },
  { id: "colors", type: "colors", enabled: true },
  { id: "catalog", type: "catalog", enabled: true },
];

const TYPE_KEY: Record<string, string> = {
  categories: "store.categories",
  sale: "store.sale",
  new: "store.new",
  brands: "store.brands",
  colors: "store.colors",
  catalog: "store.catalog",
  custom: "adm.custom_block",
};

type Status = { kind: "idle" | "saving" | "ok" | "error"; msg?: string };

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

export function StorePageSection({ template, adminPin, onTemplateChange }: Props) {
  const { t } = useI18n();
  const store0 = (template.store as Record<string, unknown>) || {};
  const home0 = (store0.home as Record<string, unknown>) || {};
  const b0 = (home0.branding as Record<string, string>) || {};
  const hero0 = (home0.hero as Record<string, unknown>) || {};
  const sections0 = (Array.isArray(home0.sections) && (home0.sections as unknown[]).length
    ? (home0.sections as HomeSection[])
    : DEFAULT_SECTIONS
  ).map((s) => ({ enabled: true, ...s }));

  const [accent, setAccent] = useState(b0.accent || "#d47516");
  const [bg, setBg] = useState(b0.bg || "#f6f1ea");
  const [font, setFont] = useState(b0.font || "serif");

  const [heroEnabled, setHeroEnabled] = useState(hero0.enabled !== false);
  const [heroImage, setHeroImage] = useState((hero0.image as string) || "");
  const [heroTitle, setHeroTitle] = useState((hero0.title as string) || "");
  const [heroSubtitle, setHeroSubtitle] = useState((hero0.subtitle as string) || "");
  const [heroButton, setHeroButton] = useState((hero0.button as string) || "");

  const [sections, setSections] = useState<HomeSection[]>(sections0);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [previewKey, setPreviewKey] = useState(0);

  function patchSection(id: string, patch: Partial<HomeSection>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function move(index: number, dir: -1 | 1) {
    setSections((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }
  function addBlock() {
    setSections((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, type: "custom", enabled: true, title: "", text: "", button: "", link: "" },
    ]);
  }
  function removeBlock(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }
  async function uploadHero(file?: File) {
    if (file) setHeroImage(await fileToDataUrl(file));
  }
  async function uploadBlock(id: string, file?: File) {
    if (file) patchSection(id, { image: await fileToDataUrl(file) });
  }

  async function save() {
    setStatus({ kind: "saving" });
    try {
      const next: Template = {
        ...template,
        store: {
          ...(template.store as Record<string, unknown>),
          home: {
            ...home0,
            branding: { accent, bg, font },
            hero: { enabled: heroEnabled, image: heroImage, title: heroTitle, subtitle: heroSubtitle, button: heroButton },
            sections,
          },
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl">{t("adm.page_title")}</h1>
          <p className="text-sm text-ink/50">{t("adm.page_sub")}</p>
        </div>
        <div className="flex items-center gap-3">
          {status.msg && (
            <span className={`text-sm font-medium ${status.kind === "error" ? "text-red-600" : "text-green-600"}`}>{status.msg}</span>
          )}
          <button className="btn-primary" onClick={save} disabled={status.kind === "saving"}>
            {status.kind === "saving" ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Editor */}
        <div className="space-y-4">
          {/* Branding */}
          <div className="card space-y-4 p-5">
            <h2 className="font-serif text-lg">{t("adm.page_title")}</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="field-label">{t("adm.brand_accent")}</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="h-9 w-10 cursor-pointer rounded border border-line" value={accent} onChange={(e) => setAccent(e.target.value)} />
                  <input className="input" value={accent} onChange={(e) => setAccent(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="field-label">{t("adm.brand_bg")}</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="h-9 w-10 cursor-pointer rounded border border-line" value={bg} onChange={(e) => setBg(e.target.value)} />
                  <input className="input" value={bg} onChange={(e) => setBg(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="field-label">{t("adm.brand_font")}</label>
                <select className="input" value={font} onChange={(e) => setFont(e.target.value)}>
                  {FONT_OPTS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Hero */}
          <div className="card space-y-4 p-5">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={heroEnabled} onChange={(e) => setHeroEnabled(e.target.checked)} />
              <h2 className="font-serif text-lg">{t("adm.hero")}</h2>
            </label>
            {heroEnabled && (
              <div className="space-y-3">
                <div>
                  <label className="field-label">{t("adm.hero_image")}</label>
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-28 overflow-hidden rounded-lg border border-line bg-sand">
                      {heroImage && <img src={heroImage} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <label className="btn-ghost cursor-pointer">
                      {t("adm.upload")}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadHero(e.target.files?.[0])} />
                    </label>
                    {heroImage && (
                      <button className="text-sm text-red-600 hover:underline" onClick={() => setHeroImage("")}>{t("adm.remove_image")}</button>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label">{t("adm.hero_heading")}</label>
                    <input className="input" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="PERA" />
                  </div>
                  <div>
                    <label className="field-label">{t("adm.hero_btn")}</label>
                    <input className="input" value={heroButton} onChange={(e) => setHeroButton(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="field-label">{t("adm.hero_sub")}</label>
                  <input className="input" value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Sections */}
          <div className="card space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg">{t("adm.sections_title")}</h2>
              <button className="btn-ghost" onClick={addBlock}>{t("adm.add_block")}</button>
            </div>
            <div className="space-y-2">
              {sections.map((s, i) => (
                <div key={s.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <button className="px-1 text-xs text-ink/50 hover:text-ink disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
                      <button className="px-1 text-xs text-ink/50 hover:text-ink disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === sections.length - 1}>▼</button>
                    </div>
                    <span className="flex-1 text-sm font-semibold">
                      {s.type === "custom" ? s.title || t("adm.custom_block") : t(TYPE_KEY[s.type] || s.type)}
                      {s.type === "custom" && <span className="ml-2 rounded-full bg-clay/10 px-2 py-0.5 text-[11px] font-normal text-clay">{t("adm.custom_block")}</span>}
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-ink/60">
                      <input type="checkbox" checked={s.enabled !== false} onChange={(e) => patchSection(s.id, { enabled: e.target.checked })} />
                      {t("adm.show")}
                    </label>
                    {s.type === "custom" && (
                      <button className="text-sm text-red-600 hover:underline" onClick={() => removeBlock(s.id)}>{t("common.delete")}</button>
                    )}
                  </div>
                  {s.type === "custom" && (
                    <div className="mt-3 space-y-2 border-t border-line pt-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-24 overflow-hidden rounded-lg border border-line bg-sand">
                          {s.image && <img src={s.image} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <label className="btn-ghost cursor-pointer">
                          {t("adm.upload")}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadBlock(s.id, e.target.files?.[0])} />
                        </label>
                        {s.image && <button className="text-xs text-red-600 hover:underline" onClick={() => patchSection(s.id, { image: "" })}>{t("adm.remove_image")}</button>}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input className="input" placeholder={t("adm.hero_heading")} value={s.title || ""} onChange={(e) => patchSection(s.id, { title: e.target.value })} />
                        <input className="input" placeholder={t("adm.block_btn")} value={s.button || ""} onChange={(e) => patchSection(s.id, { button: e.target.value })} />
                      </div>
                      <input className="input" placeholder={t("adm.block_text")} value={s.text || ""} onChange={(e) => patchSection(s.id, { text: e.target.value })} />
                      <input className="input" placeholder={t("adm.block_link")} value={s.link || ""} onChange={(e) => patchSection(s.id, { link: e.target.value })} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button className="btn-primary" onClick={save} disabled={status.kind === "saving"}>
            {status.kind === "saving" ? t("common.saving") : t("common.save")}
          </button>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-3">
            <div className="field-label">{t("adm.preview")}</div>
            <div className="overflow-hidden rounded-xl border border-line">
              <iframe key={previewKey} src="/" title="preview" className="h-[640px] w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
