import { useEffect, useReducer, useRef, useState } from "react";
import type { Template } from "../../api/types";
import { api, ApiError } from "../../api/client";
import { useI18n } from "../../i18n";

interface Props {
  template: Template;
  adminPin: string;
  onTemplateChange: (t: Template) => void;
  onClose?: () => void;
}

interface HomeItem {
  image?: string;
  title?: string;
  text?: string;
  link?: string;
  button?: string;
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
  items?: HomeItem[];
  size?: string;
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
  duo: "adm.duo",
  slider: "adm.slider",
  richtext: "adm.richtext",
  gallery: "adm.gallery",
  spacer: "adm.spacer",
};

const TYPE_ICON: Record<string, string> = {
  categories: "▦", sale: "%", new: "✦", brands: "◈", colors: "◐", catalog: "▤",
  custom: "🖼", strip: "▬", duo: "▥", slider: "❮❯", richtext: "T", gallery: "▣", spacer: "↕",
};

const BUILTIN = new Set(["categories", "sale", "new", "brands", "colors", "catalog"]);
const ITEM_TYPES = new Set(["duo", "slider", "gallery"]);

type Status = { kind: "idle" | "saving" | "ok" | "error"; msg?: string };

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

export function StorePageSection({ template, adminPin, onTemplateChange, onClose }: Props) {
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
  const [heroOverlay, setHeroOverlay] = useState((hero0.overlay as string) || "1");
  const [heroTextColor, setHeroTextColor] = useState((hero0.textColor as string) || "light");

  const [sections, setSections] = useState<HomeSection[]>(sections0);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [previewKey, setPreviewKey] = useState(0);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [open, setOpen] = useState<string>("design"); // "design" | "hero" | "presets" | sectionId

  // ---------- live config ----------
  function currentHome() {
    return {
      branding: { accent, bg, font },
      hero: { enabled: heroEnabled, image: heroImage, title: heroTitle, subtitle: heroSubtitle, button: heroButton, height: heroHeight, align: heroAlign, overlay: heroOverlay, textColor: heroTextColor },
      sections,
    };
  }
  function selectedId() {
    if (open === "hero") return "__hero__";
    if (open && open !== "design" && open !== "presets") return open;
    return "";
  }

  // ---------- preview sizing ----------
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);
  const [chh, setChh] = useState(0);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const u = () => { setCw(el.clientWidth); setChh(el.clientHeight); };
    u();
    const ro = new ResizeObserver(u);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const FW = device === "desktop" ? 1280 : 390;
  const FH = device === "desktop" ? 820 : 800;
  const availW = Math.max(280, cw - 48);
  const availH = Math.max(360, chh - 48 - (device === "desktop" ? 38 : 0));
  const scale = Math.min(1, availW / FW, availH / FH);

  function postPreview() {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "pera-home-preview", home: currentHome(), previewMode: true, selectedId: selectedId() },
        "*",
      );
    } catch { /* ignore */ }
  }
  useEffect(() => {
    const id = setTimeout(postPreview, 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accent, bg, font, heroEnabled, heroImage, heroTitle, heroSubtitle, heroButton, heroHeight, heroAlign, heroOverlay, heroTextColor, sections, device, open]);

  // click a block in the preview -> open its settings
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; id?: string } | null;
      if (d && d.type === "pera-section-click" && d.id) {
        setOpen(d.id === "__hero__" ? "hero" : d.id);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  // scroll rail to the opened panel
  useEffect(() => {
    const el = railRef.current?.querySelector(`[data-acc="${open}"]`);
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  // ---------- undo / redo ----------
  const histRef = useRef<string[]>([]);
  const idxRef = useRef(0);
  const applyingRef = useRef(false);
  const [, bumpHist] = useReducer((x) => x + 1, 0);
  function snap() {
    return JSON.stringify(currentHome());
  }
  useEffect(() => {
    histRef.current = [snap()];
    idxRef.current = 0;
    bumpHist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (applyingRef.current) { applyingRef.current = false; return; }
    const id = setTimeout(() => {
      const s = snap();
      if (s === histRef.current[idxRef.current]) return;
      const base = histRef.current.slice(0, idxRef.current + 1);
      base.push(s);
      const trimmed = base.slice(-60);
      histRef.current = trimmed;
      idxRef.current = trimmed.length - 1;
      bumpHist();
    }, 450);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accent, bg, font, heroEnabled, heroImage, heroTitle, heroSubtitle, heroButton, heroHeight, heroAlign, heroOverlay, heroTextColor, sections]);
  function applyHome(s: string) {
    const c = JSON.parse(s);
    applyingRef.current = true;
    setAccent(c.branding.accent); setBg(c.branding.bg); setFont(c.branding.font);
    setHeroEnabled(c.hero.enabled !== false); setHeroImage(c.hero.image || ""); setHeroTitle(c.hero.title || "");
    setHeroSubtitle(c.hero.subtitle || ""); setHeroButton(c.hero.button || ""); setHeroHeight(c.hero.height || "m");
    setHeroAlign(c.hero.align || "center"); setHeroOverlay(c.hero.overlay || "1"); setHeroTextColor(c.hero.textColor || "light");
    setSections(c.sections || []);
  }
  function undo() { if (idxRef.current > 0) { idxRef.current--; applyHome(histRef.current[idxRef.current]); bumpHist(); } }
  function redo() { if (idxRef.current < histRef.current.length - 1) { idxRef.current++; applyHome(histRef.current[idxRef.current]); bumpHist(); } }
  const canUndo = idxRef.current > 0;
  const canRedo = idxRef.current < histRef.current.length - 1;

  // ---------- section ops ----------
  function patchSection(id: string, patch: Partial<HomeSection>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function onDrop(target: number) {
    setSections((prev) => {
      if (dragIndex === null || dragIndex === target) return prev;
      const next = [...prev];
      const [m] = next.splice(dragIndex, 1);
      next.splice(target, 0, m);
      return next;
    });
    setDragIndex(null);
    setOverIndex(null);
  }
  function addBlock(type: string) {
    const id = `${type}_${Date.now()}`;
    const base: HomeSection = { id, type, enabled: true };
    if (type === "duo") base.items = [{}, {}];
    else if (type === "slider" || type === "gallery") base.items = [{}];
    else if (type === "spacer") base.size = "m";
    setSections((prev) => [...prev, base]);
    setOpen(id);
  }
  function duplicate(id: string) {
    setSections((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      if (i < 0) return prev;
      const copy: HomeSection = JSON.parse(JSON.stringify(prev[i]));
      copy.id = `${copy.type}_${Date.now()}`;
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });
  }
  function removeBlock(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }
  function applyPreset(name: string) {
    if (name === "market") setSections(DEFAULT_SECTIONS.map((s) => ({ ...s })));
    else if (name === "minimal") setSections([{ id: "new", type: "new", enabled: true }, { id: "catalog", type: "catalog", enabled: true }]);
    else if (name === "promo") setSections([{ id: `strip_${Date.now()}`, type: "strip", enabled: true, text: "", button: "" }, { id: "sale", type: "sale", enabled: true }, { id: "new", type: "new", enabled: true }, { id: "catalog", type: "catalog", enabled: true }]);
  }
  function patchItem(secId: string, idx: number, patch: Partial<HomeItem>) {
    setSections((prev) => prev.map((s) => (s.id === secId ? { ...s, items: (s.items || []).map((it, i) => (i === idx ? { ...it, ...patch } : it)) } : s)));
  }
  function addItem(secId: string) {
    setSections((prev) => prev.map((s) => (s.id === secId ? { ...s, items: [...(s.items || []), {}] } : s)));
  }
  function removeItem(secId: string, idx: number) {
    setSections((prev) => prev.map((s) => (s.id === secId ? { ...s, items: (s.items || []).filter((_, i) => i !== idx) } : s)));
  }
  async function uploadItem(secId: string, idx: number, file?: File) { if (file) patchItem(secId, idx, { image: await fileToDataUrl(file) }); }
  async function uploadHero(file?: File) { if (file) setHeroImage(await fileToDataUrl(file)); }
  async function uploadBlock(id: string, file?: File) { if (file) patchSection(id, { image: await fileToDataUrl(file) }); }

  async function save() {
    setStatus({ kind: "saving" });
    try {
      const next: Template = {
        ...template,
        store: { ...(template.store as Record<string, unknown>), home: { ...home0, ...currentHome() } },
      };
      await api.saveTemplate(next, adminPin);
      onTemplateChange(next);
      setStatus({ kind: "ok", msg: t("common.saved") });
      setPreviewKey((k) => k + 1);
      setTimeout(() => setStatus({ kind: "idle" }), 2500);
    } catch (e) {
      setStatus({ kind: "error", msg: e instanceof ApiError && e.status === 401 ? t("common.no_access") : t("common.save_fail") });
    }
  }

  function sectionLabel(s: HomeSection) {
    if (BUILTIN.has(s.type)) return s.title || t(TYPE_KEY[s.type] || s.type);
    return s.title || s.text || t(TYPE_KEY[s.type] || s.type);
  }

  // ---------- item editor ----------
  function itemEditor(sec: HomeSection) {
    const items = sec.items || [];
    return (
      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="rounded-lg bg-sand/60 p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink/60">{t("adm.item")} {idx + 1}</span>
              <button className="text-xs text-red-600 hover:underline" onClick={() => removeItem(sec.id, idx)}>{t("common.delete")}</button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative h-12 w-20 overflow-hidden rounded border border-line bg-white">
                {it.image && <img src={it.image} alt="" className="h-full w-full object-cover" />}
              </div>
              <label className="btn-ghost cursor-pointer text-xs">
                {t("adm.upload")}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadItem(sec.id, idx, e.target.files?.[0])} />
              </label>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input className="input" placeholder={t("adm.hero_heading")} value={it.title || ""} onChange={(e) => patchItem(sec.id, idx, { title: e.target.value })} />
              {sec.type !== "gallery" && <input className="input" placeholder={t("adm.block_btn")} value={it.button || ""} onChange={(e) => patchItem(sec.id, idx, { button: e.target.value })} />}
            </div>
            <input className="input mt-2" placeholder={t("adm.block_link")} value={it.link || ""} onChange={(e) => patchItem(sec.id, idx, { link: e.target.value })} />
          </div>
        ))}
        <button className="btn-ghost w-full text-sm" onClick={() => addItem(sec.id)}>{t("adm.add_item")}</button>
      </div>
    );
  }

  // ---------- section body (inline) ----------
  function sectionBody(s: HomeSection) {
    if (BUILTIN.has(s.type)) {
      return <input className="input" placeholder={`${t("adm.section_heading")} — ${t(TYPE_KEY[s.type])}`} value={s.title || ""} onChange={(e) => patchSection(s.id, { title: e.target.value })} />;
    }
    if (s.type === "custom") {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-24 overflow-hidden rounded-lg border border-line bg-sand">
              {s.image && <img src={s.image} alt="" className="h-full w-full object-cover" />}
            </div>
            <label className="btn-ghost cursor-pointer">{t("adm.upload")}<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadBlock(s.id, e.target.files?.[0])} /></label>
            {s.image && <button className="text-xs text-red-600 hover:underline" onClick={() => patchSection(s.id, { image: "" })}>{t("adm.remove_image")}</button>}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input" placeholder={t("adm.hero_heading")} value={s.title || ""} onChange={(e) => patchSection(s.id, { title: e.target.value })} />
            <input className="input" placeholder={t("adm.block_btn")} value={s.button || ""} onChange={(e) => patchSection(s.id, { button: e.target.value })} />
          </div>
          <input className="input" placeholder={t("adm.block_text")} value={s.text || ""} onChange={(e) => patchSection(s.id, { text: e.target.value })} />
          <input className="input" placeholder={t("adm.block_link")} value={s.link || ""} onChange={(e) => patchSection(s.id, { link: e.target.value })} />
        </div>
      );
    }
    if (s.type === "strip") {
      return (
        <div className="space-y-2">
          <input className="input" placeholder={t("adm.block_text")} value={s.text || ""} onChange={(e) => patchSection(s.id, { text: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input" placeholder={t("adm.block_btn")} value={s.button || ""} onChange={(e) => patchSection(s.id, { button: e.target.value })} />
            <input className="input" placeholder={t("adm.block_link")} value={s.link || ""} onChange={(e) => patchSection(s.id, { link: e.target.value })} />
          </div>
        </div>
      );
    }
    if (s.type === "richtext") {
      return (
        <div className="space-y-2">
          <input className="input" placeholder={t("adm.hero_heading")} value={s.title || ""} onChange={(e) => patchSection(s.id, { title: e.target.value })} />
          <input className="input" placeholder={t("adm.block_text")} value={s.text || ""} onChange={(e) => patchSection(s.id, { text: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input" placeholder={t("adm.block_btn")} value={s.button || ""} onChange={(e) => patchSection(s.id, { button: e.target.value })} />
            <input className="input" placeholder={t("adm.block_link")} value={s.link || ""} onChange={(e) => patchSection(s.id, { link: e.target.value })} />
          </div>
        </div>
      );
    }
    if (s.type === "spacer") {
      return (
        <div>
          <label className="field-label">{t("adm.size_label")}</label>
          <select className="input" value={s.size || "m"} onChange={(e) => patchSection(s.id, { size: e.target.value })}>
            <option value="s">{t("adm.h_s")}</option>
            <option value="m">{t("adm.h_m")}</option>
            <option value="l">{t("adm.h_l")}</option>
          </select>
        </div>
      );
    }
    if (ITEM_TYPES.has(s.type)) {
      return (
        <div className="space-y-2">
          <input className="input" placeholder={t("adm.section_heading")} value={s.title || ""} onChange={(e) => patchSection(s.id, { title: e.target.value })} />
          {itemEditor(s)}
        </div>
      );
    }
    return null;
  }

  const ADD_BUTTONS: { type: string; key: string }[] = [
    { type: "custom", key: "adm.add_block" },
    { type: "duo", key: "adm.add_duo" },
    { type: "slider", key: "adm.add_slider" },
    { type: "gallery", key: "adm.add_gallery" },
    { type: "strip", key: "adm.add_strip" },
    { type: "richtext", key: "adm.add_text" },
    { type: "spacer", key: "adm.add_spacer" },
  ];

  function accHeader(id: string, label: string, extra?: React.ReactNode) {
    const active = open === id;
    return (
      <button
        data-acc={id}
        onClick={() => setOpen(active ? "" : id)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${active ? "bg-ink text-white" : "bg-sand/70 text-ink hover:bg-sand"}`}
      >
        <span className="flex items-center gap-2">{label}</span>
        <span className="flex items-center gap-2">{extra}<span className="text-xs opacity-60">{active ? "▾" : "▸"}</span></span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-sand">
      {/* Toolbar */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button className="btn-ghost" onClick={() => onClose?.()}>← {t("adm.close_builder")}</button>
          <span className="hidden font-serif text-lg sm:inline">{t("adm.page_title")}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* undo / redo */}
          <div className="flex overflow-hidden rounded-full border border-line">
            <button className="px-3 py-1.5 text-sm disabled:opacity-30 hover:bg-sand" onClick={undo} disabled={!canUndo} title={t("adm.undo")}>↶</button>
            <button className="border-l border-line px-3 py-1.5 text-sm disabled:opacity-30 hover:bg-sand" onClick={redo} disabled={!canRedo} title={t("adm.redo")}>↷</button>
          </div>
          {/* device */}
          <div className="inline-flex rounded-full border border-line bg-sand p-0.5 text-xs font-semibold">
            <button className={`rounded-full px-3 py-1 transition ${device === "desktop" ? "bg-ink text-white" : "text-ink/60"}`} onClick={() => setDevice("desktop")}>🖥</button>
            <button className={`rounded-full px-3 py-1 transition ${device === "mobile" ? "bg-ink text-white" : "text-ink/60"}`} onClick={() => setDevice("mobile")}>📱</button>
          </div>
          {status.msg && <span className={`text-sm font-medium ${status.kind === "error" ? "text-red-600" : "text-green-600"}`}>{status.msg}</span>}
          <button className="btn-primary" onClick={save} disabled={status.kind === "saving"}>
            {status.kind === "saving" ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Settings rail */}
        <aside ref={railRef} className="w-[300px] shrink-0 space-y-2 overflow-y-auto border-r border-line bg-white p-3 sm:w-[360px]">
          <p className="rounded-lg bg-clay/5 px-3 py-2 text-xs text-ink/60">{t("adm.click_to_edit")}</p>

          {/* Design */}
          {accHeader("design", t("adm.design"))}
          {open === "design" && (
            <div className="space-y-3 px-1 pb-2 pt-1">
              <div className="grid grid-cols-2 gap-3">
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
              </div>
              <div>
                <label className="field-label">{t("adm.brand_font")}</label>
                <select className="input" value={font} onChange={(e) => setFont(e.target.value)}>
                  {FONT_OPTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Hero */}
          {accHeader("hero", t("adm.hero"), (
            <span
              role="checkbox"
              aria-checked={heroEnabled}
              onClick={(e) => { e.stopPropagation(); setHeroEnabled((v) => !v); }}
              className={`relative inline-block h-4 w-7 rounded-full transition ${heroEnabled ? "bg-clay" : "bg-line"}`}
            >
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${heroEnabled ? "left-3.5" : "left-0.5"}`} />
            </span>
          ))}
          {open === "hero" && heroEnabled && (
            <div className="space-y-3 px-1 pb-2 pt-1">
              <div>
                <label className="field-label">{t("adm.hero_image")}</label>
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-24 overflow-hidden rounded-lg border border-line bg-sand">
                    {heroImage && <img src={heroImage} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <label className="btn-ghost cursor-pointer">{t("adm.upload")}<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadHero(e.target.files?.[0])} /></label>
                  {heroImage && <button className="text-xs text-red-600 hover:underline" onClick={() => setHeroImage("")}>{t("adm.remove_image")}</button>}
                </div>
              </div>
              <div>
                <label className="field-label">{t("adm.hero_heading")}</label>
                <input className="input" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="PERA" />
              </div>
              <div>
                <label className="field-label">{t("adm.hero_sub")}</label>
                <input className="input" value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} />
              </div>
              <div>
                <label className="field-label">{t("adm.hero_btn")}</label>
                <input className="input" value={heroButton} onChange={(e) => setHeroButton(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">{t("adm.hero_height")}</label>
                  <select className="input" value={heroHeight} onChange={(e) => setHeroHeight(e.target.value)}>
                    <option value="s">{t("adm.h_s")}</option><option value="m">{t("adm.h_m")}</option><option value="l">{t("adm.h_l")}</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">{t("adm.hero_align")}</label>
                  <select className="input" value={heroAlign} onChange={(e) => setHeroAlign(e.target.value)}>
                    <option value="center">{t("se.align_center")}</option><option value="left">{t("se.align_left")}</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">{t("adm.hero_overlay")}</label>
                  <select className="input" value={heroOverlay} onChange={(e) => setHeroOverlay(e.target.value)}>
                    <option value="0">{t("adm.ov_0")}</option><option value="1">{t("adm.ov_1")}</option><option value="2">{t("adm.ov_2")}</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">{t("adm.hero_textcolor")}</label>
                  <select className="input" value={heroTextColor} onChange={(e) => setHeroTextColor(e.target.value)}>
                    <option value="light">{t("adm.text_light")}</option><option value="dark">{t("adm.text_dark")}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Presets */}
          {accHeader("presets", t("adm.presets"))}
          {open === "presets" && (
            <div className="space-y-2 px-1 pb-2 pt-1">
              <div className="flex flex-wrap gap-2">
                <button className="btn-ghost" onClick={() => applyPreset("market")}>{t("adm.preset_market")}</button>
                <button className="btn-ghost" onClick={() => applyPreset("minimal")}>{t("adm.preset_minimal")}</button>
                <button className="btn-ghost" onClick={() => applyPreset("promo")}>{t("adm.preset_promo")}</button>
              </div>
              <p className="text-xs text-ink/40">{t("adm.preset_hint")}</p>
            </div>
          )}

          {/* Sections list */}
          <div className="flex items-center justify-between px-1 pt-3">
            <h3 className="text-sm font-semibold text-ink/70">{t("adm.sections_title")}</h3>
            <span className="text-xs text-ink/40">{t("adm.section_count", { n: sections.length })}</span>
          </div>
          <p className="px-1 text-[11px] text-ink/40">{t("adm.drag_hint")}</p>

          <div className="space-y-1.5">
            {sections.map((s, i) => {
              const active = open === s.id;
              return (
                <div
                  key={s.id}
                  data-acc={s.id}
                  onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
                  onDrop={() => onDrop(i)}
                  className={`rounded-xl border transition ${overIndex === i && dragIndex !== null ? "border-clay bg-clay/5" : active ? "border-ink" : "border-line"} ${dragIndex === i ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-1.5 px-2 py-2">
                    <span
                      draggable
                      onDragStart={() => setDragIndex(i)}
                      onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                      className="cursor-grab select-none px-1 text-ink/40 active:cursor-grabbing"
                      title={t("adm.drag_hint")}
                    >⠿</span>
                    <button onClick={() => setOpen(active ? "" : s.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-sand text-xs">{TYPE_ICON[s.type] || "▦"}</span>
                      <span className={`truncate text-sm ${s.enabled === false ? "text-ink/35 line-through" : "font-medium"}`}>{sectionLabel(s)}</span>
                    </button>
                    <span
                      role="checkbox"
                      aria-checked={s.enabled !== false}
                      title={t("adm.show")}
                      onClick={() => patchSection(s.id, { enabled: s.enabled === false })}
                      className={`relative inline-block h-4 w-7 shrink-0 cursor-pointer rounded-full transition ${s.enabled !== false ? "bg-clay" : "bg-line"}`}
                    >
                      <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${s.enabled !== false ? "left-3.5" : "left-0.5"}`} />
                    </span>
                    <span className="text-xs opacity-50">{active ? "▾" : "▸"}</span>
                  </div>
                  {active && (
                    <div className="space-y-2 border-t border-line px-3 py-3">
                      {sectionBody(s)}
                      {!BUILTIN.has(s.type) && (
                        <div className="flex items-center gap-3 pt-1">
                          <button className="text-xs text-ink/50 hover:text-ink hover:underline" onClick={() => duplicate(s.id)}>{t("adm.duplicate")}</button>
                          <button className="text-xs text-red-600 hover:underline" onClick={() => removeBlock(s.id)}>{t("common.delete")}</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add block */}
          <div className="pt-2">
            <div className="px-1 pb-1 text-xs font-semibold text-ink/50">{t("adm.add_block_label")}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {ADD_BUTTONS.map((b) => (
                <button key={b.type} className="flex items-center gap-1.5 rounded-lg border border-line px-2 py-2 text-left text-xs font-medium hover:border-clay/50 hover:bg-clay/5" onClick={() => addBlock(b.type)}>
                  <span className="grid h-5 w-5 place-items-center rounded bg-sand text-[11px]">{TYPE_ICON[b.type]}</span>
                  {t(TYPE_KEY[b.type])}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Preview canvas */}
        <div ref={canvasRef} className="relative flex min-w-0 flex-1 items-start justify-center overflow-auto bg-[#e7e2da] p-6">
          <div style={{ width: Math.round(FW * scale) }} className={`overflow-hidden bg-white shadow-2xl ${device === "mobile" ? "rounded-[1.6rem] ring-8 ring-ink/80" : "rounded-xl"}`}>
            {device === "desktop" && (
              <div className="flex items-center gap-1.5 border-b border-line bg-sand px-3 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <span className="ml-3 rounded-full bg-white px-3 py-0.5 text-xs text-ink/40">vrapzi.com</span>
              </div>
            )}
            <div style={{ height: Math.round(FH * scale) }} className="overflow-hidden">
              <iframe
                key={previewKey}
                ref={iframeRef}
                src="/"
                title="preview"
                onLoad={postPreview}
                style={{ width: FW, height: FH, border: 0, transform: `scale(${scale})`, transformOrigin: "top left" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
