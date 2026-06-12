import { useEffect, useState } from "react";
import { api, ApiError, type Customer, type Destination } from "../api/client";
import { useI18n } from "../i18n";

interface Props {
  account: Customer | null;
  token: string | null;
  onAuthed: (customer: Customer, token: string) => void;
  onLogout: () => void;
  onUpdate: (customer: Customer) => void;
  onClose: () => void;
  onFavorites: () => void;
}

type Tab = "profile" | "orders" | "addresses" | "favorites";

export function AccountView({ account, token, onAuthed, onLogout, onUpdate, onClose, onFavorites }: Props) {
  const { t } = useI18n();

  // ---- Not logged in: login / register ----
  if (!account || !token) return <AuthForm onAuthed={onAuthed} onClose={onClose} />;

  return <Dashboard account={account} token={token} onLogout={onLogout} onUpdate={onUpdate} onClose={onClose} onFavorites={onFavorites} t={t} />;
}

function AuthForm({ onAuthed, onClose }: { onAuthed: (c: Customer, tk: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const res = mode === "register"
        ? await api.accountRegister(phone, name, password)
        : await api.accountLogin(phone, password);
      onAuthed(res.customer, res.token);
    } catch (e2) {
      const d = e2 instanceof ApiError ? (e2.detail as { message?: string }) : null;
      setErr(d?.message || t("acc.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <button onClick={onClose} className="mb-4 text-sm font-medium text-ink/60 hover:text-ink">← {t("store.home")}</button>
      <div className="card p-6">
        <h1 className="font-serif text-3xl">{mode === "register" ? t("acc.register") : t("acc.login")}</h1>
        <p className="mt-1 text-sm text-ink/50">{t("acc.subtitle")}</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "register" && (
            <div>
              <label className="field-label">{t("acc.name")}</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
          )}
          <div>
            <label className="field-label">{t("acc.phone")}</label>
            <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 5XX XXX XX XX" autoComplete="tel" required />
          </div>
          <div>
            <label className="field-label">{t("acc.password")}</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} required />
          </div>
          {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "…" : mode === "register" ? t("acc.create") : t("acc.enter")}
          </button>
        </form>
        <button
          onClick={() => { setMode(mode === "register" ? "login" : "register"); setErr(""); }}
          className="mt-4 w-full text-center text-sm font-medium text-clay hover:underline"
        >
          {mode === "register" ? t("acc.have_account") : t("acc.no_account")}
        </button>
      </div>
    </main>
  );
}

function Dashboard({ account, token, onLogout, onUpdate, onClose, onFavorites, t }: {
  account: Customer; token: string; onLogout: () => void; onUpdate: (c: Customer) => void; onClose: () => void; onFavorites: () => void;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  const [tab, setTab] = useState<Tab>("profile");
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [status, setStatus] = useState("");

  async function saveProfile() {
    setStatus("…");
    try {
      const res = await api.accountProfile(token, { name, email });
      onUpdate(res.customer);
      setStatus(t("acc.saved"));
      setTimeout(() => setStatus(""), 2000);
    } catch {
      setStatus(t("acc.error"));
    }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "profile", label: t("acc.profile"), icon: "👤" },
    { id: "orders", label: t("acc.orders"), icon: "📦" },
    { id: "addresses", label: t("acc.shipping"), icon: "🚚" },
    { id: "favorites", label: t("acc.favorites"), icon: "♥" },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <button onClick={onClose} className="mb-4 text-sm font-medium text-ink/60 hover:text-ink">← {t("store.home")}</button>
      <h1 className="mb-5 font-serif text-3xl">{t("acc.hello")}, {account.name || account.phone} 👋</h1>
      <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <nav className="space-y-1">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => (tb.id === "favorites" ? onFavorites() : setTab(tb.id))}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${tab === tb.id ? "bg-ink text-white" : "text-ink/70 hover:bg-white"}`}
            >
              <span className="w-5 text-center">{tb.icon}</span> {tb.label}
            </button>
          ))}
          <button onClick={onLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50">
            <span className="w-5 text-center">⎋</span> {t("acc.logout")}
          </button>
        </nav>

        {/* Content */}
        <div className="min-w-0">
          {tab === "profile" && (
            <div className="card space-y-4 p-5">
              <h2 className="font-serif text-xl">{t("acc.profile")}</h2>
              <div>
                <label className="field-label">{t("acc.phone")}</label>
                <input className="input bg-sand/60" value={account.phone} disabled />
              </div>
              <div>
                <label className="field-label">{t("acc.name")}</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="field-label">{t("acc.email")}</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <button className="btn-primary" onClick={saveProfile}>{t("acc.save")}</button>
                {status && <span className="text-sm font-medium text-green-600">{status}</span>}
              </div>
            </div>
          )}
          {tab === "addresses" && <DestinationsTab token={token} t={t} />}
          {tab === "orders" && <OrdersTab token={token} t={t} />}
        </div>
      </div>
    </main>
  );
}

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  confirmed: "bg-amber-100 text-amber-700",
  shipped: "bg-violet-100 text-violet-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

function OrdersTab({ token, t }: { token: string; t: (k: string, v?: Record<string, string | number>) => string }) {
  const [orders, setOrders] = useState<import("../api/client").Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.accountOrders(token).then((r) => setOrders(r.orders)).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="card grid min-h-[160px] place-items-center p-5"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-clay" /></div>;
  if (orders.length === 0) {
    return (
      <div className="card grid min-h-[200px] place-items-center gap-2 p-5 text-center text-ink/50">
        <div className="text-4xl">📦</div>
        <div>{t("acc.no_orders")}</div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">№ {o.number}</div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[o.status] || "bg-sand text-ink/60"}`}>{t(`acc.status_${o.status}`)}</span>
          </div>
          <div className="mt-0.5 text-xs text-ink/45">{new Date(o.createdAt + "Z").toLocaleString()}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {o.items.slice(0, 8).map((it, i) => (
              <div key={i} className="h-16 w-14 overflow-hidden rounded-lg bg-sand" title={`${it.code} ×${it.qty}`}>
                {it.photo && <img src={it.photo} alt={it.code} className="h-full w-full object-cover" />}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-sm">
            <span className="text-ink/55">{t("acc.items_n", { n: o.items.reduce((s, it) => s + (it.qty || 1), 0) })}</span>
            <span className="font-serif text-lg">{o.total} {o.currency}</span>
          </div>
          {o.destination && (
            <div className="mt-1 text-xs text-ink/50">🚚 {o.destination.kind === "pickup" ? (o.destination.recipient || "") : o.destination.cargo}{o.destination.code ? ` · ${o.destination.code}` : ""}</div>
          )}
        </div>
      ))}
    </div>
  );
}

const KIND_ICON: Record<string, string> = { cargo: "📦", bayer: "🤝", pickup: "🏬" };
const EMPTY_DEST: Partial<Destination> = { kind: "cargo", cargo: "", code: "", recipient: "", phone: "", country: "", city: "", note: "" };

function DestinationsTab({ token, t }: { token: string; t: (k: string, v?: Record<string, string | number>) => string }) {
  const [list, setList] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Destination> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.accountDestinations(token).then((r) => setList(r.destinations)).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      const r = editing.id
        ? await api.accountDestinationSave(token, editing.id, editing as Record<string, unknown>)
        : await api.accountDestinationCreate(token, editing);
      setList(r.destinations);
      setEditing(null);
    } catch { /* ignore */ } finally { setBusy(false); }
  }
  async function act(id: string, action: "delete" | "default") {
    const r = await api.accountDestinationSave(token, id, { _action: action });
    setList(r.destinations);
  }

  const kindLabel = (k: string) => t(`acc.kind_${k}`);
  const set = (patch: Partial<Destination>) => setEditing((e) => ({ ...(e || {}), ...patch }));

  if (loading) return <div className="card grid min-h-[160px] place-items-center p-5"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-clay" /></div>;

  if (editing) {
    const k = editing.kind || "cargo";
    return (
      <div className="card space-y-3 p-5">
        <h2 className="font-serif text-xl">{editing.id ? t("acc.edit_dest") : t("acc.add_dest")}</h2>
        <div>
          <label className="field-label">{t("acc.dest_type")}</label>
          <div className="flex flex-wrap gap-2">
            {(["cargo", "bayer", "pickup"] as const).map((kk) => (
              <button key={kk} onClick={() => set({ kind: kk })} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${k === kk ? "border-ink bg-ink text-white" : "border-line hover:border-ink/40"}`}>
                {KIND_ICON[kk]} {kindLabel(kk)}
              </button>
            ))}
          </div>
        </div>
        {k !== "pickup" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">{k === "cargo" ? t("acc.cargo_name") : t("acc.bayer_name")}</label>
              <input className="input" value={editing.cargo || ""} onChange={(e) => set({ cargo: e.target.value })} />
            </div>
            <div>
              <label className="field-label">{k === "cargo" ? t("acc.cargo_code") : t("acc.bayer_code")}</label>
              <input className="input" value={editing.code || ""} onChange={(e) => set({ code: e.target.value })} />
            </div>
          </div>
        )}
        {k === "cargo" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="field-label">{t("acc.country")}</label><input className="input" value={editing.country || ""} onChange={(e) => set({ country: e.target.value })} /></div>
            <div><label className="field-label">{t("acc.city")}</label><input className="input" value={editing.city || ""} onChange={(e) => set({ city: e.target.value })} /></div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="field-label">{t("acc.recipient")}</label><input className="input" value={editing.recipient || ""} onChange={(e) => set({ recipient: e.target.value })} /></div>
          <div><label className="field-label">{t("acc.phone")}</label><input className="input" value={editing.phone || ""} onChange={(e) => set({ phone: e.target.value })} /></div>
        </div>
        <div><label className="field-label">{t("acc.note")}</label><input className="input" value={editing.note || ""} onChange={(e) => set({ note: e.target.value })} /></div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={!!editing.isDefault} onChange={(e) => set({ isDefault: e.target.checked })} />
          {t("acc.set_default")}
        </label>
        <div className="flex items-center gap-2">
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "…" : t("acc.save")}</button>
          <button className="btn-ghost" onClick={() => setEditing(null)}>{t("acc.cancel")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl">{t("acc.shipping")}</h2>
        <button className="btn-primary" onClick={() => setEditing({ ...EMPTY_DEST })}>+ {t("acc.add_dest")}</button>
      </div>
      {list.length === 0 ? (
        <div className="card grid min-h-[180px] place-items-center gap-2 p-5 text-center text-ink/50">
          <div className="text-4xl">🚚</div>
          <div>{t("acc.dest_empty")}</div>
        </div>
      ) : (
        list.map((d) => (
          <div key={d.id} className="card flex items-start gap-3 p-4">
            <div className="text-2xl">{KIND_ICON[d.kind]}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{d.kind === "pickup" ? (d.recipient || kindLabel("pickup")) : (d.cargo || kindLabel(d.kind))}</span>
                {d.code && <span className="rounded bg-sand px-1.5 py-0.5 text-xs font-medium">{t("acc.code_short")}: {d.code}</span>}
                {d.isDefault && <span className="rounded-full bg-clay/15 px-2 py-0.5 text-xs font-semibold text-clay">{t("acc.default")}</span>}
              </div>
              <div className="mt-0.5 text-sm text-ink/55">
                {[d.kind === "cargo" ? [d.country, d.city].filter(Boolean).join(", ") : "", d.recipient && d.kind !== "pickup" ? d.recipient : "", d.phone, d.note].filter(Boolean).join(" · ")}
              </div>
              <div className="mt-2 flex gap-3 text-xs">
                {!d.isDefault && <button onClick={() => act(d.id, "default")} className="font-medium text-clay hover:underline">{t("acc.make_default")}</button>}
                <button onClick={() => setEditing({ ...d })} className="font-medium text-ink/60 hover:text-ink hover:underline">{t("acc.edit")}</button>
                <button onClick={() => act(d.id, "delete")} className="font-medium text-red-600 hover:underline">{t("acc.delete")}</button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
