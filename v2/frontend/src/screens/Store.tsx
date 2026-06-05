import { useEffect, useMemo, useState } from "react";
import type { Template } from "../api/types";
import { api, type StoreProduct } from "../api/client";

interface Props {
  template: Template;
}

const WHATSAPP = "905339178551"; // +90 533 917 85 51

function parsePrice(p?: string): number {
  if (!p) return 0;
  const n = parseFloat(p.replace(/[^\d.,]/g, "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

function uniqueValues(items: StoreProduct[], key: "category" | "color" | "size"): string[] {
  const seen: string[] = [];
  for (const it of items) {
    const v = (it[key] || "").trim();
    if (v && !seen.includes(v)) seen.push(v);
  }
  return seen;
}

export function Store({ template }: Props) {
  const store = template.store as Record<string, unknown>;
  const title = (store.title as string) || "PERA";
  const subtitle = (store.subtitle as string) || "ISTANBUL";
  const logo = store.logo as string | null;

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [sort, setSort] = useState<"new" | "cheap" | "expensive">("new");

  const [quick, setQuick] = useState<StoreProduct | null>(null);
  const [quickPhoto, setQuickPhoto] = useState(0);

  useEffect(() => {
    api
      .getStoreProducts({})
      .then((d) => setProducts(d.products))
      .catch(() => setError("Не удалось загрузить товары"))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => uniqueValues(products, "category"), [products]);
  const colors = useMemo(() => uniqueValues(products, "color"), [products]);
  const sizes = useMemo(() => uniqueValues(products, "size"), [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (category && p.category !== category) return false;
      if (color && p.color !== color) return false;
      if (size && p.size !== size) return false;
      if (q) {
        const hay = `${p.code} ${p.name} ${p.category} ${p.color} ${p.brandName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort === "cheap") list = [...list].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    else if (sort === "expensive") list = [...list].sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    return list;
  }, [products, search, category, color, size, sort]);

  function openQuick(p: StoreProduct) {
    setQuick(p);
    setQuickPhoto(0);
  }

  function whatsappLink(p: StoreProduct): string {
    const text = `Здравствуйте! Хочу заказать: ${p.code}${p.color ? `, цвет ${p.color}` : ""}${
      p.size ? `, размер ${p.size}` : ""
    } — ${p.price}`;
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
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
            <a href={`https://instagram.com/peraistanbulstore`} target="_blank" rel="noreferrer" className="hover:text-ink">
              Instagram
            </a>
            <a href="/staff" className="hidden rounded-full border border-line px-3 py-1.5 font-medium hover:border-ink/40 sm:block">
              Сотрудникам
            </a>
          </nav>
        </div>
      </header>

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
                onClick={() => openQuick(p)}
                className="group overflow-hidden rounded-xl bg-white text-left shadow-sm transition hover:shadow-md"
              >
                <div className="aspect-[3/4] overflow-hidden bg-sand">
                  {p.photos[0] || p.collageImage ? (
                    <img
                      src={p.photos[0] || p.collageImage}
                      alt={p.code}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-ink/30">нет фото</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-semibold">{p.code}</div>
                  <div className="truncate text-xs text-ink/45">
                    {[p.category, p.color, p.size].filter(Boolean).join(" · ")}
                  </div>
                  {p.price && <div className="mt-1 font-serif text-lg">{p.price}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-ink/40">
        © {new Date().getFullYear()} {title} {subtitle}
      </footer>

      {/* Quick view */}
      {quick && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/70 backdrop-blur-sm sm:items-center" onClick={() => setQuick(null)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-t-2xl bg-white sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="grid sm:grid-cols-2">
              {/* Photos */}
              <div className="bg-sand p-3">
                <div className="aspect-[3/4] overflow-hidden rounded-lg bg-white">
                  {(() => {
                    const all = [...quick.photos, quick.collageImage].filter(Boolean) as string[];
                    const src = all[quickPhoto] || all[0];
                    return src ? <img src={src} alt={quick.code} className="h-full w-full object-cover" /> : null;
                  })()}
                </div>
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {[...quick.photos, quick.collageImage].filter(Boolean).map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setQuickPhoto(i)}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded border-2 ${i === quickPhoto ? "border-clay" : "border-transparent"}`}
                    >
                      <img src={src as string} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              {/* Info */}
              <div className="flex flex-col p-5">
                <div className="font-serif text-2xl">{quick.code}</div>
                {quick.brandName && <div className="text-sm text-ink/50">{quick.brandName}</div>}
                <dl className="mt-4 space-y-1 text-sm">
                  {quick.category && <Row label="Категория" value={quick.category} />}
                  {quick.color && <Row label="Цвет" value={quick.color} />}
                  {quick.size && <Row label="Размер" value={quick.size} />}
                </dl>
                {quick.price && <div className="mt-4 font-serif text-3xl">{quick.price}</div>}
                <div className="mt-auto space-y-2 pt-5">
                  <a
                    href={whatsappLink(quick)}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-full bg-[#25D366] py-3 text-center font-semibold text-white"
                  >
                    Заказать в WhatsApp
                  </a>
                  <button className="btn-ghost w-full" onClick={() => setQuick(null)}>
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
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
