import { useEffect, useMemo, useState } from "react";
import type { Template } from "../api/types";
import { api, type StoreProduct, type StoreVariation } from "../api/client";
import { Thumb } from "../components/Thumb";

interface Props {
  template: Template;
}

const WHATSAPP = "905339178551"; // +90 533 917 85 51
const CART_KEY = "pera_cart";

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

function piecesLabel(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} штука`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} штуки`;
  return `${n} штук`;
}

/** Форматирует число как цену, сохраняя символ валюты из образца ("$50" → "$200"). */
function formatMoneyLike(num: number, sample: string): string {
  const prefix = (sample.match(/^[^\d]*/) || [""])[0];
  const suffix = (sample.match(/[^\d]*$/) || [""])[0];
  const v = Number.isInteger(num) ? String(num) : String(Math.round(num * 100) / 100);
  return `${prefix}${v}${suffix}`;
}

/** Цена серии = цена за штуку × количество штук. */
function seriesTotal(unitPrice: string | undefined, count: number): string {
  const num = parsePrice(unitPrice);
  if (!num) return unitPrice || "";
  return formatMoneyLike(num * count, unitPrice as string);
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

function colorsLabel(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} цвет`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} цвета`;
  return `${n} цветов`;
}

function productSlugFromPath(): string | null {
  const m = window.location.pathname.match(/^\/product\/(.+)$/);
  return m ? decodeURIComponent(m[1].replace(/\/$/, "")) : null;
}

export function Store({ template }: Props) {
  const store = template.store as Record<string, unknown>;
  const title = (store.title as string) || "PERA";
  const subtitle = (store.subtitle as string) || "ISTANBUL";
  const logo = store.logo as string | null;
  const whatsapp = ((store.whatsapp as string) || WHATSAPP).replace(/[^\d]/g, "");
  const instagram = (store.instagram as string) || "peraistanbulstore";
  const currency = (store.currency as string) || "₺";

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [sort, setSort] = useState<"new" | "cheap" | "expensive">("new");

  const [quick, setQuick] = useState<StoreProduct | null>(null);
  const [variationIdx, setVariationIdx] = useState(0);
  const [quickPhoto, setQuickPhoto] = useState(0);

  const [cart, setCart] = useState<CartItem[]>(() => loadCart());
  const [cartPage, setCartPage] = useState(false);
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
    const price = seriesTotal(v.price, count);
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
          unit: v.price,
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
      .catch(() => setError("Не удалось загрузить товары"))
      .finally(() => setLoading(false));
  }, []);

  // Initial route from the URL (cart deep link / refresh).
  useEffect(() => {
    if (window.location.pathname === "/cart") setCartPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open the product page when the URL points at one (deep link / refresh).
  useEffect(() => {
    const slug = productSlugFromPath();
    if (!slug || quick || !products.length) return;
    const found = products.find((p) => p.slug === slug);
    if (found) showProduct(found, false);
    else api.getStoreProduct(slug).then((p) => p && showProduct(p, false)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Back / forward buttons.
  useEffect(() => {
    const onPop = () => {
      if (window.location.pathname === "/cart") {
        setQuick(null);
        setCartPage(true);
        return;
      }
      setCartPage(false);
      const slug = productSlugFromPath();
      if (!slug) {
        setQuick(null);
        return;
      }
      const found = products.find((p) => p.slug === slug);
      if (found) showProduct(found, false);
      else api.getStoreProduct(slug).then((p) => p && showProduct(p, false)).catch(() => {});
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const categories = useMemo(() => collect(products, (p) => [p.category]), [products]);
  const colors = useMemo(() => collect(products, (p) => p.colors || []), [products]);
  const sizes = useMemo(() => collect(products, (p) => p.sizes || []), [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (category && p.category !== category) return false;
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
  }, [products, search, category, color, size, sort]);

  function applyVariation(_p: StoreProduct, i: number) {
    setVariationIdx(i);
    setQuickPhoto(0);
  }

  function showProduct(p: StoreProduct, push: boolean) {
    setCartPage(false);
    setQuick(p);
    applyVariation(p, 0);
    if (push) window.history.pushState({}, "", `/product/${p.slug}`);
    window.scrollTo({ top: 0 });
  }

  function openProduct(p: StoreProduct) {
    showProduct(p, true);
  }

  function backToCatalog(push = true) {
    setQuick(null);
    setCartPage(false);
    if (push) window.history.pushState({}, "", "/");
    window.scrollTo({ top: 0 });
  }

  function goCart() {
    setQuick(null);
    setCartPage(true);
    window.history.pushState({}, "", "/cart");
    window.scrollTo({ top: 0 });
  }

  function cartWhatsappLink(): string {
    const lines = cart.map((i, n) => {
      const series = i.count > 1 ? ` (серия ${i.count} шт)` : "";
      return `${n + 1}) ${i.code}${i.color ? `, ${i.color}` : ""}${i.size ? `, ${i.size}` : ""}${series} ×${i.qty}${
        i.price ? ` — ${i.price}` : ""
      }`;
    });
    const total = cartTotal > 0 ? `\n\nИтого: ${cartTotal.toLocaleString("ru-RU")} ${currency}` : "";
    const text = `Здравствуйте! Хочу заказать:\n${lines.join("\n")}${total}`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
  }

  function whatsappLink(p: StoreProduct, v: StoreVariation): string {
    const count = seriesCount(v.size);
    const series = seriesTotal(v.price, count);
    const sizePart = v.size ? `, размер ${v.size}${count > 1 ? ` (серия ${count} шт)` : ""}` : "";
    const text = `Здравствуйте! Хочу заказать: ${p.code}${v.color ? `, цвет ${v.color}` : ""}${sizePart} — ${series}`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="min-h-screen bg-sand">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="/" className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt={title} className="h-9 w-auto" />
            ) : (
              <div className="leading-none">
                <div className="font-serif text-2xl tracking-tight">{title}</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-ink/50">{subtitle}</div>
              </div>
            )}
          </a>
          <nav className="flex items-center gap-3 text-sm text-ink/60">
            <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer" className="hidden hover:text-ink sm:block">
              Instagram
            </a>
            <a href="/staff" className="hidden rounded-full border border-line px-3 py-1.5 font-medium hover:border-ink/40 sm:block">
              Сотрудникам
            </a>
            <button
              className="relative flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 font-semibold text-white"
              onClick={() => goCart()}
            >
              🛒 Корзина
              {cartCount > 0 && (
                <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-clay px-1 text-xs">
                  {cartCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {cartPage ? (
        <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          <button
            onClick={() => backToCatalog()}
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink/60 hover:text-ink"
          >
            ← Продолжить покупки
          </button>
          <h1 className="mb-5 font-serif text-3xl">Корзина</h1>

          {cart.length === 0 ? (
            <div className="card grid min-h-[220px] place-items-center gap-3 text-center text-ink/50">
              <div>Корзина пуста</div>
              <button className="btn-primary" onClick={() => backToCatalog()}>
                Перейти в каталог
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
                          {item.unit} × {item.count} шт = {item.price}
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
                      title="Убрать"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-line bg-white p-4">
                <div className="mb-3 flex items-center justify-between text-lg font-semibold">
                  <span>Итого</span>
                  <span>{cartTotal > 0 ? `${cartTotal.toLocaleString("ru-RU")} ${currency}` : "—"}</span>
                </div>
                <a
                  href={cartWhatsappLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-3.5 text-center font-semibold text-white"
                >
                  Оформить заказ в WhatsApp
                </a>
                <p className="mt-3 text-center text-xs text-ink/45">
                  Мы проверим наличие товаров и подтвердим заказ в WhatsApp.
                </p>
              </div>
            </>
          )}
        </main>
      ) : quick ? (() => {
        const variation = quick.variations[variationIdx] ?? quick.variations[0];
        const gallery = [...variation.photos, variation.collageImage].filter(Boolean) as string[];
        const count = seriesCount(variation.size);
        const series = seriesTotal(variation.price, count);
        return (
          <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
            <button
              onClick={() => backToCatalog()}
              className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink/60 hover:text-ink"
            >
              ← Назад в каталог
            </button>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Photos */}
              <div>
                <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-white shadow-sm">
                  {(() => {
                    const src = gallery[quickPhoto] || gallery[0];
                    return src ? (
                      <img src={src} alt={quick.code} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-ink/30">нет фото</div>
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
                  {quick.category && <Row label="Категория" value={quick.category} />}
                  {variation.color && <Row label="Цвет" value={variation.color} />}
                  {variation.size && (
                    <Row label="Серия (размеры)" value={count > 1 ? `${variation.size} — ${piecesLabel(count)}` : variation.size} />
                  )}
                </dl>
                {variation.price && (
                  <div className="mt-4">
                    <div className="font-serif text-3xl">
                      {variation.price}
                      <span className="ml-1 align-middle font-sans text-sm text-ink/40">/шт</span>
                    </div>
                    {count > 1 && (
                      <div className="mt-1 text-base font-semibold text-ink/80">
                        Серия {count} шт = {series}
                      </div>
                    )}
                  </div>
                )}

                {quick.variations.length > 1 && (
                  <div className="mt-5">
                    <div className="field-label">Варианты ({quick.variations.length})</div>
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
                            {v.color || `Вариант ${i + 1}`}
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
                    В корзину (серия)
                  </button>
                  <a
                    href={whatsappLink(quick, variation)}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-full bg-[#25D366] py-3 text-center font-semibold text-white"
                  >
                    Заказать в WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </main>
        );
      })() : (
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Filters */}
        <div className="mb-6 space-y-3">
          <input
            className="input"
            placeholder="Поиск: код, категория, цвет…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={!category} onClick={() => setCategory("")}>Все</Chip>
            {categories.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? "" : c)}>
                {c}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {colors.length > 0 && (
              <select className="input w-auto" value={color} onChange={(e) => setColor(e.target.value)}>
                <option value="">Цвет: любой</option>
                {colors.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            {sizes.length > 0 && (
              <select className="input w-auto" value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="">Размер: любой</option>
                {sizes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            <select className="input ml-auto w-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="new">Сначала новые</option>
              <option value="cheap">Сначала дешевле</option>
              <option value="expensive">Сначала дороже</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <p className="py-20 text-center text-ink/40">Загрузка…</p>
        ) : error ? (
          <p className="py-20 text-center text-red-600">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="grid min-h-[40vh] place-items-center rounded-2xl border border-dashed border-line bg-white/50 text-center text-ink/40">
            {products.length === 0 ? "Товары скоро появятся" : "Ничего не найдено"}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => openProduct(p)}
                className="group overflow-hidden rounded-xl bg-white text-left shadow-sm transition hover:shadow-md"
              >
                <div className="aspect-[3/4] overflow-hidden bg-sand">
                  {p.photos[0] || p.collageImage ? (
                    <Thumb
                      src={p.photos[0] || p.collageImage}
                      w={500}
                      alt={p.code}
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-ink/30">нет фото</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-semibold">{p.code}</div>
                  <div className="truncate text-xs text-ink/45">
                    {[p.category, p.colors.length > 1 ? colorsLabel(p.colors.length) : p.colors[0]]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {(() => {
                    const vs = p.variations.filter((v) => parsePrice(v.price) > 0);
                    if (!vs.length) return null;
                    const cheapest = vs.reduce((a, b) => (parsePrice(a.price) <= parsePrice(b.price) ? a : b));
                    const unitVaries = vs.some((v) => parsePrice(v.price) !== parsePrice(cheapest.price));
                    const cnt = seriesCount(cheapest.size);
                    return (
                      <>
                        <div className="mt-1 font-serif text-lg">
                          {unitVaries ? `от ${cheapest.price}` : cheapest.price}
                        </div>
                        {cnt > 1 && (
                          <div className="text-[11px] text-ink/45">
                            × {cnt} шт = {seriesTotal(cheapest.price, cnt)}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
      )}

      <footer className="border-t border-line py-8 text-center text-sm text-ink/40">
        © {new Date().getFullYear()} {title} {subtitle}
      </footer>

      {/* Added toast */}
      {added && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white shadow-lg">
            Добавлено в корзину ✓
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

