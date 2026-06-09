import { useEffect, useRef, useState } from "react";
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
  strip: "adm.strip",
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
  const [heroHeight, setHeroHeight] = useState((hero0.height as string) || "m");
  const [heroAlign, setHeroAlign] = useState((hero0.align as string) || "center");

  const [sections, setSections] = useState<HomeSection[]>(sections0);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [previewKey, setPreviewKey] = useState(0);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const previewRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState(0);
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => setWrapW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const FW = device === "desktop" ? 1280 : 390;
  const FH = device === "desktop" ? 820 : 760;
  const scale = wrapW ? Math.min(1, wrapW / FW) : 0.3;

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
  function addBlock(type: "custom" | "strip") {
    setSections((prev) => [
      ...prev,
      { id: `${type}_${Date.now()}`, type, enabled: true, title: "", text: "", button: "", link: "" },
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
            hero: { enabled: heroEnabled, image: heroImage, title: heroTitle, subtitle: heroSubtitle, button: heroButton, height: heroHeight, align: heroAlign },
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

  const saveBtn = (
    <button className="btn-primary" onClick={save} disabled={status.kind === "saving"}>
      {status.kind === "saving" ? t("common.saving") : t("common.save")}
    </button>
  );

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
          {saveBtn}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(320px,1fr)_minmax(0,1.25fr)]">
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label">{t("adm.hero_height")}</label>
                    <select className="input" value={heroHeight} onChange={(e) => setHeroHeight(e.target.value)}>
                      <option value="s">{t("adm.h_s")}</option>
                      <option value="m">{t("adm.h_m")}</option>
                      <option value="l">{t("adm.h_l")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">{t("adm.hero_align")}</label>
                    <select className="input" value={heroAlign} onChange={(e) => setHeroAlign(e.target.value)}>
                      <option value="center">{t("se.align_center")}</option>
                      <option value="left">{t("se.align_left")}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sections */}
          <div className="card space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg">{t("adm.sections_title")}</h2>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => addBlock("custom")}>{t("adm.add_block")}</button>
                <button className="btn-ghost" onClick={() => addBlock("strip")}>{t("adm.add_strip")}</button>
              </div>
            </div>
            <div className="space-y-2">
              {sections.map((s, i) => {
                const custom = s.type === "custom";
                const strip = s.type === "strip";
                return (
                  <div key={s.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <button className="px-1 text-xs text-ink/50 hover:text-ink disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
                        <button className="px-1 text-xs text-ink/50 hover:text-ink disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === sections.length - 1}>▼</button>
                      </div>
                      <span className="flex-1 truncate text-sm font-semibold">
                        {custom || strip ? s.title || s.text || t(TYPE_KEY[s.type]) : t(TYPE_KEY[s.type] || s.type)}
                        {(custom || strip) && (
                          <span className="ml-2 rounded-full bg-clay/10 px-2 py-0.5 text-[11px] font-normal text-clay">{t(TYPE_KEY[s.type])}</span>
                        )}
                      </span>
                      <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink/60">
                        <input type="checkbox" checked={s.enabled !== false} onChange={(e) => patchSection(s.id, { enabled: e.target.checked })} />
                        {t("adm.show")}
                      </label>
                      {(custom || strip) && (
                        <button className="shrink-0 text-sm text-red-600 hover:underline" onClick={() => removeBlock(s.id)}>{t("common.delete")}</button>
                      )}
                    </div>

                    {/* Built-in: optional custom heading */}
                    {!custom && !strip && (
                      <input
                        className="input mt-3"
                        placeholder={`${t("adm.section_heading")} — ${t(TYPE_KEY[s.type])}`}
                        value={s.title || ""}
                        onChange={(e) => patchSection(s.id, { title: e.target.value })}
                      />
                    )}

                    {/* Custom banner */}
                    {custom && (
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

                    {/* Promo strip */}
                    {strip && (
                      <div className="mt-3 space-y-2 border-t border-line pt-3">
                        <input className="input" placeholder={t("adm.block_text")} value={s.text || ""} onChange={(e) => patchSection(s.id, { text: e.target.value })} />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input className="input" placeholder={t("adm.block_btn")} value={s.button || ""} onChange={(e) => patchSection(s.id, { button: e.target.value })} />
                          <input className="input" placeholder={t("adm.block_link")} value={s.link || ""} onChange={(e) => patchSection(s.id, { link: e.target.value })} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {saveBtn}
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="card space-y-3 p-3">
            <div className="flex items-center justify-between">
              <div className="field-label mb-0">{t("adm.preview")}</div>
              <div className="inline-flex rounded-full border border-line bg-sand p-0.5 text-xs font-semibold">
                <button
                  className={`rounded-full px-3 py-1 transition ${device === "desktop" ? "bg-ink text-white" : "text-ink/60"}`}
                  onClick={() => setDevice("desktop")}
                >
                  🖥 {t("adm.desktop")}
                </button>
                <button
                  className={`rounded-full px-3 py-1 transition ${device === "mobile" ? "bg-ink text-white" : "text-ink/60"}`}
                  onClick={() => setDevice("mobile")}
                >
                  📱 {t("adm.mobile")}
                </button>
              </div>
            </div>
            <div ref={previewRef} className="overflow-hidden rounded-xl border border-line bg-white">
              <div className="mx-auto overflow-hidden" style={{ width: Math.round(FW * scale), height: Math.round(FH * scale) }}>
                <iframe
                  key={previewKey}
                  src="/"
                  title="preview"
                  style={{ width: FW, height: FH, border: 0, transform: `scale(${scale})`, transformOrigin: "top left" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
