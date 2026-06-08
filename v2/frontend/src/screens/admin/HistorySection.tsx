import { useCallback, useEffect, useState } from "react";
import type { HistoryRecord } from "../../api/types";
import { api, ApiError } from "../../api/client";
import { CollageViewer } from "../../components/CollageViewer";
import { VariationsModal } from "../../components/VariationsModal";
import { Thumb } from "../../components/Thumb";

interface Props {
  adminPin: string;
}

const RANGES = [
  { id: "all", label: "Всё время" },
  { id: "today", label: "Сегодня" },
  { id: "7", label: "7 дней" },
  { id: "30", label: "30 дней" },
];

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface ProductGroup {
  key: string;
  code: string;
  brandName: string;
  cover: HistoryRecord;
  records: HistoryRecord[];
}

/** Same product code within the same brand = one product (the rest are variations). */
function groupRecords(records: HistoryRecord[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>();
  const order: string[] = [];
  let solo = 0;
  for (const r of records) {
    const code = (r.productCode || "").trim();
    const key = code ? `${r.brandSlug || ""}|${code.toLowerCase()}` : `__solo__${solo++}`;
    let g = map.get(key);
    if (!g) {
      g = { key, code: r.productCode || "—", brandName: r.brandName || "", cover: r, records: [] };
      map.set(key, g);
      order.push(key);
    }
    g.records.push(r);
  }
  return order.map((k) => map.get(k) as ProductGroup);
}

export function HistorySection({ adminPin }: Props) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState("newest");

  const [lightbox, setLightbox] = useState<HistoryRecord | null>(null);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState<string | null>(null);
  const [variantsGroup, setVariantsGroup] = useState<ProductGroup | null>(null);

  async function setGroupPublished(group: ProductGroup, published: boolean) {
    setPublishing(group.key);
    try {
      let ids: string[] = [...publishedIds];
      for (const r of group.records) {
        ids = await api.publishToStore({ id: r.id, brandSlug: r.brandSlug, userId: r.userId }, published, adminPin);
      }
      setPublishedIds(new Set(ids));
    } catch {
      setError("Не удалось изменить публикацию");
    } finally {
      setPublishing(null);
    }
  }

  useEffect(() => {
    api
      .getPublishedIds(adminPin)
      .then((ids) => setPublishedIds(new Set(ids)))
      .catch(() => {});
  }, [adminPin]);

  async function togglePublish(record: HistoryRecord) {
    const next = !publishedIds.has(record.id);
    setPublishing(record.id);
    try {
      const ids = await api.publishToStore(
        { id: record.id, brandSlug: record.brandSlug, userId: record.userId },
        next,
        adminPin,
      );
      setPublishedIds(new Set(ids));
    } catch {
      setError("Не удалось изменить публикацию");
    } finally {
      setPublishing(null);
    }
  }

  const fetchPage = useCallback(
    async (targetPage: number, append: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listCollages({ search, range, sort, page: targetPage, limit: 24 });
        setTotal(res.total);
        setHasMore(res.hasMore);
        setPage(res.page);
        setRecords((prev) => (append ? [...prev, ...res.records] : res.records));
      } catch {
        setError("Не удалось загрузить историю");
      } finally {
        setLoading(false);
      }
    },
    [search, range, sort],
  );

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  async function remove(record: HistoryRecord) {
    if (!window.confirm(`Удалить коллаж ${record.productCode ?? ""}?`)) return;
    try {
      await api.deleteCollages(
        [{ id: record.id, brandSlug: record.brandSlug, userId: record.userId }],
        adminPin,
      );
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 401 ? "Нет доступа" : "Не удалось удалить";
      setError(msg);
    }
  }

  const groups = groupRecords(records);
  const hasVariations = groups.some((g) => g.records.length > 1);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl">История</h1>
        <p className="text-sm text-ink/50">
          Товаров: {groups.length}
          <span className="text-ink/35"> · коллажей: {total}</span>
          {hasVariations && <span className="ml-2 text-ink/35">(одинаковый код = варианты одного товара)</span>}
        </p>
      </div>

      <div className="card space-y-3 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
          className="flex gap-2"
        >
          <input
            className="input"
            placeholder="Поиск по коду, бренду, сотруднику…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0">
            Найти
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                range === r.id ? "border-ink bg-ink text-white" : "border-line text-ink/60 hover:border-ink/40"
              }`}
            >
              {r.label}
            </button>
          ))}
          <select className="input ml-auto w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {records.length === 0 && !loading ? (
        <div className="card grid min-h-[200px] place-items-center p-10 text-center text-ink/40">
          Ничего не найдено
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {groups.map((g) => {
            const multi = g.records.length > 1;
            const pubCount = g.records.filter((r) => publishedIds.has(r.id)).length;
            const allPub = pubCount === g.records.length;
            const somePub = pubCount > 0;
            const busy = publishing === g.key;
            return (
              <div key={g.key} className="card group overflow-hidden p-0">
                <button
                  className="relative block aspect-[3/4] w-full overflow-hidden bg-sand"
                  onClick={() => setLightbox(g.cover)}
                >
                  {g.cover.imagePath ? (
                    <Thumb
                      src={g.cover.imagePath}
                      w={400}
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-ink/30">нет фото</div>
                  )}
                  {multi && (
                    <span className="absolute right-2 top-2 rounded-full bg-ink/85 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {g.records.length} вар.
                    </span>
                  )}
                </button>
                <div className="p-3">
                  <div className="truncate text-sm font-semibold">{g.code}</div>
                  <div className="truncate text-xs text-ink/50">{g.brandName}</div>
                  <button
                    className={`mt-2 w-full rounded-lg border py-1.5 text-xs font-semibold transition ${
                      allPub
                        ? "border-green-600 bg-green-50 text-green-700"
                        : somePub
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-line text-ink/60 hover:border-clay/50 hover:text-clay"
                    } ${busy ? "opacity-50" : ""}`}
                    onClick={() => setGroupPublished(g, !allPub)}
                    disabled={busy}
                  >
                    {allPub
                      ? `✓ В витрине${multi ? ` (${g.records.length})` : ""}`
                      : somePub
                      ? `± В витрине (${pubCount}/${g.records.length})`
                      : `+ В витрину${multi ? ` (${g.records.length})` : ""}`}
                  </button>

                  {multi && (
                    <button
                      className="mt-1 w-full rounded-lg border border-line py-1 text-[11px] font-medium text-ink/55 hover:border-ink/40"
                      onClick={() => setVariantsGroup(g)}
                    >
                      Варианты ({g.records.length})
                    </button>
                  )}

                  <div className="mt-1 flex items-center justify-between text-[11px] text-ink/40">
                    <span className="truncate">{formatDate(g.cover.createdAt)}</span>
                    {!multi && (
                      <button
                        className="shrink-0 font-medium text-red-600 hover:underline"
                        onClick={() => remove(g.cover)}
                      >
                        удалить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button className="btn-ghost" onClick={() => fetchPage(page + 1, true)} disabled={loading}>
            {loading ? "Загрузка…" : "Загрузить ещё"}
          </button>
        </div>
      )}

      {variantsGroup && (
        <VariationsModal
          code={variantsGroup.code}
          brandName={variantsGroup.brandName}
          records={variantsGroup.records}
          onClose={() => setVariantsGroup(null)}
          onOpen={(r) => setLightbox(r)}
          renderActions={(r) => (
            <>
              <button
                className={`rounded border px-2 py-0.5 text-[11px] font-semibold transition ${
                  publishedIds.has(r.id)
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-line text-ink/55 hover:border-clay/50 hover:text-clay"
                } ${publishing === r.id ? "opacity-50" : ""}`}
                onClick={() => togglePublish(r)}
                disabled={publishing === r.id}
                title={publishedIds.has(r.id) ? "Убрать из витрины" : "В витрину"}
              >
                {publishedIds.has(r.id) ? "✓ в витрине" : "+ в витрину"}
              </button>
              <button
                className="shrink-0 text-[11px] font-medium text-red-600 hover:underline"
                onClick={() => remove(r)}
                title="Удалить"
              >
                ✕
              </button>
            </>
          )}
        />
      )}

      {lightbox && <CollageViewer record={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
