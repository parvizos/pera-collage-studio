import { useState } from "react";
import { api, ApiError, type Customer } from "../api/client";
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
    { id: "addresses", label: t("acc.addresses"), icon: "📍" },
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
          {(tab === "orders" || tab === "addresses") && (
            <div className="card grid min-h-[220px] place-items-center gap-2 p-5 text-center text-ink/50">
              <div className="text-4xl">{tab === "orders" ? "📦" : "📍"}</div>
              <div>{t("acc.soon")}</div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
