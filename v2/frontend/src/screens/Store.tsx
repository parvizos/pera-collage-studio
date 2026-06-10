import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Template } from "../api/types";
import { api, type StoreProduct, type StoreVariation } from "../api/client";
import { Thumb } from "../components/Thumb";
import { useI18n } from "../i18n";
import { translateTerm } from "../i18n/glossary";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

interface Props {
  template: Template;
}

const WHATSAPP = "905339178551"; // +90 533 917 85 51
const CART_KEY = "pera_cart";

const FONTS: Record<string, { head: string; body: string }> = {
  serif: { head: '"Instrument Serif", serif', body: '"DM Sans", system-ui, sans-serif' },
  modern: { head: '"Poppins", sans-serif', body: '"Poppins", sans-serif' },
  elegant: { head: '"Playfair Display", serif', body: '"DM Sans", system-ui, sans-serif' },
  clean: { head: '"Montserrat", sans-serif', body: '"Montserrat", sans-serif' },
};

// Per-block style value maps (shared with the admin builder).
const SPACE_PX: Record<string, number> = { none: 0, s: 16, m: 32, l: 56, xl: 96 };
const ANIM_DUR: Record<string, string> = { fast: "0.4s", normal: "0.65s", slow: "1s" };
const ANIM_DELAY: Record<string, string> = { "0": "0s", s: "0.15s", m: "0.35s" };

/** "#d47516" → "212 117 22" (for rgb(var(--accent-rgb) / a)). */
function hexToRgbTriplet(hex?: string): string | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function slugify(s: string): string {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function ytId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/);
  return m ? m[1] : null;
}
function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

/** Embedded video (YouTube / Vimeo / direct mp4-webm). */
function VideoBlock({ url }: { url: string }) {
  const yt = ytId(url);
  const vm = vimeoId(url);
  const src = yt ? `https://www.youtube.com/embed/${yt}` : vm ? `https://player.vimeo.com/video/${vm}` : null;
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-ink shadow-sm">
      {src ? (
        <iframe className="absolute inset-0 h-full w-full" src={src} title="video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      ) : /\.(mp4|webm|ogg)(\?|$)/i.test(url) ? (
        <video src={url} controls className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="grid h-full place-items-center text-white/50">▶</div>
      )}
    </div>
  );
}

/** Running-text strip. speed: "s" slow, "m" medium, "l" fast. */
function Marquee({ text, speed }: { text: string; speed?: string }) {
  const dur = speed === "l" ? 12 : speed === "s" ? 40 : 22;
  const piece = <span className="mx-6 inline-block">{text}</span>;
  return (
    <div className="overflow-hidden rounded-xl bg-clay py-3 text-white">
      <div className="pera-marquee-track text-sm font-semibold uppercase tracking-wide" style={{ animationDuration: `${dur}s` }}>
        <span className="inline-flex">{Array.from({ length: 8 }).map((_, i) => <span key={i}>{piece}</span>)}</span>
        <span className="inline-flex" aria-hidden>{Array.from({ length: 8 }).map((_, i) => <span key={i}>{piece}</span>)}</span>
      </div>
    </div>
  );
}

/** Countdown to a target ISO date. */
function Countdown({ target, title }: { target?: string; title?: string }) {
  const { t } = useI18n();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = target ? new Date(target).getTime() : 0;
  const diff = Math.max(0, end - now);
  const ended = !target || (end > 0 && diff === 0);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const cell = (val: number, label: string) => (
    <div className="flex min-w-[64px] flex-col items-center rounded-xl bg-white/15 px-3 py-2">
      <span className="font-serif text-3xl tabular-nums">{String(val).padStart(2, "0")}</span>
      <span className="text-[11px] uppercase tracking-wide opacity-80">{label}</span>
    </div>
  );
  return (
    <div className="rounded-2xl bg-clay px-5 py-6 text-center text-white">
      {title && <h2 className="mb-3 font-serif text-2xl">{title}</h2>}
      {ended ? (
        <div className="text-lg font-semibold">{t("store.ended")}</div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {cell(d, t("store.days"))}{cell(h, t("store.hours"))}{cell(m, t("store.mins"))}{cell(s, t("store.secs"))}
        </div>
      )}
    </div>
  );
}

function parsePrice(p?: string): number {
  if (!p) return 0;
  const n = parseFloat(p.replace(/[^\d.,]/g, "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

const LETTER_SIZE = /^\d?(XS|S|M|L|XL|XXL|XXXL)$/i;

/**
 * Оптовая серия: сколько штук в товаре, исходя из размера.
 * - Буквы "S M L XL XXL" → число размеров (5).
 * - Числовой диапазон "36-42" → 36,38,40,42 = 4 (шаг 2).
 * - Явный список "36-38-40-42" → число чисел.
 * - Один размер / непонятно → 1.
 */
function seriesCount(size?: string): number {
  if (!size) return 1;
  const tokens = size.trim().split(/[\s,/-]+/).filter(Boolean);
  const letters = tokens.filter((t) => LETTER_SIZE.test(t));
  if (letters.length) return letters.length;
  const nums = (size.match(/\d+/g) || []).map(Number);
  if (nums.length >= 3) return nums.length;
  if (nums.length === 2) {
    const lo = Math.min(nums[0], nums[1]);
    const hi = Math.max(nums[0], nums[1]);
    return hi > lo ? Math.floor((hi - lo) / 2) + 1 : 1;
  }
  return 1;
}

export interface CartItem {
  key: string;
  id: string;
  code: string;
  price: string; // series total (unit × count)
  unit: string; // price per piece
  count: number; // pieces in the series
  photo: string;
  color: string;
  size: string;
  qty: number;
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

/** Discount info for a variation if its old price is higher than the current one. */
function discountOf(v: StoreVariation): { old: number; pct: number } | null {
  const old = parsePrice(v.oldPrice);
  const cur = parsePrice(v.price);
  if (old > 0 && cur > 0 && old > cur) return { old, pct: Math.round((1 - cur / old) * 100) };
  return null;
}

function cheapestVar(p: StoreProduct): StoreVariation | null {
  const vs = p.variations.filter((v) => parsePrice(v.price) > 0);
  if (!vs.length) return null;
  return vs.reduce((a, b) => (parsePrice(a.price) <= parsePrice(b.price) ? a : b));
}

function productDiscount(p: StoreProduct): { old: number; pct: number } | null {
  const c = cheapestVar(p);
  return c ? discountOf(c) : null;
}

function collect(items: StoreProduct[], pick: (p: StoreProduct) => string[]): string[] {
  const seen: string[] = [];
  for (const it of items) {
    for (const raw of pick(it)) {
      const v = (raw || "").trim();
      if (v && !seen.includes(v)) seen.push(v);
    }
  }
  return seen;
}


export function Store({ template }: Props) {
  const { t, lang } = useI18n();
  const term = (v?: string) => translateTerm(v, lang);
  const store = template.store as Record<string, unknown>;
  const title = (store.title as string) || "PERA";
  const subtitle = (store.subtitle as string) || "ISTANBUL";
  const logo = store.logo as string | null;
  const whatsapp = ((store.whatsapp as string) || WHATSAPP).replace(/[^\d]/g, "");
  const instagram = (store.instagram as string) || "peraistanbulstore";
  const currency = (store.currency as string) || "₺";

  // Live preview: the admin homepage editor posts an unsaved config via postMessage.
  const [liveHome, setLiveHome] = useState<Record<string, unknown> | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; home?: Record<string, unknown>; previewMode?: boolean; selectedId?: string } | null;
      if (!d || d.type !== "pera-home-preview") return;
      if (d.home) setLiveHome(d.home);
      if ("previewMode" in d) setPreviewMode(!!d.previewMode);
      if ("selectedId" in d) setSelectedId(d.selectedId || "");
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  /** In preview mode wrap each block so clicking it opens its settings in the builder. */
  function previewWrap(id: string, node: React.ReactNode) {
    if (!previewMode) return node;
    const sel = selectedId === id;
    return (
      <div
        key={id}
        onClickCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
          try { window.parent.postMessage({ type: "pera-section-click", id }, "*"); } catch { /* ignore */ }
        }}
        className={`relative cursor-pointer rounded-lg transition ${
          sel ? "outline outline-2 outline-clay outline-offset-4" : "hover:outline hover:outline-2 hover:outline-clay/40 hover:outline-offset-4"
        }`}
      >
        {node}
      </div>
    );
  }

  const home = liveHome || (store.home as Record<string, unknown>) || {};
  const branding = (home.branding as Record<string, string>) || {};
  const rootStyle: React.CSSProperties = {};
  const accRgb = hexToRgbTriplet(branding.accent);
  if (accRgb) (rootStyle as Record<string, string>)["--accent-rgb"] = accRgb;
  const bgRgb = hexToRgbTriplet(branding.bg);
  if (bgRgb) (rootStyle as Record<string, string>)["--bg-rgb"] = bgRgb;
  const fontPreset = branding.font && FONTS[branding.font];
  if (fontPreset) {
    (rootStyle as Record<string, string>)["--font-head"] = fontPreset.head;
    (rootStyle as Record<string, string>)["--font-body"] = fontPreset.body;
  }

  // Entrance animation: reveal .pera-anim blocks as they scroll into view.
  // Guarded with a timeout fallback so a block can never stay hidden.
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(".pera-anim"));
    if (!els.length) return;
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("pera-anim-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { (e.target as HTMLElement).classList.add("pera-anim-in"); io.unobserve(e.target); }
      }),
      { threshold: 0.06 },
    );
    els.forEach((el) => io.observe(el));
    const safety = window.setTimeout(() => els.forEach((el) => el.classList.add("pera-anim-in")), 3000);
    return () => { io.disconnect(); clearTimeout(safety); };
  }, [liveHome, previewMode]);

  // Promo popup (marketing modal). On the live site: shows once per session after a delay.
  // In the builder: shows only while the "popup" panel is selected, so editing isn't blocked.
  const popupCfg = (home.popup as Record<string, unknown>) || {};
  const popupEnabled = popupCfg.enabled === true;
  const [popupOpen, setPopupOpen] = useState(false);
  useEffect(() => {
    if (previewMode) { setPopupOpen(popupEnabled && selectedId === "__popup__"); return; }
    if (!popupEnabled) { setPopupOpen(false); return; }
    try { if (sessionStorage.getItem("pera_popup_seen")) return; } catch { /* ignore */ }
    const delay = Math.max(0, Number(popupCfg.delay) || 2) * 1000;
    const id = setTimeout(() => {
      setPopupOpen(true);
      try { sessionStorage.setItem("pera_popup_seen", "1"); } catch { /* ignore */ }
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupEnabled, previewMode, selectedId]);

  /** Любую цену всегда приводим к валюте магазина (игнорируя символ, что ввёл сотрудник). */
  const money = (num: number) => {
    const v = Number.isInteger(num) ? String(num) : String(Math.round(num * 100) / 100);
    return currency ? `${v} ${currency}` : v;
  };

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [sort, setSort] = useState<"new" | "cheap" | "expensive">("new");

  const [quick, setQuick] = useState<StoreProduct | null>(null);
  const [variationIdx, setVariationIdx] = useState(0);
  const [quickPhoto, setQuickPhoto] = useState(0);

  const [cart, setCart] = useState<CartItem[]>(() => loadCart());
  const [cartPage, setCartPage] = useState(false);
  const [aboutPage, setAboutPage] = useState(false);
  const [listing, setListing] = useState<{ type: "brand" | "category" | "color"; value: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lColor, setLColor] = useState("");
  const [lSize, setLSize] = useState("");
  const [lSort, setLSort] = useState<"new" | "cheap" | "expensive">("new");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);

  const cartCount = cart.reduce((n, i) => n + i.qty, 0);
  const cartTotal = cart.reduce((sum, i) => sum + parsePrice(i.price) * i.qty, 0);

  function addToCart(p: StoreProduct, v: StoreVariation) {
    const key = v.id;
    const count = seriesCount(v.size);
    const unitNum = parsePrice(v.price);
    const price = money(unitNum * count);
    const unit = money(unitNum);
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i));
      return [
        ...prev,
        {
          key,
          id: v.id,
          code: p.code,
          price,
          unit,
          count,
          photo: v.photos[0] || v.collageImage,
          color: v.color,
          size: v.size,
          qty: 1,
        },
      ];
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  function setQty(key: string, qty: number) {
    setCart((prev) =>
      qty <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, qty } : i)),
    );
  }

  useEffect(() => {
    api
      .getStoreProducts({})
      .then((d) => setProducts(d.products))
      .catch(() => setError("load"))
      .finally(() => setLoading(false));
  }, []);

  // Resolve the current URL into a view (deep link / refresh / back-forward).
  const resolveRoute = useCallback(() => {
    setQuick(null);
    setCartPage(false);
    setAboutPage(false);
    setListing(null);

    const path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
    if (path === "/cart") { setCartPage(true); return; }
    if (path === "/about") { setAboutPage(true); return; }

    const dec = decodeURIComponent(path);
    const lm = dec.match(/^\/(brand|category|color)\/(.+)$/);
    if (lm) {
      const type = lm[1] as "brand" | "category" | "color";
      const wanted = lm[2];
      const pool =
        type === "brand"
          ? products.map((p) => p.brandName)
          : type === "category"
          ? products.map((p) => p.category)
          : products.flatMap((p) => p.colors || []);
      const value = pool.find((v) => v && slugify(v) === wanted);
      if (value) setListing({ type, value });
      return;
    }

    const pm = window.location.pathname.match(/^\/product\/(.+)$/);
    if (pm) {
      const slug = decodeURIComponent(pm[1].replace(/\/$/, ""));
      const found = products.find((p) => p.slug === slug);
      if (found) showProduct(found, false);
      else api.getStoreProduct(slug).then((p) => p && showProduct(p, false)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  useEffect(() => {
    resolveRoute();
  }, [resolveRoute]);

  useEffect(() => {
    window.addEventListener("popstate", resolveRoute);
    return () => window.removeEventListener("popstate", resolveRoute);
  }, [resolveRoute]);

  const categories = useMemo(() => collect(products, (p) => [p.category]), [products]);
  const colors = useMemo(() => collect(products, (p) => p.colors || []), [products]);
  const sizes = useMemo(() => collect(products, (p) => p.sizes || []), [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (category && p.category !== category) return false;
      if (brand && p.brandName !== brand) return false;
      if (color && !(p.colors || []).includes(color)) return false;
      if (size && !(p.sizes || []).includes(size)) return false;
      if (q) {
        const hay = `${p.code} ${p.name} ${p.category} ${(p.colors || []).join(" ")} ${p.brandName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort === "cheap") list = [...list].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    else if (sort === "expensive") list = [...list].sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    return list;
  }, [products, search, category, brand, color, size, sort]);

  // ---- homepage data ----
  const newArrivals = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
        .slice(0, 8),
    [products],
  );

  const shopBrands = useMemo(() => {
    const list = (template.brands ?? []) as { id: string; name: string; logo?: string | null }[];
    return list.filter((b) => products.some((p) => p.brandName === b.name));
  }, [template.brands, products]);

  const onSale = useMemo(() => products.filter((p) => productDiscount(p)).slice(0, 8), [products]);

  function categoryImage(cat: string): string {
    const p = products.find((pp) => pp.category === cat && (pp.photos[0] || pp.collageImage));
    return p ? p.photos[0] || p.collageImage : "";
  }

  function isNew(p: StoreProduct): boolean {
    if (!p.createdAt) return false;
    const ts = new Date(p.createdAt).getTime();
    return !Number.isNaN(ts) && Date.now() - ts < 14 * 86400000;
  }

  function scrollToCatalog() {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderCard(p: StoreProduct) {
    const main = p.photos[0] || p.collageImage;
    const alt = p.photos[1] || "";
    const vs = p.variations.filter((v) => parsePrice(v.price) > 0);
    const cheapest = vs.length ? vs.reduce((a, b) => (parsePrice(a.price) <= parsePrice(b.price) ? a : b)) : null;
    const unit = cheapest ? parsePrice(cheapest.price) : 0;
    const unitVaries = cheapest ? vs.some((v) => parsePrice(v.price) !== unit) : false;
    const cnt = cheapest ? seriesCount(cheapest.size) : 1;
    const disc = cheapest ? discountOf(cheapest) : null;
    return (
      <button
        key={p.id}
        onClick={() => openProduct(p)}
        className="group relative flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-line/60 transition hover:-translate-y-1 hover:shadow-xl"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-sand">
          {main ? (
            <>
              <Thumb src={main} w={500} alt={p.code} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              {alt && (
                <Thumb src={alt} w={500} alt="" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-ink/30">{t("store.no_photo")}</div>
          )}
          {disc ? (
            <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-extrabold text-white shadow">
              −{disc.pct}%
            </span>
          ) : isNew(p) ? (
            <span className="absolute left-2 top-2 rounded-full bg-clay px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-white shadow">
              {t("store.badge_new")}
            </span>
          ) : null}
          {p.colors.length > 1 && (
            <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-ink shadow-sm">
              {t("store.colors_n", { n: p.colors.length })}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3">
          <div className="truncate text-sm font-semibold">{p.code}</div>
          <div className="truncate text-xs text-ink/45">{[term(p.category), p.brandName].filter(Boolean).join(" · ")}</div>
          {cheapest && (
            <div className="mt-auto pt-2">
              <div className="flex items-baseline gap-1.5">
                <span className={`font-serif text-lg leading-none ${disc ? "text-red-600" : "text-clay"}`}>
                  {unitVaries ? `${money(unit)}+` : money(unit)}
                </span>
                {disc && <span className="text-xs text-ink/40 line-through">{money(disc.old)}</span>}
              </div>
              {cnt > 1 && (
                <div className="mt-0.5 text-[11px] text-ink/45">{t("store.series_calc", { n: cnt, total: money(unit * cnt) })}</div>
              )}
            </div>
          )}
        </div>
      </button>
    );
  }

  function applyVariation(_p: StoreProduct, i: number) {
    setVariationIdx(i);
    setQuickPhoto(0);
  }

  function clearViews() {
    setQuick(null);
    setCartPage(false);
    setAboutPage(false);
    setListing(null);
    setMenuOpen(false);
  }

  function showProduct(p: StoreProduct, push: boolean) {
    clearViews();
    setQuick(p);
    applyVariation(p, 0);
    if (push) window.history.pushState({}, "", `/product/${p.slug}`);
    window.scrollTo({ top: 0 });
  }

  function openProduct(p: StoreProduct) {
    showProduct(p, true);
  }

  function backToCatalog(push = true) {
    clearViews();
    if (push) window.history.pushState({}, "", "/");
    window.scrollTo({ top: 0 });
  }

  function goCart() {
    clearViews();
    setCartPage(true);
    window.history.pushState({}, "", "/cart");
    window.scrollTo({ top: 0 });
  }

  function goAbout() {
    clearViews();
    setAboutPage(true);
    window.history.pushState({}, "", "/about");
    window.scrollTo({ top: 0 });
  }

  function goListing(type: "brand" | "category" | "color", value: string) {
    clearViews();
    setLColor("");
    setLSize("");
    setLSort("new");
    setListing({ type, value });
    window.history.pushState({}, "", `/${type}/${slugify(value)}`);
    window.scrollTo({ top: 0 });
  }

  function goHome() {
    backToCatalog();
  }

  function cartWhatsappLink(): string {
    const lines = cart.map((i, n) => {
      const series = i.count > 1 ? ` (${t("wa.series", { n: i.count })})` : "";
      return `${n + 1}) ${i.code}${i.color ? `, ${i.color}` : ""}${i.size ? `, ${i.size}` : ""}${series} ×${i.qty}${
        i.price ? ` — ${i.price}` : ""
      }`;
    });
    const total = cartTotal > 0 ? `\n\n${t("wa.total")} ${money(cartTotal)}` : "";
    const text = `${t("wa.greeting")}\n${lines.join("\n")}${total}`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
  }

  function whatsappLink(p: StoreProduct, v: StoreVariation): string {
    const count = seriesCount(v.size);
    const series = money(parsePrice(v.price) * count);
    const colorPart = v.color ? `, ${t("wa.color")} ${v.color}` : "";
    const sizePart = v.size ? `, ${t("wa.size")} ${v.size}${count > 1 ? ` (${t("wa.series", { n: count })})` : ""}` : "";
    const text = `${t("wa.greeting")} ${p.code}${colorPart}${sizePart} — ${series}`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
  }

  // ---- Homepage (configurable from admin "Homepage" editor) ----
  const heroCfg = (home.hero as Record<string, unknown>) || {};
  const heroEnabled = heroCfg.enabled !== false;
  const heroImage = (heroCfg.image as string) || "";
  const heroTitle = (heroCfg.title as string) || title;
  const heroSubtitle = (heroCfg.subtitle as string) ?? t("store.tagline");
  const heroButton = (heroCfg.button as string) || t("store.view_catalog");
  const heroHeight = (heroCfg.height as string) || "m";
  const heroAlign = (heroCfg.align as string) || "center";
  const heroPad = heroHeight === "s" ? "py-8 sm:py-10" : heroHeight === "l" ? "py-24 sm:py-36" : "py-14 sm:py-20";
  const heroAlignCls = heroAlign === "left" ? "items-start text-left" : "items-center text-center";
  const heroOverlay = (heroCfg.overlay as string) || (heroImage ? "1" : "0");
  const overlayCls = heroImage
    ? heroOverlay === "2"
      ? "bg-gradient-to-br from-black/60 to-black/80"
      : heroOverlay === "0"
        ? "bg-gradient-to-br from-black/10 to-black/25"
        : "bg-gradient-to-br from-black/40 to-black/55"
    : "bg-gradient-to-br from-white/15 to-black/25";
  const heroText = (heroCfg.textColor as string) || "light";
  const heroTextCls = heroText === "dark" ? "text-ink" : "text-white";
  const heroSubCls = heroText === "dark" ? "text-ink/70" : "text-white/90";

  type HomeItem = { image?: string; title?: string; text?: string; link?: string; button?: string };
  type BlockStyle = { mt?: string; mb?: string; pad?: string; bg?: string; cols?: string; anim?: string; animDur?: string; animDelay?: string };
  type HomeSection = { id: string; type: string; enabled?: boolean; image?: string; title?: string; text?: string; link?: string; button?: string; items?: HomeItem[]; size?: string; date?: string; style?: BlockStyle };
  const DEFAULT_SECTIONS: HomeSection[] = [
    { id: "categories", type: "categories" },
    { id: "sale", type: "sale" },
    { id: "new", type: "new" },
    { id: "brands", type: "brands" },
    { id: "colors", type: "colors" },
    { id: "catalog", type: "catalog" },
  ];
  const sectionList: HomeSection[] = Array.isArray(home.sections) && (home.sections as unknown[]).length
    ? (home.sections as HomeSection[])
    : DEFAULT_SECTIONS;

  function goLink(link?: string) {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) window.open(link, "_blank");
    else if (link.startsWith("/")) window.location.href = link;
  }

  /** Per-block column count → responsive grid classes. */
  function colsClass(sec: HomeSection, def: string) {
    const c = sec.style?.cols;
    if (c === "1") return "grid-cols-1";
    if (c === "2") return "grid-cols-2";
    if (c === "3") return "grid-cols-2 sm:grid-cols-3";
    if (c === "4") return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
    if (c === "5") return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";
    if (c === "6") return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6";
    return def;
  }

  /** Wrap a rendered block with its per-block spacing, background and entrance animation. */
  function applyBlockStyle(sec: HomeSection, node: React.ReactNode) {
    if (!node || sec.type === "spacer") return node;
    const st = sec.style || {};
    const mt = st.mt !== undefined ? SPACE_PX[st.mt] ?? 0 : 0;
    const mb = st.mb !== undefined ? SPACE_PX[st.mb] ?? 40 : 40;
    const pad = st.pad ? SPACE_PX[st.pad] ?? 0 : 0;
    const banded = st.bg && st.bg !== "none";
    const bgCls = st.bg === "accent" ? "bg-clay text-white" : st.bg === "dark" ? "bg-ink text-white" : st.bg === "soft" ? "bg-clay/[0.06]" : "";
    const effAnim = st.anim && st.anim !== "none" ? st.anim : home.animations ? "up" : "none";
    const animOn = effAnim !== "none" && !previewMode;
    const style: React.CSSProperties = { marginTop: mt || undefined, marginBottom: mb, paddingTop: pad || undefined, paddingBottom: pad || undefined };
    if (animOn) {
      (style as Record<string, string>)["--anim-dur"] = ANIM_DUR[st.animDur || "normal"] || "0.65s";
      (style as Record<string, string>)["--anim-delay"] = ANIM_DELAY[st.animDelay || "0"] || "0s";
    }
    const cls = [banded ? `rounded-2xl px-4 sm:px-6 ${bgCls}` : "", animOn ? "pera-anim" : ""].filter(Boolean).join(" ");
    return (
      <div key={sec.id} className={cls || undefined} style={style} data-anim={animOn ? effAnim : undefined}>
        {node}
      </div>
    );
  }

  function renderSection(sec: HomeSection) {
    if (sec.enabled === false) return null;
    switch (sec.type) {
      case "categories":
        if (!categories.length) return null;
        return (
          <section key={sec.id}>
            <h2 className="mb-4 font-serif text-2xl">{sec.title || t("store.categories")}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((c) => {
                const img = categoryImage(c);
                return (
                  <button key={c} onClick={() => goListing("category", c)} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink text-white shadow-sm">
                    {img && <Thumb src={img} w={400} className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-110 group-hover:opacity-60" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-3 text-left font-semibold uppercase tracking-wide drop-shadow">{term(c)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      case "sale":
        if (!onSale.length) return null;
        return (
          <section key={sec.id}>
            <h2 className="mb-4 font-serif text-2xl text-red-600">{sec.title || t("store.sale")}</h2>
            <div className={`grid gap-3 sm:gap-5 ${colsClass(sec, "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}`}>{onSale.map((p) => renderCard(p))}</div>
          </section>
        );
      case "new":
        if (!newArrivals.length) return null;
        return (
          <section key={sec.id}>
            <h2 className="mb-4 font-serif text-2xl">{sec.title || t("store.new")}</h2>
            <div className={`grid gap-3 sm:gap-5 ${colsClass(sec, "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}`}>{newArrivals.map((p) => renderCard(p))}</div>
          </section>
        );
      case "brands":
        if (!shopBrands.length) return null;
        return (
          <section key={sec.id}>
            <h2 className="mb-4 font-serif text-2xl">{sec.title || t("store.brands")}</h2>
            <div className="flex flex-wrap gap-3">
              {shopBrands.map((b) => (
                <button key={b.id} onClick={() => goListing("brand", b.name)} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 transition hover:border-clay/50">
                  {b.logo ? (
                    <img src={b.logo} alt={b.name} className="h-8 w-8 rounded object-contain" />
                  ) : (
                    <span className="grid h-8 w-8 place-items-center rounded bg-sand text-xs font-bold text-ink/50">{b.name.slice(0, 2)}</span>
                  )}
                  <span className="text-sm font-medium">{b.name}</span>
                </button>
              ))}
            </div>
          </section>
        );
      case "colors":
        if (!colors.length) return null;
        return (
          <section key={sec.id}>
            <h2 className="mb-4 font-serif text-2xl">{sec.title || t("store.colors")}</h2>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button key={c} onClick={() => goListing("color", c)} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium transition hover:border-clay/50 hover:text-clay">
                  {term(c)}
                </button>
              ))}
            </div>
          </section>
        );
      case "strip":
        if (!sec.text && !sec.title) return null;
        return (
          <section key={sec.id} className={sec.link ? "cursor-pointer" : ""} onClick={() => goLink(sec.link)}>
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl bg-clay px-4 py-3 text-center text-sm font-semibold text-white">
              <span>{sec.text || sec.title}</span>
              {sec.button && <span className="rounded-full bg-white/25 px-3 py-1 text-xs">{sec.button}</span>}
            </div>
          </section>
        );
      case "richtext":
        if (!sec.title && !sec.text) return null;
        return (
          <section key={sec.id} className="text-center">
            {sec.title && <h2 className="font-serif text-3xl">{sec.title}</h2>}
            {sec.text && <p className="mx-auto mt-3 max-w-2xl text-ink/70">{sec.text}</p>}
            {sec.button && (
              <button onClick={() => goLink(sec.link)} className="mt-4 rounded-full bg-clay px-6 py-2.5 text-sm font-semibold text-white">
                {sec.button}
              </button>
            )}
          </section>
        );
      case "duo": {
        const items = (sec.items || []).slice(0, 2);
        if (!items.length) return null;
        return (
          <section key={sec.id}>
            {sec.title && <h2 className="mb-4 font-serif text-2xl">{sec.title}</h2>}
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  onClick={() => goLink(it.link)}
                  className={`relative overflow-hidden rounded-2xl bg-ink text-white shadow-sm ${it.link ? "cursor-pointer" : ""}`}
                >
                  {it.image ? <img src={it.image} alt="" className="h-48 w-full object-cover sm:h-60" /> : <div className="h-48 w-full bg-clay sm:h-60" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-black/10" />
                  <div className="absolute inset-0 flex flex-col justify-end gap-1 p-5">
                    {it.title && <h3 className="font-serif text-2xl drop-shadow">{it.title}</h3>}
                    {it.text && <p className="text-sm text-white/90 drop-shadow">{it.text}</p>}
                    {it.button && <span className="mt-1 inline-block w-fit rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-ink">{it.button}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      }
      case "slider": {
        const items = (sec.items || []).filter((it) => it.image);
        if (!items.length) return null;
        return (
          <section key={sec.id}>
            {sec.title && <h2 className="mb-4 font-serif text-2xl">{sec.title}</h2>}
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  onClick={() => goLink(it.link)}
                  className={`relative aspect-[16/9] w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl bg-ink sm:w-[60%] ${it.link ? "cursor-pointer" : ""}`}
                >
                  <img src={it.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  {(it.title || it.button) && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-5 text-white">
                        {it.title && <h3 className="font-serif text-2xl drop-shadow">{it.title}</h3>}
                        {it.button && <span className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-ink">{it.button}</span>}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      }
      case "gallery": {
        const imgs = (sec.items || []).filter((it) => it.image);
        if (!imgs.length) return null;
        return (
          <section key={sec.id}>
            {sec.title && <h2 className="mb-4 font-serif text-2xl">{sec.title}</h2>}
            <div className={`grid gap-3 ${colsClass(sec, "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}`}>
              {imgs.map((it, idx) => (
                <div
                  key={idx}
                  onClick={() => goLink(it.link)}
                  className={`group relative aspect-square overflow-hidden rounded-xl bg-ink ${it.link ? "cursor-pointer" : ""}`}
                >
                  <img src={it.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  {it.title && (
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-sm font-semibold text-white">{it.title}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      }
      case "spacer": {
        const h = sec.size === "s" ? 16 : sec.size === "l" ? 80 : 40;
        return <div key={sec.id} style={{ height: h }} aria-hidden />;
      }
      case "marquee":
        if (!sec.text) return null;
        return <section key={sec.id}><Marquee text={sec.text} speed={sec.size} /></section>;
      case "video":
        if (!sec.link) return null;
        return (
          <section key={sec.id}>
            {sec.title && <h2 className="mb-4 font-serif text-2xl">{sec.title}</h2>}
            <VideoBlock url={sec.link} />
          </section>
        );
      case "logos": {
        const logos = (sec.items || []).filter((it) => it.image);
        if (!logos.length) return null;
        const loop = [...logos, ...logos];
        return (
          <section key={sec.id}>
            {sec.title && <h2 className="mb-4 font-serif text-2xl">{sec.title}</h2>}
            <div className="overflow-hidden">
              <div className="pera-marquee-track items-center" style={{ animationDuration: "28s" }}>
                {loop.map((it, i) => (
                  <img key={i} src={it.image} alt="" className="mx-8 h-10 w-auto object-contain opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0" />
                ))}
              </div>
            </div>
          </section>
        );
      }
      case "countdown":
        return <section key={sec.id}><Countdown target={sec.date} title={sec.title} /></section>;
      case "features": {
        const items = (sec.items || []).filter((it) => it.title || it.text);
        if (!items.length) return null;
        return (
          <section key={sec.id}>
            {sec.title && <h2 className="mb-4 font-serif text-2xl">{sec.title}</h2>}
            <div className={`grid gap-4 ${colsClass(sec, "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}`}>
              {items.map((it, idx) => (
                <div key={idx} className="rounded-2xl border border-line bg-white p-5 text-center">
                  <div className="mb-2 text-3xl">{it.button || "✓"}</div>
                  {it.title && <div className="font-serif text-lg">{it.title}</div>}
                  {it.text && <p className="mt-1 text-sm text-ink/60">{it.text}</p>}
                </div>
              ))}
            </div>
          </section>
        );
      }
      case "stats": {
        const items = (sec.items || []).filter((it) => it.title);
        if (!items.length) return null;
        return (
          <section key={sec.id}>
            {sec.title && <h2 className="mb-4 font-serif text-2xl">{sec.title}</h2>}
            <div className={`grid gap-4 rounded-2xl bg-clay/10 p-6 ${colsClass(sec, "grid-cols-2 sm:grid-cols-4")}`}>
              {items.map((it, idx) => (
                <div key={idx} className="text-center">
                  <div className="font-serif text-4xl text-clay">{it.title}</div>
                  {it.text && <div className="mt-1 text-sm uppercase tracking-wide text-ink/60">{it.text}</div>}
                </div>
              ))}
            </div>
          </section>
        );
      }
      case "testimonials": {
        const items = (sec.items || []).filter((it) => it.text || it.title);
        if (!items.length) return null;
        return (
          <section key={sec.id}>
            {sec.title && <h2 className="mb-4 font-serif text-2xl">{sec.title}</h2>}
            <div className={`grid gap-4 ${colsClass(sec, "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}`}>
              {items.map((it, idx) => (
                <div key={idx} className="flex flex-col rounded-2xl border border-line bg-white p-5">
                  <div className="mb-2 text-clay">{"★★★★★"}</div>
                  {it.text && <p className="flex-1 text-sm text-ink/80">“{it.text}”</p>}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-clay/15 font-semibold text-clay">
                      {(it.title || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="text-sm font-semibold">{it.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      }
      case "faq": {
        const items = (sec.items || []).filter((it) => it.title);
        if (!items.length) return null;
        return (
          <section key={sec.id}>
            {sec.title && <h2 className="mb-4 font-serif text-2xl">{sec.title}</h2>}
            <div className="space-y-2">
              {items.map((it, idx) => (
                <details key={idx} className="group rounded-xl border border-line bg-white px-4 py-3">
                  <summary className="flex cursor-pointer items-center justify-between gap-2 font-medium">
                    {it.title}
                    <span className="text-ink/40 transition group-open:rotate-45">+</span>
                  </summary>
                  {it.text && <p className="mt-2 text-sm text-ink/70">{it.text}</p>}
                </details>
              ))}
            </div>
          </section>
        );
      }
      case "custom":
        return (
          <section key={sec.id}>
            <div
              className={`relative overflow-hidden rounded-2xl bg-ink text-white shadow-sm ${sec.link ? "cursor-pointer" : ""}`}
              onClick={() => goLink(sec.link)}
            >
              {sec.image ? (
                <img src={sec.image} alt="" className="h-56 w-full object-cover sm:h-72" />
              ) : (
                <div className="h-56 w-full bg-clay sm:h-72" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/10" />
              <div className="absolute inset-0 flex flex-col justify-center gap-2 p-6 sm:p-10">
                {sec.title && <h2 className="font-serif text-3xl drop-shadow sm:text-4xl">{sec.title}</h2>}
                {sec.text && <p className="max-w-md text-sm text-white/90 drop-shadow sm:text-base">{sec.text}</p>}
                {sec.button && (
                  <span className="mt-2 inline-block w-fit rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink">{sec.button}</span>
                )}
              </div>
            </div>
          </section>
        );
      case "catalog":
        return (
          <section key={sec.id} id="catalog" className="scroll-mt-20">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-2xl">{category ? term(category) : brand || sec.title || t("store.catalog")}</h2>
              {(category || brand || search) && (
                <button onClick={() => { setCategory(""); setBrand(""); setSearch(""); }} className="text-sm font-medium text-clay hover:underline">
                  {t("store.all_products")}
                </button>
              )}
            </div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Chip active={!category} onClick={() => setCategory("")}>{t("store.all")}</Chip>
              {categories.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? "" : c)}>{term(c)}</Chip>
              ))}
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {colors.length > 0 && (
                  <select className="input w-auto" value={color} onChange={(e) => setColor(e.target.value)}>
                    <option value="">{t("store.color_any")}</option>
                    {colors.map((c) => (<option key={c} value={c}>{term(c)}</option>))}
                  </select>
                )}
                {sizes.length > 0 && (
                  <select className="input w-auto" value={size} onChange={(e) => setSize(e.target.value)}>
                    <option value="">{t("store.size_any")}</option>
                    {sizes.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                )}
                <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                  <option value="new">{t("store.sort_new")}</option>
                  <option value="cheap">{t("store.sort_cheap")}</option>
                  <option value="expensive">{t("store.sort_expensive")}</option>
                </select>
              </div>
            </div>
            {loading ? (
              <p className="py-20 text-center text-ink/40">{t("common.loading")}</p>
            ) : error ? (
              <p className="py-20 text-center text-red-600">{t("common.load_failed")}</p>
            ) : filtered.length === 0 ? (
              <div className="grid min-h-[40vh] place-items-center rounded-2xl border border-dashed border-line bg-white/50 text-center text-ink/40">
                {products.length === 0 ? t("store.empty_soon") : t("store.not_found")}
              </div>
            ) : (
              <div className={`grid gap-3 sm:gap-5 ${colsClass(sec, "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}`}>{filtered.map((p) => renderCard(p))}</div>
            )}
          </section>
        );
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-sand" style={rootStyle}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <button onClick={() => backToCatalog()} className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt={title} className="h-9 w-auto" />
            ) : (
              <div className="text-left leading-none">
                <div className="font-serif text-2xl tracking-tight">{title}</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-ink/50">{subtitle}</div>
              </div>
            )}
          </button>
          <nav className="flex items-center gap-2 text-sm text-ink/60 sm:gap-3">
            <button onClick={() => setMenuOpen((v) => !v)} className="hidden font-medium hover:text-ink sm:block">
              {t("store.menu")} ▾
            </button>
            <button onClick={() => goAbout()} className="hidden font-medium hover:text-ink sm:block">
              {t("store.about")}
            </button>
            <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer" className="hidden hover:text-ink sm:block">
              Instagram
            </a>
            <a href="/staff" className="hidden rounded-full border border-line px-3 py-1.5 font-medium hover:border-ink/40 sm:block">
              {t("store.staff")}
            </a>
            <LanguageSwitcher />
            <button
              className="relative flex items-center gap-1.5 rounded-full bg-ink px-3 py-2 font-semibold text-white sm:px-4"
              onClick={() => goCart()}
              aria-label={t("store.cart")}
            >
              🛒<span className="hidden sm:inline"> {t("store.cart")}</span>
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-clay px-1 text-xs sm:static sm:right-auto sm:top-auto">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMenuOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-xl leading-none text-ink/70 hover:border-ink/40 sm:hidden"
              aria-label={t("store.menu")}
            >
              ☰
            </button>
          </nav>
        </div>
      </header>

      {aboutPage ? (
        <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <button onClick={() => backToCatalog()} className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-ink/60 hover:text-ink">
            {t("store.back_home")}
          </button>
          <h1 className="font-serif text-4xl">{t("store.about")}</h1>
          <p className="mt-5 whitespace-pre-line leading-relaxed text-ink/70">
            {(store.about as string) || t("store.about_default")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#25D366] px-5 py-3 font-semibold text-white">
              WhatsApp
            </a>
            <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer" className="rounded-full bg-ink px-5 py-3 font-semibold text-white">
              Instagram
            </a>
          </div>
        </main>
      ) : listing ? (() => {
        const base = products.filter((p) =>
          listing.type === "brand"
            ? p.brandName === listing.value
            : listing.type === "category"
            ? p.category === listing.value
            : (p.colors || []).includes(listing.value),
        );
        const fColors = collect(base, (p) => p.colors || []);
        const fSizes = collect(base, (p) => p.sizes || []);
        let items = base.filter((p) => {
          if (lColor && !(p.colors || []).includes(lColor)) return false;
          if (lSize && !(p.sizes || []).includes(lSize)) return false;
          return true;
        });
        if (lSort === "cheap") items = [...items].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
        else if (lSort === "expensive") items = [...items].sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
        const label =
          listing.type === "brand" ? t("store.brand_label") : listing.type === "category" ? t("product.category") : t("product.color");
        return (
          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <nav className="mb-4 text-sm text-ink/45">
              <button onClick={() => goHome()} className="hover:text-ink">{t("store.home")}</button>
              <span className="mx-1.5">/</span>
              <span className="text-ink/70">{term(listing.value)}</span>
            </nav>
            <div className="mb-5">
              <div className="text-xs uppercase tracking-wide text-ink/40">{label}</div>
              <h1 className="font-serif text-3xl">{term(listing.value)}</h1>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-2">
              {fColors.length > 0 && (
                <select className="input w-auto" value={lColor} onChange={(e) => setLColor(e.target.value)}>
                  <option value="">{t("store.color_any")}</option>
                  {fColors.map((c) => (<option key={c} value={c}>{term(c)}</option>))}
                </select>
              )}
              {fSizes.length > 0 && (
                <select className="input w-auto" value={lSize} onChange={(e) => setLSize(e.target.value)}>
                  <option value="">{t("store.size_any")}</option>
                  {fSizes.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              )}
              <select className="input ml-auto w-auto" value={lSort} onChange={(e) => setLSort(e.target.value as typeof lSort)}>
                <option value="new">{t("store.sort_new")}</option>
                <option value="cheap">{t("store.sort_cheap")}</option>
                <option value="expensive">{t("store.sort_expensive")}</option>
              </select>
            </div>

            {items.length === 0 ? (
              <div className="grid min-h-[40vh] place-items-center rounded-2xl border border-dashed border-line bg-white/50 text-ink/40">
                {t("store.not_found")}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                {items.map((p) => renderCard(p))}
              </div>
            )}
          </main>
        );
      })() : cartPage ? (
        <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          <button
            onClick={() => backToCatalog()}
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink/60 hover:text-ink"
          >
            {t("cart.continue")}
          </button>
          <h1 className="mb-5 font-serif text-3xl">{t("cart.title")}</h1>

          {cart.length === 0 ? (
            <div className="card grid min-h-[220px] place-items-center gap-3 text-center text-ink/50">
              <div>{t("cart.empty")}</div>
              <button className="btn-primary" onClick={() => backToCatalog()}>
                {t("cart.to_catalog")}
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.key} className="flex gap-3 rounded-xl border border-line bg-white p-2">
                    <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-sand">
                      {item.photo && <Thumb src={item.photo} w={160} className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="text-sm font-semibold">{item.code}</div>
                      <div className="text-xs text-ink/45">{[item.color, item.size].filter(Boolean).join(" · ")}</div>
                      {item.count > 1 && (
                        <div className="text-[11px] text-ink/40">
                          {t("cart.unit_calc", { unit: item.unit, n: item.count, total: item.price })}
                        </div>
                      )}
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button className="h-8 w-8 rounded-full border border-line" onClick={() => setQty(item.key, item.qty - 1)}>
                            −
                          </button>
                          <span className="w-6 text-center text-sm">{item.qty}</span>
                          <button className="h-8 w-8 rounded-full border border-line" onClick={() => setQty(item.key, item.qty + 1)}>
                            +
                          </button>
                        </div>
                        <span className="font-semibold">{item.price}</span>
                      </div>
                    </div>
                    <button
                      className="self-start px-1 text-ink/35 hover:text-red-600"
                      onClick={() => setQty(item.key, 0)}
                      title={t("cart.remove")}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-line bg-white p-4">
                <div className="mb-3 flex items-center justify-between text-lg font-semibold">
                  <span>{t("common.total")}</span>
                  <span>{cartTotal > 0 ? money(cartTotal) : "—"}</span>
                </div>
                <a
                  href={cartWhatsappLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-3.5 text-center font-semibold text-white"
                >
                  {t("cart.checkout_wa")}
                </a>
                <p className="mt-3 text-center text-xs text-ink/45">
                  {t("cart.stock_note")}
                </p>
              </div>
            </>
          )}
        </main>
      ) : quick ? (() => {
        const variation = quick.variations[variationIdx] ?? quick.variations[0];
        const gallery = [...variation.photos, variation.collageImage].filter(Boolean) as string[];
        const count = seriesCount(variation.size);
        const unitPrice = parsePrice(variation.price);
        const series = money(unitPrice * count);
        const disc = discountOf(variation);
        const related = products
          .filter((p) => p.key !== quick.key && (p.category === quick.category || p.brandName === quick.brandName))
          .slice(0, 6);
        return (
          <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
            <nav className="mb-4 text-sm text-ink/45">
              <button onClick={() => goHome()} className="hover:text-ink">{t("store.home")}</button>
              {quick.category && (
                <>
                  <span className="mx-1.5">/</span>
                  <button onClick={() => goListing("category", quick.category)} className="hover:text-ink">{term(quick.category)}</button>
                </>
              )}
              <span className="mx-1.5">/</span>
              <span className="text-ink/70">{quick.code}</span>
            </nav>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Photos */}
              <div>
                <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-white shadow-sm">
                  {(() => {
                    const src = gallery[quickPhoto] || gallery[0];
                    return src ? (
                      <img src={src} alt={quick.code} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-ink/30">{t("store.no_photo")}</div>
                    );
                  })()}
                </div>
                {gallery.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {gallery.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setQuickPhoto(i)}
                        className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === quickPhoto ? "border-clay" : "border-transparent"}`}
                      >
                        <Thumb src={src} w={160} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex flex-col">
                <h1 className="font-serif text-3xl">{quick.code}</h1>
                {quick.brandName && <div className="mt-1 text-sm text-ink/50">{quick.brandName}</div>}
                <dl className="mt-4 space-y-1 text-sm">
                  {quick.category && <Row label={t("product.category")} value={term(quick.category)} />}
                  {variation.color && <Row label={t("product.color")} value={term(variation.color)} />}
                  {variation.size && (
                    <Row
                      label={t("product.series_sizes")}
                      value={count > 1 ? `${variation.size} — ${t("store.pcs", { n: count })}` : variation.size}
                    />
                  )}
                </dl>
                {unitPrice > 0 && (
                  <div className="mt-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className={`font-serif text-3xl ${disc ? "text-red-600" : ""}`}>
                        {money(unitPrice)}
                        <span className="ml-1 align-middle font-sans text-sm text-ink/40">{t("product.per_piece")}</span>
                      </span>
                      {disc && <span className="text-lg text-ink/40 line-through">{money(disc.old)}</span>}
                      {disc && (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">−{disc.pct}%</span>
                      )}
                    </div>
                    {count > 1 && (
                      <div className="mt-1 text-base font-semibold text-ink/80">
                        {t("product.series_total", { n: count, total: series })}
                      </div>
                    )}
                  </div>
                )}

                {quick.variations.length > 1 && (
                  <div className="mt-5">
                    <div className="field-label">{t("product.variants", { n: quick.variations.length })}</div>
                    <div className="flex flex-wrap gap-2">
                      {quick.variations.map((v, i) => {
                        const thumb = v.photos[0] || v.collageImage;
                        return (
                          <button
                            key={v.id}
                            onClick={() => applyVariation(quick, i)}
                            className={`flex items-center gap-2 rounded-lg border py-1 pl-1 pr-2.5 text-sm transition ${
                              i === variationIdx ? "border-ink bg-ink text-white" : "border-line hover:border-ink/40"
                            }`}
                          >
                            <span className="h-8 w-8 shrink-0 overflow-hidden rounded bg-sand">
                              {thumb && <Thumb src={thumb} w={120} className="h-full w-full object-cover" />}
                            </span>
                            {v.color ? term(v.color) : t("product.variant_n", { n: i + 1 })}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-6 max-w-sm space-y-2">
                  <button
                    className="btn-primary w-full"
                    onClick={() => {
                      addToCart(quick, variation);
                      goCart();
                    }}
                  >
                    {t("product.add_cart")}
                  </button>
                  <a
                    href={whatsappLink(quick, variation)}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-full bg-[#25D366] py-3 text-center font-semibold text-white"
                  >
                    {t("product.order_wa")}
                  </a>
                </div>
              </div>
            </div>

            {related.length > 0 && (
              <section className="mt-12">
                <h2 className="mb-4 font-serif text-2xl">{t("store.related")}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                  {related.map((p) => renderCard(p))}
                </div>
              </section>
            )}
          </main>
        );
      })() : (
      <>
        {/* Hero */}
        {heroEnabled && previewWrap("__hero__",
          <section className={`relative overflow-hidden bg-clay ${heroTextCls}`}>
            {heroImage && <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <div className={`pointer-events-none absolute inset-0 ${overlayCls}`} />
            <div className={`relative mx-auto flex max-w-6xl flex-col ${heroAlignCls} px-4 ${heroPad} sm:px-6`}>
              {!heroImage && logo && <img src={logo} alt={title} className="mb-4 h-14 w-auto" />}
              <h1 className="font-serif text-4xl tracking-tight sm:text-6xl">{heroTitle}</h1>
              {heroSubtitle && <p className={`mt-3 max-w-xl text-sm sm:text-base ${heroSubCls}`}>{heroSubtitle}</p>}
              <div className="mt-7 flex w-full max-w-md items-center gap-1.5 rounded-full bg-white p-1.5 shadow-xl">
                <input
                  className="w-full bg-transparent px-4 py-2 text-ink outline-none placeholder:text-ink/40"
                  placeholder={t("store.search_ph")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") scrollToCatalog(); }}
                />
                <button onClick={scrollToCatalog} className="shrink-0 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white">
                  {heroButton}
                </button>
              </div>
            </div>
          </section>
        )}

        <main ref={mainRef} className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {sectionList.map((sec) => applyBlockStyle(sec, previewWrap(sec.id, renderSection(sec))))}
        </main>
      </>
      )}

      <footer className="border-t border-line bg-white/40 py-8 text-center text-sm text-ink/50">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-4">
          <button onClick={() => goAbout()} className="font-medium hover:text-ink">{t("store.about")}</button>
          <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer" className="hover:text-ink">Instagram</a>
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-ink">WhatsApp</a>
          <a href="/staff" className="hover:text-ink">{t("store.staff")}</a>
        </div>
        <div className="text-ink/40">© {new Date().getFullYear()} {title} {subtitle}</div>
      </footer>

      {/* Promo popup */}
      {popupOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/60 p-4 backdrop-blur-sm" onClick={() => setPopupOpen(false)}>
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPopupOpen(false)} className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-ink/60 hover:bg-white" aria-label={t("common.close")}>✕</button>
            {(popupCfg.image as string) && <img src={popupCfg.image as string} alt="" className="h-44 w-full object-cover" />}
            <div className="p-6 text-center">
              {(popupCfg.title as string) && <h3 className="font-serif text-2xl">{popupCfg.title as string}</h3>}
              {(popupCfg.text as string) && <p className="mt-2 text-sm text-ink/70">{popupCfg.text as string}</p>}
              {(popupCfg.button as string) && (
                <button onClick={() => { goLink(popupCfg.link as string); setPopupOpen(false); }} className="btn-primary mt-4">
                  {popupCfg.button as string}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide-in menu drawer (hamburger on mobile, "Catalog" on desktop) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute right-0 top-0 flex h-full w-80 max-w-[86vw] flex-col overflow-auto bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-5 py-4">
              <span className="font-serif text-xl">{t("store.menu")}</span>
              <button className="grid h-9 w-9 place-items-center rounded-full text-ink/50 hover:bg-sand" onClick={() => setMenuOpen(false)} aria-label={t("common.close")}>
                ✕
              </button>
            </div>

            <div className="space-y-5 p-5">
              {/* Quick links (mobile) */}
              <div className="space-y-1 sm:hidden">
                <button onClick={() => goHome()} className="block w-full rounded-lg px-3 py-2 text-left font-medium hover:bg-sand">
                  {t("store.home")}
                </button>
                <button onClick={() => goAbout()} className="block w-full rounded-lg px-3 py-2 text-left font-medium hover:bg-sand">
                  {t("store.about")}
                </button>
                <a href="/staff" className="block w-full rounded-lg px-3 py-2 text-left font-medium hover:bg-sand">
                  {t("store.staff")}
                </a>
                <div className="px-3 pt-2"><LanguageSwitcher /></div>
              </div>

              {categories.length > 0 && (
                <div>
                  <div className="field-label">{t("store.categories")}</div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <button key={c} onClick={() => goListing("category", c)} className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-clay/50 hover:text-clay">
                        {term(c)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {shopBrands.length > 0 && (
                <div>
                  <div className="field-label">{t("store.brands")}</div>
                  <div className="flex flex-wrap gap-2">
                    {shopBrands.map((b) => (
                      <button key={b.id} onClick={() => goListing("brand", b.name)} className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-clay/50 hover:text-clay">
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {colors.length > 0 && (
                <div>
                  <div className="field-label">{t("store.colors")}</div>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c) => (
                      <button key={c} onClick={() => goListing("color", c)} className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-clay/50 hover:text-clay">
                        {term(c)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="block rounded-full bg-[#25D366] py-3 text-center font-semibold text-white sm:hidden"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Added toast */}
      {added && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white shadow-lg">
            {t("cart.added")}
          </div>
        </div>
      )}

    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink/60 hover:border-ink/40"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/60 py-1">
      <dt className="text-ink/45">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

