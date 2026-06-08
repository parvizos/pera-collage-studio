import type { ReactNode } from "react";
import type { HistoryRecord } from "../api/types";
import { Thumb } from "./Thumb";

interface Props {
  code: string;
  brandName?: string;
  records: HistoryRecord[];
  onClose: () => void;
  /** Tap on a variation image. */
  onOpen: (record: HistoryRecord) => void;
  /** Optional per-variation action controls (e.g. publish / delete). */
  renderActions?: (record: HistoryRecord, index: number) => ReactNode;
}

/** Clean popup gallery of a product's variations (instead of a long inline list). */
export function VariationsModal({ code, brandName, records, onClose, onOpen, renderActions }: Props) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <div className="font-serif text-lg">{code}</div>
            <div className="text-xs text-ink/45">
              {records.length} {records.length === 1 ? "вариант" : "вариантов"}
              {brandName ? ` · ${brandName}` : ""}
            </div>
          </div>
          <button className="rounded-full px-3 py-1 text-sm text-ink/50 hover:bg-sand" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 overflow-auto p-4 sm:grid-cols-3">
          {records.map((r, i) => (
            <div key={r.id} className="overflow-hidden rounded-xl border border-line bg-white">
              <button
                className="relative block aspect-[3/4] w-full overflow-hidden bg-sand"
                onClick={() => onOpen(r)}
                title="Открыть"
              >
                {r.imagePath ? (
                  <Thumb src={r.imagePath} w={300} className="h-full w-full object-cover transition hover:scale-[1.03]" />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-ink/30">нет фото</div>
                )}
                <span className="absolute left-1.5 top-1.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-ink/80 px-1 text-[11px] font-semibold text-white">
                  {i + 1}
                </span>
              </button>
              {renderActions && (
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">{renderActions(r, i)}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
