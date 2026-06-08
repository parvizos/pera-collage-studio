import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { HistoryRecord } from "../api/types";
import { api } from "../api/client";
import { downloadFile } from "../lib/download";
import { useI18n } from "../i18n";

interface Props {
  record: HistoryRecord;
  userId?: string;
  onClose: () => void;
  /** Extra action buttons shown in the footer (e.g. "Открыть в редакторе"). */
  actions?: ReactNode;
}

interface ViewerImage {
  key: string;
  label: string;
  src: string;
  name: string;
}

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

export function CollageViewer({ record, userId, onClose, actions }: Props) {
  const { t } = useI18n();
  const [detail, setDetail] = useState<HistoryRecord | null>(null);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);

  const code = record.productCode || "collage";

  useEffect(() => {
    let cancelled = false;
    api
      .getCollage(record.id, { brandSlug: record.brandSlug, userId: userId ?? record.userId })
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [record.id, record.brandSlug, record.userId, userId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const images = useMemo<ViewerImage[]>(() => {
    const list: ViewerImage[] = [];
    const collageSrc = detail?.imagePath || record.imagePath;
    if (collageSrc) list.push({ key: "collage", label: t("adm.vw_collage"), src: collageSrc, name: `${code}.png` });
    for (const p of detail?.originalPhotos ?? []) {
      list.push({
        key: `o${p.index}`,
        label: t("adm.vw_source", { n: p.index + 1 }),
        src: p.imagePath,
        name: `${code}_src-${p.index + 1}.png`,
      });
    }
    return list;
  }, [detail, record.imagePath, code, t]);

  const current = images[active] ?? images[0];

  async function downloadAll() {
    setBusy(true);
    try {
      for (const img of images) {
        // eslint-disable-next-line no-await-in-loop
        await downloadFile(img.src, img.name);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/80 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="min-w-0">
            <div className="truncate font-serif text-lg">{code}</div>
            <div className="truncate text-xs text-ink/50">
              {[record.brandName, record.userName, formatDate(record.createdAt)]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink/50 transition hover:bg-sand hover:text-ink"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_184px]">
          <div className="relative flex min-h-[40vh] items-center justify-center bg-[radial-gradient(circle,#efe7da_1px,transparent_1px)] [background-size:16px_16px] p-4">
            {current && (
              <img src={current.src} alt={current.label} className="max-h-[64vh] max-w-full rounded-lg object-contain shadow" />
            )}
            {current && (
              <span className="absolute left-5 top-5 rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold text-white">
                {current.label}
              </span>
            )}
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2 overflow-x-auto border-t border-line p-3 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:border-l md:border-t-0">
            {images.map((img, i) => (
              <button
                key={img.key}
                onClick={() => setActive(i)}
                className={`group relative shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  i === active ? "border-clay" : "border-transparent hover:border-line"
                }`}
              >
                <img src={img.src} alt="" className="h-20 w-20 object-cover md:h-24 md:w-full" />
                <span className="absolute inset-x-0 bottom-0 bg-black/45 px-1 py-0.5 text-[10px] font-medium text-white">
                  {img.label}
                </span>
              </button>
            ))}
            {images.length <= 1 && (
              <div className="px-1 py-2 text-center text-xs text-ink/30 md:mt-2">{t("adm.vw_loading_src")}</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {current && (
              <button className="btn-primary" onClick={() => downloadFile(current.src, current.name)}>
                {t("adm.vw_download_this")}
              </button>
            )}
            {images.length > 1 && (
              <button className="btn-ghost" onClick={downloadAll} disabled={busy}>
                {busy ? t("adm.vw_downloading") : t("adm.vw_download_all", { n: images.length })}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {actions}
            <button className="btn-ghost" onClick={onClose}>
              {t("common.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
