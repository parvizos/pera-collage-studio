import { useCallback, useEffect, useState } from "react";
import type { HistoryRecord } from "../api/types";
import { api } from "../api/client";
import { CollageViewer } from "../components/CollageViewer";
import { VariationsModal } from "../components/VariationsModal";
import { Thumb } from "../components/Thumb";
import { useI18n } from "../i18n";

interface Props {
  userId: string;
  onReopen: (record: HistoryRecord) => void;
}

const RANGES = [
  { id: "all", key: "hist.range_all" },
  { id: "today", key: "hist.range_today" },
  { id: "7", key: "hist.range_7" },
  { id: "30", key: "hist.range_30" },
];

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ProductGroup {
  key: string;
  code: string;
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
      g = { key, code: r.productCode || "—", cover: r, records: [] };
      map.set(key, g);
      order.push(key);
    }
    g.records.push(r);
  }
  return order.map((k) => map.get(k) as ProductGroup);
}

export function EmployeeHistory({ userId, onReopen }: Props) {
  const { t } = useI18n();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");

  const [lightbox, setLightbox] = useState<HistoryRecord | null>(null);
  const [opening, setOpening] = useState(false);
  const [variantsGroup, setVariantsGroup] = useState<ProductGroup | null>(null);

  const fetchPage = useCallback(
    async (targetPage: number, append: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listCollages({ userId, search, range, sort: "newest", page: targetPage, limit: 18 });
        setTotal(res.total);
        setHasMore(res.hasMore);
        setPage(res.page);
        setRecords((prev) => (append ? [...prev, ...res.records] : res.records));
      } catch {
        setError(t("hist.load_fail"));
      } finally {
        setLoading(false);
      }
    },
    [userId, search, range],
  );

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  async function reopen(record: HistoryRecord) {
    setOpening(true);
    try {
      const detail = await api.getCollage(record.id, { brandSlug: record.brandSlug, userId });
      onReopen(detail);
    } catch {
      setError(t("hist.open_fail"));
    } finally {
      setOpening(false);
    }
  }

  const groups = groupRecords(records);

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6">
      <div>
        <h1 className="font-serif text-2xl">{t("hist.my")}</h1>
        <p className="text-sm text-ink/50">
          {t("hist.products", { n: groups.length })}
          <span className="text-ink/35"> · {t("hist.collages", { n: total })}</span>
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
            placeholder={t("hist.search_ph")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0">
            {t("hist.search_btn")}
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                range === r.id ? "border-ink bg-ink text-white" : "border-line text-ink/60 hover:border-ink/40"
              }`}
            >
              {t(r.key)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {records.length === 0 && !loading ? (
        <div className="card grid min-h-[200px] place-items-center p-10 text-center text-ink/40">
          {t("hist.empty")}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {groups.map((g) => {
            const multi = g.records.length > 1;
            return (
              <div key={g.key} className="card overflow-hidden p-0">
                <button
                  className="relative block aspect-[3/4] w-full overflow-hidden bg-sand"
                  onClick={() => setLightbox(g.cover)}
                >
                  {g.cover.imagePath ? (
                    <Thumb src={g.cover.imagePath} w={400} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-ink/30">{t("store.no_photo")}</div>
                  )}
                  {multi && (
                    <span className="absolute right-2 top-2 rounded-full bg-ink/85 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {t("hist.var_badge", { n: g.records.length })}
                    </span>
                  )}
                </button>
                <div className="p-3">
                  <div className="truncate text-sm font-semibold">{g.code}</div>
                  <div className="text-[11px] text-ink/40">{formatDate(g.cover.createdAt)}</div>

                  {multi ? (
                    <button
                      className="mt-2 w-full rounded-lg border border-line py-1 text-xs font-semibold text-ink/70 hover:border-ink/40"
                      onClick={() => setVariantsGroup(g)}
                    >
                      {t("hist.variants", { n: g.records.length })}
                    </button>
                  ) : (
                    <button
                      className="mt-2 w-full rounded-lg border border-line py-1 text-xs font-semibold text-ink/70 hover:border-ink/40"
                      onClick={() => reopen(g.cover)}
                      disabled={opening}
                    >
                      {t("hist.open_editor")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button className="btn-ghost" onClick={() => fetchPage(page + 1, true)} disabled={loading}>
            {loading ? t("common.loading") : t("hist.load_more")}
          </button>
        </div>
      )}

      {variantsGroup && (
        <VariationsModal
          code={variantsGroup.code}
          records={variantsGroup.records}
          onClose={() => setVariantsGroup(null)}
          onOpen={(r) => {
            setVariantsGroup(null);
            reopen(r);
          }}
        />
      )}

      {lightbox && (
        <CollageViewer
          record={lightbox}
          userId={userId}
          onClose={() => setLightbox(null)}
          actions={
            <button
              className="btn-primary"
              disabled={opening}
              onClick={() => {
                const rec = lightbox;
                setLightbox(null);
                reopen(rec);
              }}
            >
              {t("hist.open_editor")}
            </button>
          }
        />
      )}
    </main>
  );
}
