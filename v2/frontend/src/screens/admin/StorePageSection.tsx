import { useEffect, useReducer, useRef, useState } from "react";
import type { Template } from "../../api/types";
import { api, ApiError } from "../../api/client";
import { thumbUrl } from "../../components/Thumb";
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

interface HeroSlide {
  image?: string;
  video?: string;
  title?: string;
  subtitle?: string;
  button?: string;
  link?: string;
  button2?: string;
  link2?: string;
  overlay?: string;
  textColor?: string;
  align?: string;
  textAnim?: string;
  kenburns?: boolean;
  parallax?: boolean;
}

interface BlockStyle {
  mt?: string;
  mb?: string;
  pad?: string;
  bg?: string;
  bgColor?: string;
  grad1?: string;
  grad2?: string;
  gradDir?: string;
  video?: string;
  parallax?: boolean;
  textColor?: string;
  radius?: string;
  full?: boolean;
  hide?: string;
  cols?: string;
  anim?: string;
  animDur?: string;
  animDelay?: string;
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
  date?: string;
  style?: BlockStyle;
}

const GRID_TYPES = new Set(["gallery", "features", "stats", "testimonials", "sale", "new", "catalog"]);
const SPACE_OPTS = ["none", "s", "m", "l", "xl"];
const ANIM_OPTS = ["none", "fade", "up", "down", "left", "right", "zoom"];

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
  split: "adm.split",
  cta: "adm.cta",
  marquee: "adm.marquee",
  countdown: "adm.countdown",
  testimonials: "adm.testimonials",
  stats: "adm.stats",
  faq: "adm.faq",
  features: "adm.features",
  video: "adm.video",
  logos: "adm.logos",
  socials: "adm.socials",
  map: "adm.map",
  perks: "adm.perks",
};

const TYPE_ICON: Record<string, string> = {
  categories: "▦", sale: "%", new: "✦", brands: "◈", colors: "◐", catalog: "▤",
  custom: "🖼", strip: "▬", duo: "▥", slider: "❮❯", richtext: "T", gallery: "▣", spacer: "↕",
  marquee: "🅰", countdown: "⏱", testimonials: "❝", stats: "📊", faq: "❓", features: "★",
  video: "▶", logos: "◫", split: "◧", cta: "⬢", socials: "♥", map: "📍", perks: "✦",
};

const BUILTIN = new Set(["categories", "sale", "new", "brands", "colors", "catalog"]);
const IMAGE_ITEMS = new Set(["duo", "slider", "gallery", "logos"]);
const CONTENT_ITEMS = new Set(["testimonials", "stats", "faq", "features"]);

const PALETTES: { name: string; accent: string; bg: string }[] = [
  { name: "Clay", accent: "#d47516", bg: "#f6f1ea" },
  { name: "Emerald", accent: "#0f766e", bg: "#eef5f3" },
  { name: "Berry", accent: "#be185d", bg: "#f7eef2" },
  { name: "Indigo", accent: "#4338ca", bg: "#eef0fb" },
  { name: "Sunset", accent: "#ea580c", bg: "#fdf1e8" },
  { name: "Mono", accent: "#1a1a1a", bg: "#f4f4f4" },
];

// ---- Full-page templates (each = a complete, visually distinct home config) ----
interface PageTemplate {
  id: string;
  name: string;
  config: {
    branding: Record<string, string>;
    hero: Record<string, unknown>;
    sections: HomeSection[];
    animations: boolean;
    popup?: Record<string, unknown>;
  };
}

const ti = (title: string, text: string) => ({ title, text });

const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "atelier",
    name: "Atelier",
    config: {
      branding: { accent: "#1c1b19", bg: "#f3efe9", font: "elegant", customFont: "Cormorant Garamond" },
      hero: { enabled: true, height: "full", search: false, autoplay: 6, slides: [
        { title: "ATELIER", subtitle: "Премиальный дом моды · Стамбул", button: "Коллекция", link: "/", button2: "О бренде", link2: "/", overlay: "2", textColor: "light", align: "center", textAnim: "up", kenburns: true },
        { title: "Couture SS26", subtitle: "Лимитированные серии ручного отбора", button: "Смотреть", overlay: "2", textColor: "light", align: "center", textAnim: "fade", kenburns: true },
      ] },
      animations: true,
      popup: { enabled: true, title: "VIP-доступ", text: "−15% на первый заказ по промокоду ATELIER", button: "Получить", delay: 3 },
      sections: [
        { id: "perks", type: "perks", enabled: true, items: [{ button: "🚚", title: "Доставка по миру" }, { button: "🧵", title: "Премиум ткани" }, { button: "✅", title: "Контроль качества" }], style: { mb: "l" } },
        { id: "new", type: "new", enabled: true, title: "Новинки сезона", style: { mb: "l", cols: "3", anim: "up" } },
        { id: "split", type: "split", enabled: true, title: "Наше ателье", text: "Серии напрямую от производителя, без посредников.", button: "Подробнее", size: "left", style: { mb: "l", anim: "left" } },
        { id: "tst", type: "testimonials", enabled: true, title: "Отзывы байеров", items: [ti("Aylin", "Превосходное качество тканей."), ti("Mert", "Быстрая отгрузка, всё чётко."), ti("Lena", "Заказываю каждый сезон.")], style: { mb: "l", bg: "soft", pad: "l", anim: "up" } },
        { id: "rt", type: "richtext", enabled: true, title: "CRAFTED IN ISTANBUL", text: "Каждая серия — ручной отбор и контроль.", button: "Запросить прайс", style: { full: true, pad: "xl", grad1: "#1c1b19", grad2: "#403a30", textColor: "light", mb: "l", anim: "fade" } },
        { id: "cta", type: "cta", enabled: true, title: "Готовы к заказу?", button: "Написать в WhatsApp", style: { bg: "accent", full: true, pad: "l", textColor: "light" } },
      ],
    },
  },
  {
    id: "neon",
    name: "Neon Street",
    config: {
      branding: { accent: "#ff2e63", bg: "#f3f3f4", font: "clean", customFont: "Oswald" },
      hero: { enabled: true, height: "full", search: false, autoplay: 0, slides: [
        { title: "DROP 01", subtitle: "Streetwear оптом — от одной серии", button: "В каталог", link: "/", button2: "Новинки", link2: "/", overlay: "2", textColor: "light", align: "left", textAnim: "up", parallax: true },
      ] },
      animations: true,
      sections: [
        { id: "marquee", type: "marquee", enabled: true, text: "SALE · NEW DROP · STREETWEAR · HYPE ·", size: "l", style: { mb: "m" } },
        { id: "new", type: "new", enabled: true, title: "Свежий дроп", style: { mb: "l", cols: "4", anim: "up", animDelay: "0" } },
        { id: "rt", type: "richtext", enabled: true, title: "BUILT FOR THE STREET", text: "Дерзкие модели для молодёжных магазинов.", button: "Каталог", style: { full: true, pad: "xl", grad1: "#111114", grad2: "#ff2e63", textColor: "light", mb: "l", anim: "zoom" } },
        { id: "stats", type: "stats", enabled: true, items: [ti("5K+", "моделей"), ti("24ч", "отгрузка"), ti("40+", "стран")], style: { mb: "l", cols: "3" } },
        { id: "cd", type: "countdown", enabled: true, title: "Дроп заканчивается", date: "2026-12-31T23:59", style: { mb: "l", full: true } },
        { id: "cta", type: "cta", enabled: true, title: "Залетай в опт", button: "Связаться", style: { bg: "accent", full: true, pad: "l", textColor: "light" } },
      ],
    },
  },
  {
    id: "mono",
    name: "Mono",
    config: {
      branding: { accent: "#121212", bg: "#ffffff", font: "modern" },
      hero: { enabled: true, height: "m", search: false, autoplay: 0, slides: [
        { title: "MONO", subtitle: "Меньше — значит лучше", button: "Каталог", link: "/", overlay: "1", textColor: "light", align: "left", textAnim: "fade" },
      ] },
      animations: true,
      sections: [
        { id: "perks", type: "perks", enabled: true, items: [{ button: "✓", title: "Честные цены" }, { button: "✓", title: "Быстрая отгрузка" }, { button: "✓", title: "Опт от 1 серии" }], style: { mb: "xl" } },
        { id: "new", type: "new", enabled: true, title: "Новинки", style: { mb: "xl", cols: "4", anim: "fade" } },
        { id: "sp", type: "spacer", enabled: true, size: "l" },
        { id: "split", type: "split", enabled: true, title: "Философия", text: "Чистые линии и честные цены.", button: "Подробнее", size: "right", style: { mb: "xl", anim: "right" } },
        { id: "cat", type: "catalog", enabled: true, style: { mt: "l" } },
      ],
    },
  },
  {
    id: "rose",
    name: "Rosé",
    config: {
      branding: { accent: "#d6849b", bg: "#fbf3f1", font: "elegant", customFont: "Cormorant Garamond" },
      hero: { enabled: true, height: "l", search: false, autoplay: 5, slides: [
        { title: "Rosé", subtitle: "Романтичная оптовая мода", button: "Коллекция", link: "/", overlay: "1", textColor: "light", align: "center", textAnim: "up", kenburns: true },
        { title: "Soft Spring", subtitle: "Нежные оттенки сезона", button: "Смотреть", overlay: "1", textColor: "light", align: "center", textAnim: "zoom" },
      ] },
      animations: true,
      popup: { enabled: true, title: "Привет! 🌸", text: "Дарим −10% на первую серию", button: "Хочу скидку", delay: 2 },
      sections: [
        { id: "perks", type: "perks", enabled: true, items: [{ button: "🌸", title: "Нежные ткани" }, { button: "🚚", title: "Бережная доставка" }, { button: "💗", title: "Любимый сервис" }], style: { mb: "l" } },
        { id: "cat", type: "categories", enabled: true, title: "Категории", style: { mb: "l" } },
        { id: "new", type: "new", enabled: true, title: "Новинки", style: { mb: "l", cols: "3", anim: "zoom" } },
        { id: "split", type: "split", enabled: true, title: "О нас", text: "Делаем оптовые закупки приятными.", button: "Подробнее", size: "left", style: { mb: "l", bg: "soft", pad: "l", radius: "l", anim: "left" } },
        { id: "tst", type: "testimonials", enabled: true, title: "Отзывы", items: [ti("Дина", "Милейшие модели!"), ti("Аня", "Беру каждый сезон."), ti("Кэт", "Сервис топ.")], style: { mb: "l", cols: "3" } },
        { id: "cta", type: "cta", enabled: true, title: "Готовы заказать?", button: "Написать", style: { grad1: "#d6849b", grad2: "#e9b8c4", full: true, pad: "l", textColor: "light" } },
      ],
    },
  },
  {
    id: "denim",
    name: "Denim Co.",
    config: {
      branding: { accent: "#2c4a7c", bg: "#eef2f7", font: "clean" },
      hero: { enabled: true, height: "l", search: false, autoplay: 0, slides: [
        { title: "DENIM CO.", subtitle: "Джинс и casual оптом", button: "В каталог", link: "/", button2: "Акции", link2: "/", overlay: "2", textColor: "light", align: "left", textAnim: "left" },
      ] },
      animations: true,
      sections: [
        { id: "perks", type: "perks", enabled: true, items: [{ button: "👖", title: "Джинс премиум" }, { button: "🚚", title: "Доставка карго" }, { button: "📦", title: "Опт от серии" }], style: { mb: "l" } },
        { id: "cat", type: "categories", enabled: true, title: "Категории", style: { mb: "l" } },
        { id: "sale", type: "sale", enabled: true, title: "Распродажа", style: { mb: "l", cols: "4", anim: "up" } },
        { id: "new", type: "new", enabled: true, title: "Новинки", style: { mb: "l", cols: "4", anim: "up", animDelay: "s" } },
        { id: "feat", type: "features", enabled: true, title: "Преимущества", items: [{ title: "Качество", text: "Плотный деним", button: "🏅" }, { title: "Размеры", text: "Полная сетка", button: "📏" }, { title: "Цена", text: "Прямой опт", button: "💰" }], style: { mb: "l", cols: "3" } },
        { id: "cta", type: "cta", enabled: true, title: "Сделать заказ", button: "Написать в WhatsApp", style: { bg: "accent", full: true, pad: "l", textColor: "light" } },
      ],
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    config: {
      branding: { accent: "#6d28d9", bg: "#f7f4fb", font: "elegant", customFont: "Marcellus" },
      hero: { enabled: true, height: "full", search: false, autoplay: 6, slides: [
        { title: "EDITORIAL", subtitle: "Лукбук сезона 2026", button: "Смотреть", link: "/", overlay: "2", textColor: "light", align: "center", textAnim: "up", parallax: true },
        { title: "SS26 STORY", subtitle: "Снято вживую", button: "Образы", overlay: "2", textColor: "light", align: "center", textAnim: "fade", parallax: true },
      ] },
      animations: true,
      sections: [
        { id: "marquee", type: "marquee", enabled: true, text: "EDITORIAL · SS26 · WHOLESALE ·", size: "s", style: { mb: "l" } },
        { id: "new", type: "new", enabled: true, title: "Образы недели", style: { mb: "l", cols: "3", anim: "up" } },
        { id: "gal", type: "gallery", enabled: true, title: "Галерея", items: [{}, {}, {}, {}], style: { mb: "l" } },
        { id: "split1", type: "split", enabled: true, title: "За кадром", text: "Каждую серию снимаем вживую.", button: "Instagram", size: "left", style: { mb: "l", anim: "left" } },
        { id: "split2", type: "split", enabled: true, title: "Команда", text: "Стилисты, фотографы, байеры.", button: "О нас", size: "right", style: { mb: "l", anim: "right" } },
        { id: "cta", type: "cta", enabled: true, title: "Запросить каталог", button: "Написать", style: { bg: "soft", full: true, pad: "l" } },
      ],
    },
  },
  {
    id: "active",
    name: "Active",
    config: {
      branding: { accent: "#0ea5e9", bg: "#f0f9ff", font: "clean", customFont: "Oswald" },
      hero: { enabled: true, height: "full", search: false, autoplay: 0, slides: [
        { title: "ACTIVE", subtitle: "Спортивная одежда оптом", button: "В каталог", link: "/", button2: "Новинки", link2: "/", overlay: "2", textColor: "light", align: "left", textAnim: "up", parallax: true },
      ] },
      animations: true,
      sections: [
        { id: "marquee", type: "marquee", enabled: true, text: "FAST SHIPPING · BULK · TEAMWEAR ·", size: "l", style: { mb: "m" } },
        { id: "perks", type: "perks", enabled: true, items: [{ button: "⚡", title: "Отгрузка 24ч" }, { button: "📦", title: "Любые партии" }, { button: "🏅", title: "Контроль ОТК" }], style: { mb: "l" } },
        { id: "feat", type: "features", enabled: true, title: "Преимущества", items: [{ title: "Технологичные ткани", text: "Дышат и тянутся", button: "🧬" }, { title: "Команды", text: "Форма под клуб", button: "🏆" }, { title: "Опт", text: "От одной серии", button: "📦" }], style: { mb: "l", cols: "3", anim: "up" } },
        { id: "stats", type: "stats", enabled: true, items: [ti("8K+", "позиций"), ti("24ч", "отгрузка"), ti("50+", "стран"), ti("99%", "в наличии")], style: { mb: "l", grad1: "#0ea5e9", grad2: "#1d4ed8", textColor: "light", full: true, pad: "l", cols: "4" } },
        { id: "new", type: "new", enabled: true, title: "Новинки", style: { mb: "l", cols: "4", anim: "up", animDelay: "s" } },
        { id: "cd", type: "countdown", enabled: true, title: "Акция заканчивается через", date: "2026-12-31T23:59", style: { mb: "l", full: true } },
        { id: "cta", type: "cta", enabled: true, title: "Сделать заказ", button: "Написать в WhatsApp", style: { bg: "accent", full: true, pad: "l", textColor: "light" } },
      ],
    },
  },
  {
    id: "noir",
    name: "Noir",
    config: {
      branding: { accent: "#b8a06a", bg: "#f4f2ee", font: "elegant", customFont: "Cormorant Garamond" },
      hero: { enabled: true, height: "full", search: false, autoplay: 5, slides: [
        { title: "NOIR", subtitle: "Монохромная роскошь", button: "Коллекция", link: "/", button2: "О бренде", link2: "/", overlay: "2", textColor: "light", align: "center", textAnim: "fade", kenburns: true },
      ] },
      animations: true,
      popup: { enabled: true, title: "Закрытый показ", text: "−15% по промокоду NOIR", button: "Получить", delay: 3 },
      sections: [
        { id: "perks", type: "perks", enabled: true, items: [{ button: "🖤", title: "Монохром" }, { button: "🧵", title: "Премиум крой" }, { button: "🚚", title: "Доставка по миру" }], style: { mb: "l" } },
        { id: "new", type: "new", enabled: true, title: "Новинки", style: { mb: "l", cols: "3", anim: "up" } },
        { id: "rt", type: "richtext", enabled: true, title: "TIMELESS", text: "Вне сезона и трендов.", button: "Прайс", style: { full: true, pad: "xl", grad1: "#15130f", grad2: "#3a3220", textColor: "light", mb: "l", anim: "fade" } },
        { id: "split", type: "split", enabled: true, title: "Философия", text: "Меньше цвета — больше смысла.", button: "О бренде", size: "right", style: { mb: "l", anim: "right" } },
        { id: "tst", type: "testimonials", enabled: true, title: "Отзывы", items: [ti("Selin", "Безупречный крой."), ti("Igor", "Стильно и премиально."), ti("Mara", "Мой постоянный поставщик.")], style: { mb: "l", bg: "soft", pad: "l", cols: "3" } },
        { id: "cta", type: "cta", enabled: true, title: "Запросить прайс", button: "Написать в WhatsApp", style: { grad1: "#15130f", grad2: "#3a3220", full: true, pad: "l", textColor: "light" } },
      ],
    },
  },
];

const THUMB_FONT: Record<string, string> = {
  serif: '"Instrument Serif", serif',
  modern: '"Poppins", sans-serif',
  elegant: '"Playfair Display", serif',
  clean: '"Montserrat", sans-serif',
};

const PHOTO_GRID = new Set(["new", "sale", "catalog", "gallery", "logos", "duo", "slider", "categories"]);
const CONTENT_GRID = new Set(["features", "stats", "testimonials", "faq"]);
const BAR_TYPES = new Set(["marquee", "strip", "cta", "countdown", "socials", "richtext"]);

/** Realistic mini-render of one section using real product photos. */
function tplMiniReal(s: HomeSection, b: Record<string, string>, photos: string[], idx: number) {
  const pic = (k: number) => (photos.length ? photos[(idx + k) % photos.length] : "");
  if (PHOTO_GRID.has(s.type)) {
    return (
      <div className="flex gap-1">
        {[0, 1, 2].map((k) => (
          <div key={k} className="aspect-[3/4] flex-1 overflow-hidden rounded-[3px] bg-black/5">
            {pic(k + 1) && <img src={pic(k + 1)} alt="" className="h-full w-full object-cover" />}
          </div>
        ))}
      </div>
    );
  }
  if (s.type === "split") {
    return (
      <div className="flex items-center gap-1.5">
        <div className="aspect-[4/3] w-1/2 overflow-hidden rounded-[3px] bg-black/5">{pic(1) && <img src={pic(1)} alt="" className="h-full w-full object-cover" />}</div>
        <div className="flex w-1/2 flex-col gap-1">
          <div className="h-[4px] w-3/4 rounded-full" style={{ backgroundColor: b.accent + "99" }} />
          <div className="h-[3px] w-full rounded-full bg-black/10" />
          <div className="h-[3px] w-2/3 rounded-full bg-black/10" />
        </div>
      </div>
    );
  }
  if (CONTENT_GRID.has(s.type)) {
    const n = s.type === "testimonials" ? 2 : s.type === "faq" ? 1 : 3;
    return (
      <div className={`flex gap-1 ${s.type === "faq" ? "flex-col" : ""}`}>
        {Array.from({ length: n }).map((_, k) => (
          <div key={k} className="flex flex-1 flex-col gap-0.5 rounded-[3px] bg-black/[0.04] p-1">
            <div className="h-[4px] w-2/3 rounded-full" style={{ backgroundColor: b.accent + "88" }} />
            <div className="h-[3px] w-full rounded-full bg-black/10" />
          </div>
        ))}
      </div>
    );
  }
  if (s.type === "video" || s.type === "map") {
    return <div className="grid aspect-[16/7] w-full place-items-center rounded-[3px] bg-ink/80 text-[8px] text-white/80">{s.type === "video" ? "▶" : "📍"}</div>;
  }
  if (s.type === "spacer") return <div className="h-2" />;
  if (BAR_TYPES.has(s.type)) {
    const dark = s.style?.bg === "dark";
    const accent = dark ? false : s.style?.bg === "accent" || s.type === "marquee" || s.type === "cta";
    const label = (s.text || s.title || "").slice(0, 22);
    return (
      <div className="flex h-3 w-full items-center justify-center rounded-[3px] text-[5px] font-semibold text-white" style={{ backgroundColor: dark ? "#15130f" : accent ? b.accent : b.accent + "33", color: accent || dark ? "#fff" : "#555" }}>
        {(accent || dark) && label}
      </div>
    );
  }
  return <div className="h-2.5 w-2/3 rounded-full bg-black/10" />;
}

function TemplateThumb({ tpl, photos }: { tpl: PageTemplate; photos: string[] }) {
  const b = tpl.config.branding;
  const heroCfg = tpl.config.hero;
  const slide0 = (Array.isArray(heroCfg.slides) && (heroCfg.slides as Record<string, unknown>[])[0]) || heroCfg;
  const hero = { enabled: heroCfg.enabled, title: slide0.title, align: slide0.align } as Record<string, unknown>;
  const left = hero.align === "left";
  const fam = THUMB_FONT[b.font] || "inherit";
  const heroImg = photos[0];
  return (
    <div className="aspect-[4/3] w-full overflow-hidden" style={{ backgroundColor: b.bg, fontFamily: fam }}>
      {hero.enabled !== false && (
        <div className="relative h-[44%] w-full overflow-hidden" style={{ backgroundColor: b.accent }}>
          {heroImg && <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
          <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${b.accent}dd, ${b.accent}66)` }} />
          <div className={`absolute inset-0 flex flex-col justify-center gap-1 px-2.5 text-white ${left ? "items-start" : "items-center"}`}>
            <div className="text-[8px] font-bold leading-none tracking-wide drop-shadow">{String(hero.title || "")}</div>
            <div className="h-[3px] w-10 rounded-full bg-white/60" />
            {hero.button ? <div className="mt-0.5 rounded-full bg-white px-1.5 py-[1px] text-[5px] font-bold leading-tight" style={{ color: b.accent }}>{String(hero.button)}</div> : null}
          </div>
        </div>
      )}
      <div className="space-y-1 p-1.5">
        {tpl.config.sections.slice(0, 4).map((s, i) => <div key={i}>{tplMiniReal(s, b, photos, i + 1)}</div>)}
      </div>
    </div>
  );
}

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
  const [customFont, setCustomFont] = useState(b0.customFont || "");

  function heroToSlides(h: Record<string, unknown>): HeroSlide[] {
    if (Array.isArray(h.slides) && (h.slides as unknown[]).length) return h.slides as HeroSlide[];
    return [{ image: (h.image as string) || "", video: "", title: (h.title as string) || "", subtitle: (h.subtitle as string) || "", button: (h.button as string) || "", link: (h.link as string) || "", overlay: (h.overlay as string) || "1", textColor: (h.textColor as string) || "light", align: (h.align as string) || "center" }];
  }
  const [heroEnabled, setHeroEnabled] = useState(hero0.enabled !== false);
  const [heroHeight, setHeroHeight] = useState((hero0.height as string) || "m");
  const [heroSearch, setHeroSearch] = useState(hero0.search === true);
  const [heroAutoplay, setHeroAutoplay] = useState(Number(hero0.autoplay) || 0);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(heroToSlides(hero0));
  const [heroSlideIdx, setHeroSlideIdx] = useState(0);

  const [sections, setSections] = useState<HomeSection[]>(sections0);
  const [animations, setAnimations] = useState(home0.animations === true);

  const popup0 = (home0.popup as Record<string, unknown>) || {};
  const [popupEnabled, setPopupEnabled] = useState(popup0.enabled === true);
  const [popupImage, setPopupImage] = useState((popup0.image as string) || "");
  const [popupTitle, setPopupTitle] = useState((popup0.title as string) || "");
  const [popupText, setPopupText] = useState((popup0.text as string) || "");
  const [popupButton, setPopupButton] = useState((popup0.button as string) || "");
  const [popupLink, setPopupLink] = useState((popup0.link as string) || "");
  const [popupDelay, setPopupDelay] = useState(Number(popup0.delay) || 2);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [previewKey, setPreviewKey] = useState(0);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [copiedStyle, setCopiedStyle] = useState<BlockStyle | null>(null);
  const [open, setOpen] = useState<string>("design"); // "design" | "hero" | "presets" | "i18n" | sectionId
  const [demoPhotos, setDemoPhotos] = useState<string[]>([]);
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>(
    (home0.translations as Record<string, Record<string, string>>) || {},
  );

  // Real product photos for template previews.
  useEffect(() => {
    let alive = true;
    api.getStoreProducts({}).then((d) => {
      if (!alive) return;
      const prods = (d.products || []) as Array<{ variations?: { photos?: string[]; collageImage?: string }[]; collageImage?: string }>;
      const out: string[] = [];
      for (const p of prods) {
        const v = p.variations && p.variations[0];
        const src = (v && v.photos && v.photos[0]) || (v && v.collageImage) || p.collageImage;
        if (src) out.push(thumbUrl(src, 320));
        if (out.length >= 10) break;
      }
      setDemoPhotos(out);
    }).catch(() => { /* preview falls back to color blocks */ });
    return () => { alive = false; };
  }, []);

  // ---------- live config ----------
  function currentHome() {
    return {
      branding: { accent, bg, font, customFont },
      hero: { enabled: heroEnabled, height: heroHeight, search: heroSearch, autoplay: heroAutoplay, slides: heroSlides },
      sections,
      animations,
      popup: { enabled: popupEnabled, image: popupImage, title: popupTitle, text: popupText, button: popupButton, link: popupLink, delay: popupDelay },
      translations,
    };
  }
  function selectedId() {
    if (open === "hero") return "__hero__";
    if (open === "popup") return "__popup__";
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
      const w = iframeRef.current?.contentWindow;
      w?.postMessage({ type: "pera-home-preview", home: currentHome(), previewMode: true, selectedId: selectedId() }, "*");
      w?.postMessage({ type: "pera-hero-slide", index: open === "hero" ? heroSlideIdx : 0 }, "*");
    } catch { /* ignore */ }
  }
  useEffect(() => {
    const id = setTimeout(postPreview, 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accent, bg, font, customFont, heroEnabled, heroHeight, heroSearch, heroAutoplay, heroSlides, heroSlideIdx, sections, animations, popupEnabled, popupImage, popupTitle, popupText, popupButton, popupLink, popupDelay, device, open]);

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
  }, [accent, bg, font, customFont, heroEnabled, heroHeight, heroSearch, heroAutoplay, heroSlides, sections, animations, popupEnabled, popupImage, popupTitle, popupText, popupButton, popupLink, popupDelay]);
  function applyHome(s: string) {
    const c = JSON.parse(s);
    applyingRef.current = true;
    setAccent(c.branding.accent); setBg(c.branding.bg); setFont(c.branding.font); setCustomFont(c.branding.customFont || "");
    setHeroEnabled(c.hero.enabled !== false); setHeroHeight(c.hero.height || "m");
    setHeroSearch(c.hero.search === true); setHeroAutoplay(Number(c.hero.autoplay) || 0);
    setHeroSlides(heroToSlides(c.hero)); setHeroSlideIdx(0);
    setSections(c.sections || []);
    setAnimations(c.animations === true);
    const pp = c.popup || {};
    setPopupEnabled(pp.enabled === true); setPopupImage(pp.image || ""); setPopupTitle(pp.title || "");
    setPopupText(pp.text || ""); setPopupButton(pp.button || ""); setPopupLink(pp.link || ""); setPopupDelay(Number(pp.delay) || 2);
  }
  function undo() { if (idxRef.current > 0) { idxRef.current--; applyHome(histRef.current[idxRef.current]); bumpHist(); } }
  function redo() { if (idxRef.current < histRef.current.length - 1) { idxRef.current++; applyHome(histRef.current[idxRef.current]); bumpHist(); } }
  const canUndo = idxRef.current > 0;
  const canRedo = idxRef.current < histRef.current.length - 1;

  // ---------- section ops ----------
  function patchSection(id: string, patch: Partial<HomeSection>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function patchStyle(id: string, patch: Partial<BlockStyle>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, style: { ...(s.style || {}), ...patch } } : s)));
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
    else if (type === "socials") base.items = [{ title: "instagram" }];
    else if (type === "perks") base.items = [{ button: "🚚", title: "Доставка" }, { button: "✅", title: "Гарантия" }, { button: "💳", title: "Оплата" }];
    else if (CONTENT_ITEMS.has(type)) base.items = [{}, {}, {}];
    else if (type === "spacer" || type === "marquee") base.size = "m";
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
  function applyTemplate(tpl: PageTemplate) {
    const c = tpl.config;
    setAccent(c.branding.accent); setBg(c.branding.bg); setFont(c.branding.font); setCustomFont(c.branding.customFont || "");
    const h = c.hero;
    setHeroEnabled(h.enabled !== false); setHeroHeight((h.height as string) || "m"); setHeroSearch(h.search === true); setHeroAutoplay(Number(h.autoplay) || 0);
    setHeroSlides(heroToSlides(h)); setHeroSlideIdx(0);
    setTranslations({});
    const stamp = Date.now();
    setSections(c.sections.map((s, i) => ({ ...s, id: `${s.type}_${stamp}_${i}` })));
    setAnimations(c.animations === true);
    const pp = c.popup || {};
    setPopupEnabled(pp.enabled === true); setPopupImage((pp.image as string) || ""); setPopupTitle((pp.title as string) || "");
    setPopupText((pp.text as string) || ""); setPopupButton((pp.button as string) || ""); setPopupLink((pp.link as string) || ""); setPopupDelay(Number(pp.delay) || 2);
    setOpen("design");
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
  function exportTheme() {
    const blob = new Blob([JSON.stringify(currentHome(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pera-theme.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importTheme(file?: File) {
    if (!file) return;
    try {
      const text = await file.text();
      applyHome(text);
      setStatus({ kind: "ok", msg: t("common.saved") });
      setTimeout(() => setStatus({ kind: "idle" }), 1500);
    } catch {
      setStatus({ kind: "error", msg: t("common.save_fail") });
    }
  }
  async function uploadItem(secId: string, idx: number, file?: File) { if (file) patchItem(secId, idx, { image: await fileToDataUrl(file) }); }
  function patchSlide(idx: number, patch: Partial<HeroSlide>) {
    setHeroSlides((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function addSlide() {
    setHeroSlides((prev) => [...prev, { title: "", subtitle: "", overlay: "1", textColor: "light", align: "center" }]);
    setHeroSlideIdx(heroSlides.length);
  }
  function removeSlide(idx: number) {
    setHeroSlides((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
    setHeroSlideIdx((i) => Math.max(0, i - (idx <= i ? 1 : 0)));
  }
  function moveSlide(idx: number, dir: -1 | 1) {
    setHeroSlides((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
    setHeroSlideIdx((i) => i + dir);
  }
  async function uploadSlideImage(idx: number, file?: File) { if (file) patchSlide(idx, { image: await fileToDataUrl(file) }); }
  async function uploadSlideVideo(idx: number, file?: File) { if (file) patchSlide(idx, { video: await fileToDataUrl(file) }); }
  async function uploadStyleVideo(secId: string, file?: File) { if (file) patchStyle(secId, { video: await fileToDataUrl(file) }); }
  async function uploadPopup(file?: File) { if (file) setPopupImage(await fileToDataUrl(file)); }
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
      // Pull back the freshly machine-translated strings so they can be edited.
      try {
        const fresh = await api.getTemplate();
        const tr = ((fresh.store as Record<string, unknown>)?.home as Record<string, unknown>)?.translations;
        if (tr && typeof tr === "object") setTranslations(tr as Record<string, Record<string, string>>);
      } catch { /* ignore */ }
    } catch (e) {
      setStatus({ kind: "error", msg: e instanceof ApiError && e.status === 401 ? t("common.no_access") : t("common.save_fail") });
    }
  }

  async function retranslate() {
    if (typeof window !== "undefined" && !window.confirm(t("adm.retranslate_confirm"))) return;
    setStatus({ kind: "saving" });
    try {
      const next: Template = {
        ...template,
        store: { ...(template.store as Record<string, unknown>), home: { ...home0, ...currentHome(), translations: {} } },
      };
      await api.saveTemplate(next, adminPin);
      onTemplateChange(next);
      const fresh = await api.getTemplate();
      const tr = ((fresh.store as Record<string, unknown>)?.home as Record<string, unknown>)?.translations;
      setTranslations((tr as Record<string, Record<string, string>>) || {});
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

  function contentItemEditor(sec: HomeSection) {
    const items = sec.items || [];
    const ph: Record<string, { a: string; b: string }> = {
      testimonials: { a: "adm.name_ph", b: "adm.quote_ph" },
      stats: { a: "adm.stat_value", b: "adm.stat_label" },
      faq: { a: "adm.question_ph", b: "adm.answer_ph" },
      features: { a: "adm.hero_heading", b: "adm.block_text" },
    };
    const p = ph[sec.type] || { a: "adm.hero_heading", b: "adm.block_text" };
    return (
      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="space-y-2 rounded-lg bg-sand/60 p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink/60">{t("adm.item")} {idx + 1}</span>
              <button className="text-xs text-red-600 hover:underline" onClick={() => removeItem(sec.id, idx)}>{t("common.delete")}</button>
            </div>
            {sec.type === "features" && <input className="input" placeholder={t("adm.icon_ph")} value={it.button || ""} onChange={(e) => patchItem(sec.id, idx, { button: e.target.value })} />}
            <input className="input" placeholder={t(p.a)} value={it.title || ""} onChange={(e) => patchItem(sec.id, idx, { title: e.target.value })} />
            <input className="input" placeholder={t(p.b)} value={it.text || ""} onChange={(e) => patchItem(sec.id, idx, { text: e.target.value })} />
          </div>
        ))}
        <button className="btn-ghost w-full text-sm" onClick={() => addItem(sec.id)}>{t("adm.add_item")}</button>
      </div>
    );
  }

  // ---------- per-block style settings ----------
  function styleEditor(sec: HomeSection) {
    const st = sec.style || {};
    const opts = (vals: string[], prefix: string) => vals.map((v) => ({ v, l: t(prefix + v) }));
    const sel = (label: string, val: string, list: { v: string; l: string }[], on: (v: string) => void) => (
      <div>
        <label className="field-label">{label}</label>
        <select className="input" value={val} onChange={(e) => on(e.target.value)}>
          {list.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </div>
    );
    const colList = [{ v: "", l: t("adm.auto") }, ...["1", "2", "3", "4", "5", "6"].map((v) => ({ v, l: v }))];
    return (
      <details className="rounded-lg border border-line bg-sand/40 px-3 py-2">
        <summary className="cursor-pointer select-none text-xs font-semibold text-ink/60">⚙ {t("adm.block_style")}</summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {sel(t("adm.margin_top"), st.mt || "none", opts(SPACE_OPTS, "adm.sz_"), (v) => patchStyle(sec.id, { mt: v }))}
          {sel(t("adm.margin_bottom"), st.mb || "m", opts(SPACE_OPTS, "adm.sz_"), (v) => patchStyle(sec.id, { mb: v }))}
          {sel(t("adm.padding"), st.pad || "none", opts(SPACE_OPTS, "adm.sz_"), (v) => patchStyle(sec.id, { pad: v }))}
          {sel(t("adm.bg_block"), st.bg || "none", opts(["none", "soft", "accent", "dark"], "adm.bg_"), (v) => patchStyle(sec.id, { bg: v }))}
          <div>
            <label className="field-label">{t("adm.bg_custom")}</label>
            <div className="flex items-center gap-1.5">
              <input type="color" className="h-9 w-9 shrink-0 cursor-pointer rounded border border-line" value={st.bgColor || "#ffffff"} onChange={(e) => patchStyle(sec.id, { bgColor: e.target.value })} />
              {st.bgColor && <button className="text-xs text-red-600 hover:underline" onClick={() => patchStyle(sec.id, { bgColor: "" })}>✕</button>}
            </div>
          </div>
          {sel(t("adm.hero_textcolor"), st.textColor || "auto", opts(["auto", "light", "dark"], "adm.tc_"), (v) => patchStyle(sec.id, { textColor: v }))}
          {sel(t("adm.radius"), st.radius || "m", opts(["none", "s", "m", "l"], "adm.rad_"), (v) => patchStyle(sec.id, { radius: v }))}
          <div className="col-span-2">
            <label className="field-label">{t("adm.gradient")}</label>
            <div className="flex items-center gap-1.5">
              <input type="color" className="h-9 w-9 shrink-0 cursor-pointer rounded border border-line" value={st.grad1 || "#d47516"} onChange={(e) => patchStyle(sec.id, { grad1: e.target.value })} />
              <input type="color" className="h-9 w-9 shrink-0 cursor-pointer rounded border border-line" value={st.grad2 || "#1a1a1a"} onChange={(e) => patchStyle(sec.id, { grad2: e.target.value })} />
              <select className="input" value={st.gradDir || "135deg"} onChange={(e) => patchStyle(sec.id, { gradDir: e.target.value })}>
                <option value="135deg">↘</option><option value="90deg">→</option><option value="180deg">↓</option><option value="45deg">↗</option>
              </select>
              {(st.grad1 || st.grad2) && <button className="shrink-0 text-xs text-red-600 hover:underline" onClick={() => patchStyle(sec.id, { grad1: "", grad2: "" })}>✕</button>}
            </div>
          </div>
          <div className="col-span-2">
            <label className="field-label">{t("adm.block_video")}</label>
            <div className="flex items-center gap-1.5">
              <input className="input" placeholder={t("adm.hero_video_url")} value={st.video || ""} onChange={(e) => patchStyle(sec.id, { video: e.target.value })} />
              <label className="btn-ghost cursor-pointer shrink-0 text-xs">{t("adm.upload")}<input type="file" accept="video/*" className="hidden" onChange={(e) => uploadStyleVideo(sec.id, e.target.files?.[0])} /></label>
              {st.video && <button className="shrink-0 text-xs text-red-600 hover:underline" onClick={() => patchStyle(sec.id, { video: "" })}>✕</button>}
            </div>
          </div>
          <label className="col-span-2 flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5">
            <span className="text-sm font-medium">{t("adm.parallax")}</span>
            <input type="checkbox" checked={!!st.parallax} onChange={(e) => patchStyle(sec.id, { parallax: e.target.checked })} />
          </label>
          {sel(t("adm.visibility"), st.hide || "all", opts(["all", "mobile", "desktop"], "adm.vis_"), (v) => patchStyle(sec.id, { hide: v === "all" ? "" : v }))}
          {GRID_TYPES.has(sec.type) && sel(t("adm.columns"), st.cols || "", colList, (v) => patchStyle(sec.id, { cols: v }))}
          {sel(t("adm.animation"), st.anim || "none", opts(ANIM_OPTS, "adm.an_"), (v) => patchStyle(sec.id, { anim: v }))}
          {sel(t("adm.anim_speed"), st.animDur || "normal", opts(["fast", "normal", "slow"], "adm.spd_"), (v) => patchStyle(sec.id, { animDur: v }))}
          {sel(t("adm.anim_delay"), st.animDelay || "0", opts(["0", "s", "m"], "adm.dly_"), (v) => patchStyle(sec.id, { animDelay: v }))}
        </div>
        <label className="mt-2 flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5">
          <span className="text-xs font-medium">{t("adm.full_width")}</span>
          <input type="checkbox" checked={!!st.full} onChange={(e) => patchStyle(sec.id, { full: e.target.checked })} />
        </label>
        <div className="mt-2 flex gap-2">
          <button className="flex-1 rounded-lg border border-line py-1.5 text-xs font-medium hover:bg-white" onClick={() => setCopiedStyle(st)}>⧉ {t("adm.copy_style")}</button>
          <button className="flex-1 rounded-lg border border-line py-1.5 text-xs font-medium hover:bg-white disabled:opacity-40" disabled={!copiedStyle} onClick={() => copiedStyle && patchSection(sec.id, { style: { ...copiedStyle } })}>⤵ {t("adm.paste_style")}</button>
        </div>
      </details>
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
    if (s.type === "video") {
      return (
        <div className="space-y-2">
          <input className="input" placeholder={t("adm.section_heading")} value={s.title || ""} onChange={(e) => patchSection(s.id, { title: e.target.value })} />
          <input className="input" placeholder={t("adm.video_url")} value={s.link || ""} onChange={(e) => patchSection(s.id, { link: e.target.value })} />
        </div>
      );
    }
    if (s.type === "split") {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-24 overflow-hidden rounded-lg border border-line bg-sand">
              {s.image && <img src={s.image} alt="" className="h-full w-full object-cover" />}
            </div>
            <label className="btn-ghost cursor-pointer">{t("adm.upload")}<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadBlock(s.id, e.target.files?.[0])} /></label>
            {s.image && <button className="text-xs text-red-600 hover:underline" onClick={() => patchSection(s.id, { image: "" })}>{t("adm.remove_image")}</button>}
          </div>
          <input className="input" placeholder={t("adm.hero_heading")} value={s.title || ""} onChange={(e) => patchSection(s.id, { title: e.target.value })} />
          <input className="input" placeholder={t("adm.block_text")} value={s.text || ""} onChange={(e) => patchSection(s.id, { text: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder={t("adm.block_btn")} value={s.button || ""} onChange={(e) => patchSection(s.id, { button: e.target.value })} />
            <input className="input" placeholder={t("adm.block_link")} value={s.link || ""} onChange={(e) => patchSection(s.id, { link: e.target.value })} />
          </div>
          <div>
            <label className="field-label">{t("adm.image_side")}</label>
            <select className="input" value={s.size || "left"} onChange={(e) => patchSection(s.id, { size: e.target.value })}>
              <option value="left">{t("adm.side_left")}</option>
              <option value="right">{t("adm.side_right")}</option>
            </select>
          </div>
        </div>
      );
    }
    if (s.type === "cta") {
      return (
        <div className="space-y-2">
          <input className="input" placeholder={t("adm.hero_heading")} value={s.title || ""} onChange={(e) => patchSection(s.id, { title: e.target.value })} />
          <input className="input" placeholder={t("adm.block_text")} value={s.text || ""} onChange={(e) => patchSection(s.id, { text: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder={t("adm.block_btn")} value={s.button || ""} onChange={(e) => patchSection(s.id, { button: e.target.value })} />
            <input className="input" placeholder={t("adm.block_link")} value={s.link || ""} onChange={(e) => patchSection(s.id, { link: e.target.value })} />
          </div>
        </div>
      );
    }
    if (s.type === "map") {
      return (
        <div className="space-y-2">
          <input className="input" placeholder={t("adm.section_heading")} value={s.title || ""} onChange={(e) => patchSection(s.id, { title: e.target.value })} />
          <input className="input" placeholder={t("adm.map_address")} value={s.link || ""} onChange={(e) => patchSection(s.id, { link: e.target.value })} />
        </div>
      );
    }
    if (s.type === "perks") {
      const items = s.items || [];
      return (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-lg bg-sand/60 p-2">
              <input className="input !w-14 shrink-0 text-center" placeholder="🚚" value={it.button || ""} onChange={(e) => patchItem(s.id, idx, { button: e.target.value })} />
              <input className="input" placeholder={t("adm.hero_heading")} value={it.title || ""} onChange={(e) => patchItem(s.id, idx, { title: e.target.value })} />
              <button className="shrink-0 text-xs text-red-600 hover:underline" onClick={() => removeItem(s.id, idx)}>✕</button>
            </div>
          ))}
          <button className="btn-ghost w-full text-sm" onClick={() => addItem(s.id)}>{t("adm.add_item")}</button>
        </div>
      );
    }
    if (s.type === "socials") {
      const items = s.items || [];
      return (
        <div className="space-y-2">
          <input className="input" placeholder={t("adm.section_heading")} value={s.title || ""} onChange={(e) => patchSection(s.id, { title: e.target.value })} />
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-lg bg-sand/60 p-2">
              <select className="input !w-32 shrink-0" value={it.title || "instagram"} onChange={(e) => patchItem(s.id, idx, { title: e.target.value })}>
                {["instagram", "whatsapp", "telegram", "tiktok", "facebook", "youtube", "site"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input className="input" placeholder="https://..." value={it.link || ""} onChange={(e) => patchItem(s.id, idx, { link: e.target.value })} />
              <button className="shrink-0 text-xs text-red-600 hover:underline" onClick={() => removeItem(s.id, idx)}>✕</button>
            </div>
          ))}
          <button className="btn-ghost w-full text-sm" onClick={() => addItem(s.id)}>{t("adm.add_item")}</button>
        </div>
      );
    }
    if (s.type === "marquee") {
      return (
        <div className="space-y-2">
          <input className="input" placeholder={t("adm.block_text")} value={s.text || ""} onChange={(e) => patchSection(s.id, { text: e.target.value })} />
          <div>
            <label className="field-label">{t("adm.speed")}</label>
            <select className="input" value={s.size || "m"} onChange={(e) => patchSection(s.id, { size: e.target.value })}>
              <option value="s">{t("adm.h_s")}</option><option value="m">{t("adm.h_m")}</option><option value="l">{t("adm.h_l")}</option>
            </select>
          </div>
        </div>
      );
    }
    if (s.type === "countdown") {
      return (
        <div className="space-y-2">
          <input className="input" placeholder={t("adm.hero_heading")} value={s.title || ""} onChange={(e) => patchSection(s.id, { title: e.target.value })} />
          <div>
            <label className="field-label">{t("adm.date_time")}</label>
            <input type="datetime-local" className="input" value={s.date || ""} onChange={(e) => patchSection(s.id, { date: e.target.value })} />
          </div>
        </div>
      );
    }
    if (IMAGE_ITEMS.has(s.type)) {
      return (
        <div className="space-y-2">
          <input className="input" placeholder={t("adm.section_heading")} value={s.title || ""} onChange={(e) => patchSection(s.id, { title: e.target.value })} />
          {itemEditor(s)}
        </div>
      );
    }
    if (CONTENT_ITEMS.has(s.type)) {
      return (
        <div className="space-y-2">
          <input className="input" placeholder={t("adm.section_heading")} value={s.title || ""} onChange={(e) => patchSection(s.id, { title: e.target.value })} />
          {contentItemEditor(s)}
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
    { type: "split", key: "adm.add_split" },
    { type: "cta", key: "adm.add_cta" },
    { type: "video", key: "adm.add_video" },
    { type: "logos", key: "adm.add_logos" },
    { type: "socials", key: "adm.add_socials" },
    { type: "map", key: "adm.add_map" },
    { type: "marquee", key: "adm.add_marquee" },
    { type: "countdown", key: "adm.add_countdown" },
    { type: "features", key: "adm.add_features" },
    { type: "perks", key: "adm.add_perks" },
    { type: "stats", key: "adm.add_stats" },
    { type: "testimonials", key: "adm.add_testimonials" },
    { type: "faq", key: "adm.add_faq" },
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
          {/* export / import theme */}
          <div className="hidden items-center gap-1 sm:flex">
            <button className="rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:bg-sand" onClick={exportTheme} title={t("adm.export_theme")}>⤓ {t("adm.export_theme")}</button>
            <label className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:bg-sand" title={t("adm.import_theme")}>
              ⤒ {t("adm.import_theme")}
              <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => importTheme(e.target.files?.[0])} />
            </label>
          </div>
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
              <div>
                <label className="field-label">{t("adm.custom_font")}</label>
                <input className="input" placeholder="Montserrat, Lobster…" value={customFont} onChange={(e) => setCustomFont(e.target.value)} />
                <p className="mt-1 text-[11px] text-ink/40">{t("adm.custom_font_hint")}</p>
              </div>
              <div>
                <label className="field-label">{t("adm.palette")}</label>
                <div className="flex flex-wrap gap-2">
                  {PALETTES.map((p) => (
                    <button
                      key={p.name}
                      title={p.name}
                      onClick={() => { setAccent(p.accent); setBg(p.bg); }}
                      className={`h-8 w-8 rounded-full border-2 transition ${accent.toLowerCase() === p.accent ? "border-ink" : "border-white shadow"}`}
                      style={{ background: `linear-gradient(135deg, ${p.accent} 60%, ${p.bg} 60%)` }}
                    />
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-sand/60 px-3 py-2">
                <span className="text-sm font-medium">{t("adm.animations")}</span>
                <span
                  role="checkbox"
                  aria-checked={animations}
                  onClick={() => setAnimations((v) => !v)}
                  className={`relative inline-block h-5 w-9 rounded-full transition ${animations ? "bg-clay" : "bg-line"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${animations ? "left-4" : "left-0.5"}`} />
                </span>
              </label>
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
          {open === "hero" && heroEnabled && (() => {
            const idx = Math.min(heroSlideIdx, heroSlides.length - 1);
            const sl = heroSlides[idx] || {};
            const set = (p: Partial<HeroSlide>) => patchSlide(idx, p);
            return (
              <div className="space-y-3 px-1 pb-2 pt-1">
                {/* global hero settings */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="field-label">{t("adm.hero_height")}</label>
                    <select className="input" value={heroHeight} onChange={(e) => setHeroHeight(e.target.value)}>
                      <option value="s">{t("adm.h_s")}</option><option value="m">{t("adm.h_m")}</option><option value="l">{t("adm.h_l")}</option><option value="full">{t("adm.h_full")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">{t("adm.hero_autoplay")}</label>
                    <select className="input" value={heroAutoplay} onChange={(e) => setHeroAutoplay(Number(e.target.value))}>
                      <option value={0}>{t("adm.off")}</option>
                      {[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n}s</option>)}
                    </select>
                  </div>
                </div>
                <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-sand/60 px-3 py-2">
                  <span className="text-sm font-medium">{t("adm.hero_search")}</span>
                  <input type="checkbox" checked={heroSearch} onChange={(e) => setHeroSearch(e.target.checked)} />
                </label>

                {/* slide tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {heroSlides.map((_, i) => (
                    <button key={i} onClick={() => setHeroSlideIdx(i)} className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-bold transition ${i === idx ? "bg-ink text-white" : "bg-sand text-ink/60 hover:bg-line"}`}>{i + 1}</button>
                  ))}
                  <button onClick={addSlide} className="grid h-7 w-7 place-items-center rounded-lg border border-dashed border-line text-ink/50 hover:border-clay hover:text-clay" title={t("adm.add_slide")}>＋</button>
                </div>

                {/* active slide editor */}
                <div className="space-y-2 rounded-xl border border-line p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink/60">{t("adm.slide")} {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <button className="px-1 text-ink/40 hover:text-ink disabled:opacity-30" onClick={() => moveSlide(idx, -1)} disabled={idx === 0}>◀</button>
                      <button className="px-1 text-ink/40 hover:text-ink disabled:opacity-30" onClick={() => moveSlide(idx, 1)} disabled={idx === heroSlides.length - 1}>▶</button>
                      {heroSlides.length > 1 && <button className="text-xs text-red-600 hover:underline" onClick={() => removeSlide(idx)}>{t("common.delete")}</button>}
                    </div>
                  </div>
                  {/* media */}
                  <div className="flex items-center gap-2">
                    <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-line bg-sand">
                      {sl.image && <img src={sl.image} alt="" className="h-full w-full object-cover" />}
                      {sl.video && !sl.image && <div className="grid h-full w-full place-items-center text-lg text-ink/40">▶</div>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="btn-ghost cursor-pointer text-xs">{t("adm.hero_image")}<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadSlideImage(idx, e.target.files?.[0])} /></label>
                      <label className="btn-ghost cursor-pointer text-xs">{t("adm.upload_video")}<input type="file" accept="video/*" className="hidden" onChange={(e) => uploadSlideVideo(idx, e.target.files?.[0])} /></label>
                    </div>
                    {(sl.image || sl.video) && <button className="text-xs text-red-600 hover:underline" onClick={() => set({ image: "", video: "" })}>{t("adm.remove_image")}</button>}
                  </div>
                  <input className="input" placeholder={t("adm.hero_video_url")} value={sl.video || ""} onChange={(e) => set({ video: e.target.value })} />
                  <input className="input" placeholder={t("adm.hero_heading")} value={sl.title || ""} onChange={(e) => set({ title: e.target.value })} />
                  <input className="input" placeholder={t("adm.hero_sub")} value={sl.subtitle || ""} onChange={(e) => set({ subtitle: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input" placeholder={t("adm.hero_btn")} value={sl.button || ""} onChange={(e) => set({ button: e.target.value })} />
                    <input className="input" placeholder={t("adm.block_link")} value={sl.link || ""} onChange={(e) => set({ link: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input" placeholder={t("adm.hero_btn2")} value={sl.button2 || ""} onChange={(e) => set({ button2: e.target.value })} />
                    <input className="input" placeholder={t("adm.block_link")} value={sl.link2 || ""} onChange={(e) => set({ link2: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="field-label">{t("adm.text_anim")}</label>
                      <select className="input" value={sl.textAnim || "none"} onChange={(e) => set({ textAnim: e.target.value })}>
                        {["none", "fade", "up", "zoom", "left", "right"].map((v) => <option key={v} value={v}>{t("adm.an_" + v)}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col justify-end gap-1 pb-1 text-sm">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={!!sl.kenburns} onChange={(e) => set({ kenburns: e.target.checked, parallax: false })} />
                        {t("adm.kenburns")}
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={!!sl.parallax} onChange={(e) => set({ parallax: e.target.checked, kenburns: false })} />
                        {t("adm.parallax")}
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="field-label">{t("adm.hero_overlay")}</label>
                      <select className="input" value={sl.overlay || "1"} onChange={(e) => set({ overlay: e.target.value })}>
                        <option value="0">{t("adm.ov_0")}</option><option value="1">{t("adm.ov_1")}</option><option value="2">{t("adm.ov_2")}</option><option value="3">{t("adm.ov_blur")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="field-label">{t("adm.hero_textcolor")}</label>
                      <select className="input" value={sl.textColor || "light"} onChange={(e) => set({ textColor: e.target.value })}>
                        <option value="light">{t("adm.text_light")}</option><option value="dark">{t("adm.text_dark")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="field-label">{t("adm.hero_align")}</label>
                      <select className="input" value={sl.align || "center"} onChange={(e) => set({ align: e.target.value })}>
                        <option value="center">{t("se.align_center")}</option><option value="left">{t("se.align_left")}</option><option value="right">{t("adm.align_right")}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Promo popup */}
          {accHeader("popup", t("adm.popup"), (
            <span
              role="checkbox"
              aria-checked={popupEnabled}
              onClick={(e) => { e.stopPropagation(); setPopupEnabled((v) => !v); }}
              className={`relative inline-block h-4 w-7 rounded-full transition ${popupEnabled ? "bg-clay" : "bg-line"}`}
            >
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${popupEnabled ? "left-3.5" : "left-0.5"}`} />
            </span>
          ))}
          {open === "popup" && popupEnabled && (
            <div className="space-y-3 px-1 pb-2 pt-1">
              <div>
                <label className="field-label">{t("adm.hero_image")}</label>
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-24 overflow-hidden rounded-lg border border-line bg-sand">
                    {popupImage && <img src={popupImage} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <label className="btn-ghost cursor-pointer">{t("adm.upload")}<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPopup(e.target.files?.[0])} /></label>
                  {popupImage && <button className="text-xs text-red-600 hover:underline" onClick={() => setPopupImage("")}>{t("adm.remove_image")}</button>}
                </div>
              </div>
              <input className="input" placeholder={t("adm.hero_heading")} value={popupTitle} onChange={(e) => setPopupTitle(e.target.value)} />
              <input className="input" placeholder={t("adm.block_text")} value={popupText} onChange={(e) => setPopupText(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder={t("adm.block_btn")} value={popupButton} onChange={(e) => setPopupButton(e.target.value)} />
                <input className="input" placeholder={t("adm.block_link")} value={popupLink} onChange={(e) => setPopupLink(e.target.value)} />
              </div>
              <div>
                <label className="field-label">{t("adm.popup_delay")}</label>
                <input type="number" min={0} max={60} className="input" value={popupDelay} onChange={(e) => setPopupDelay(Number(e.target.value))} />
              </div>
            </div>
          )}

          {/* Page templates */}
          {accHeader("presets", t("adm.page_templates"))}
          {open === "presets" && (
            <div className="space-y-2 px-1 pb-2 pt-1">
              <p className="text-xs text-ink/40">{t("adm.tpl_hint")}</p>
              <div className="grid grid-cols-2 gap-2.5">
                {PAGE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className="group overflow-hidden rounded-xl border border-line bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-clay hover:shadow-md"
                  >
                    <TemplateThumb tpl={tpl} photos={demoPhotos} />
                    <div className="flex items-center justify-between px-2.5 py-1.5">
                      <span className="text-xs font-semibold">{tpl.name}</span>
                      <span className="text-[10px] text-clay opacity-0 transition group-hover:opacity-100">{t("adm.apply")} →</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual translations */}
          {accHeader("i18n", t("adm.translations"))}
          {open === "i18n" && (
            <div className="space-y-2 px-1 pb-2 pt-1">
              <p className="text-xs text-ink/40">{t("adm.tr_hint")}</p>
              <button className="btn-ghost w-full text-sm" onClick={retranslate} disabled={status.kind === "saving"}>↻ {t("adm.retranslate")}</button>
              {Object.keys(translations).length === 0 ? (
                <p className="rounded-lg bg-sand/60 px-3 py-2 text-xs text-ink/50">{t("adm.tr_empty")}</p>
              ) : (
                <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                  {Object.keys(translations).map((src) => (
                    <div key={src} className="rounded-xl border border-line p-2.5">
                      <div className="mb-1.5 truncate text-xs font-semibold text-ink/70" title={src}>{src}</div>
                      <div className="space-y-1.5">
                        {(["en", "tr", "ar"] as const).map((lng) => (
                          <div key={lng} className="flex items-center gap-2">
                            <span className="w-7 shrink-0 text-[11px] font-bold uppercase text-ink/40">{lng}</span>
                            <input
                              className="input !py-2"
                              dir={lng === "ar" ? "rtl" : "ltr"}
                              value={(translations[src] && translations[src][lng]) || ""}
                              onChange={(e) => setTranslations((prev) => ({ ...prev, [src]: { ...(prev[src] || {}), [lng]: e.target.value } }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                      {s.type !== "spacer" && styleEditor(s)}
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
