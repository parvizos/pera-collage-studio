import { useEffect, useState } from "react";
import { api, type StoreOrder } from "../../api/client";

interface Props {
  adminPin: string;
}

const STATUSES: { id: string; label: string; cls: string }[] = [
  { id: "new", label: "Новый", cls: "bg-blue-50 text-blue-700" },
  { id: "confirmed", label: "Подтверждён", cls: "bg-amber-50 text-amber-700" },
  { id: "shipped", label: "Отправлен", cls: "bg-violet-50 text-violet-700" },
  { id: "done", label: "Выполнен", cls: "bg-green-50 text-green-700" },
  { id: "cancelled", label: "Отменён", cls: "bg-red-50 text-red-600" },
];

function destLine(d: StoreOrder["destination"]): string {
  if (!d) return "";
  if (d.kind === "cargo") return `Карго: ${d.cargo}${d.code ? `, код ${d.code}` : ""}${d.country || d.city ? `, ${[d.country, d.city].filter(Boolean).join(" ")}` : ""}${d.recipient ? `, ${d.recipient}` : ""}${d.phone ? `, ${d.phone}` : ""}`;
  if (d.kind === "bayer") return `Байер: ${d.cargo}${d.code ? `, № ${d.code}` : ""}${d.phone ? `, ${d.phone}` : ""}`;
  return `Самовывоз: ${d.recipient || ""}${d.phone ? `, ${d.phone}` : ""}`;
}

function statusInfo(id: string) {
  return STATUSES.find((s) => s.id === id) ?? STATUSES[0];
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

function phoneLink(phone: string): string {
  const clean = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${clean}`;
}

export function OrdersSection({ adminPin }: Props) {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    api
      .getStoreOrders(adminPin)
      .then(setOrders)
      .catch(() => setError("Не удалось загрузить заказы"))
      .finally(() => setLoading(false));
  }, [adminPin]);

  async function changeStatus(order: StoreOrder, status: string) {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    try {
      await api.setOrderStatus(order.id, status, adminPin);
    } catch {
      setError("Не удалось обновить статус");
    }
  }

  const visible = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const newCount = orders.filter((o) => o.status === "new").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl">Заказы</h1>
        <p className="text-sm text-ink/50">
          Всего: {orders.length}
          {newCount > 0 && <span className="ml-2 font-semibold text-clay">новых: {newCount}</span>}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full border px-3 py-1 text-sm transition ${
            filter === "all" ? "border-ink bg-ink text-white" : "border-line text-ink/60 hover:border-ink/40"
          }`}
        >
          Все
        </button>
        {STATUSES.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilter(s.id)}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              filter === s.id ? "border-ink bg-ink text-white" : "border-line text-ink/60 hover:border-ink/40"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {loading ? (
        <p className="py-16 text-center text-ink/40">Загрузка…</p>
      ) : visible.length === 0 ? (
        <div className="card grid min-h-[200px] place-items-center text-ink/40">Заказов нет</div>
      ) : (
        <div className="space-y-4">
          {visible.map((order) => {
            const info = statusInfo(order.status);
            return (
              <div key={order.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-lg">№ {order.number}</span>
                      <span className="text-sm text-ink/60">{order.customer.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${info.cls}`}>{info.label}</span>
                    </div>
                    <a href={phoneLink(order.customer.phone)} target="_blank" rel="noreferrer" className="text-sm text-ink/60 hover:text-ink">
                      📞 {order.customer.phone}
                    </a>
                    {order.destination && <div className="text-sm text-ink/50">🚚 {destLine(order.destination)}</div>}
                    {order.comment && <div className="mt-1 text-sm italic text-ink/50">«{order.comment}»</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-ink/40">{formatDate(order.createdAt)}</div>
                    <select
                      className="input mt-1 w-auto"
                      value={order.status}
                      onChange={(e) => changeStatus(order, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-line pt-3">
                  {order.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <a href={it.photo || undefined} target="_blank" rel="noreferrer" className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-sand">
                        {it.photo && <img src={it.photo} alt={it.code} className="h-full w-full object-cover" />}
                      </a>
                      <span className="flex-1">
                        <b>{it.code}</b>
                        {[it.color, it.size].filter(Boolean).length > 0 && (
                          <span className="text-ink/50"> · {[it.color, it.size].filter(Boolean).join(" · ")}</span>
                        )}
                        <span className="text-ink/50"> × {it.qty}</span>
                      </span>
                      <span className="text-ink/70">{it.price}</span>
                    </div>
                  ))}
                </div>

                {order.total != null && (
                  <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold">
                    <span>Итого</span>
                    <span>{Number(order.total).toLocaleString("ru-RU")} {order.currency}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
