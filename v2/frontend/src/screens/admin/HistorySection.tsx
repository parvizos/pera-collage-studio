import { useCallback, useEffect, useState } from "react";
import type { HistoryRecord } from "../../api/types";
import { api, ApiError } from "../../api/client";
import { CollageViewer } from "../../components/CollageViewer";

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl">История</h1>
        <p className="text-sm text-ink/50">Всего коллажей: {total}</p>
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
          {records.map((r) => (
            <div key={r.id} className="card group overflow-hidden p-0">
              <button
                className="block aspect-[3/4] w-full overflow-hidden bg-sand"
                onClick={() => setLightbox(r)}
              >
                {r.imagePath ? (
                  <img
                    src={r.imagePath}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-ink/30">нет фото</div>
                )}
              </button>
              <div className="p-3">
                <div className="truncate text-sm font-semibold">{r.productCode || "—"}</div>
                <div className="truncate text-xs text-ink/50">{r.brandName}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-ink/40">
                  <span className="truncate">{formatDate(r.createdAt)}</span>
                  <button
                    className="shrink-0 font-medium text-red-600 hover:underline"
                    onClick={() => remove(r)}
                  >
                    удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button className="btn-ghost" onClick={() => fetchPage(page + 1, true)} disabled={loading}>
            {loading ? "Загрузка…" : "Загрузить ещё"}
          </button>
        </div>
      )}

      {lightbox && <CollageViewer record={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
