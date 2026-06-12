import { useState } from "react";
import type { Template, User } from "../api/types";
import { api, ApiError } from "../api/client";
import { LabelScanner } from "../components/LabelScanner";
import type { ParsedLabel } from "../lib/scanLabel";
import { UsersSection } from "./admin/UsersSection";
import { BrandsSection } from "./admin/BrandsSection";
import { FieldsSection } from "./admin/FieldsSection";
import { HistorySection } from "./admin/HistorySection";
import { SceneEditor } from "./admin/SceneEditor";
import { StorePageSection } from "./admin/StorePageSection";
import { OrdersSection } from "./admin/OrdersSection";
import { useI18n } from "../i18n";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

interface Props {
  template: Template;
  users: User[];
  adminPin: string;
  onTemplateChange: (t: Template) => void;
  onUsersChange: (u: User[]) => void;
  onLogout: () => void;
}

type SectionId = "overview" | "storepage" | "orders" | "users" | "brands" | "fields" | "history" | "templates";

const NAV: { id: SectionId; key: string }[] = [
  { id: "overview", key: "adm.nav_overview" },
  { id: "storepage", key: "adm.nav_page" },
  { id: "orders", key: "adm.nav_orders" },
  { id: "users", key: "adm.nav_users" },
  { id: "brands", key: "adm.nav_brands" },
  { id: "fields", key: "adm.nav_fields" },
  { id: "templates", key: "adm.nav_templates" },
  { id: "history", key: "adm.nav_history" },
];

export function AdminApp({
  template,
  users,
  adminPin,
  onTemplateChange,
  onUsersChange,
  onLogout,
}: Props) {
  const { t } = useI18n();
  const [section, setSection] = useState<SectionId>("overview");

  return (
    <div className="min-h-screen bg-sand">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white/80 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="font-serif text-2xl">PERA</span>
          <span className="rounded-full bg-clay/10 px-2 py-0.5 text-xs font-semibold text-clay">
            {t("adm.badge")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button className="btn-ghost" onClick={onLogout}>
            {t("adm.close")}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-[200px_1fr]">
        <nav className="lg:sticky lg:top-20 lg:self-start">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.id}>
                <button
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                    section === item.id ? "bg-ink text-white" : "text-ink/70 hover:bg-white"
                  }`}
                  onClick={() => setSection(item.id)}
                >
                  {t(item.key)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0">
          {section === "overview" && (
            <Overview
              template={template}
              users={users}
              adminPin={adminPin}
              onTemplateChange={onTemplateChange}
            />
          )}
          {section === "storepage" && (
            <StorePageSection template={template} adminPin={adminPin} onTemplateChange={onTemplateChange} onClose={() => setSection("overview")} />
          )}
          {section === "orders" && <OrdersSection adminPin={adminPin} />}
          {section === "users" && (
            <UsersSection
              template={template}
              users={users}
              adminPin={adminPin}
              onUsersChange={onUsersChange}
            />
          )}
          {section === "brands" && (
            <BrandsSection
              template={template}
              adminPin={adminPin}
              onTemplateChange={onTemplateChange}
            />
          )}
          {section === "fields" && (
            <FieldsSection
              template={template}
              adminPin={adminPin}
              onTemplateChange={onTemplateChange}
            />
          )}
          {section === "history" && <HistorySection adminPin={adminPin} />}
          {section === "templates" && (
            <SceneEditor
              template={template}
              adminPin={adminPin}
              onTemplateChange={onTemplateChange}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function Overview({
  template,
  users,
  adminPin,
  onTemplateChange,
}: {
  template: Template;
  users: User[];
  adminPin: string;
  onTemplateChange: (t: Template) => void;
}) {
  const { t } = useI18n();
  const stats = [
    { label: t("adm.stat_users"), value: users.length },
    { label: t("adm.stat_brands"), value: template.brands.length },
    { label: t("adm.stat_templates"), value: template.photoTemplates.length },
    { label: t("adm.stat_fields"), value: template.fields.length },
  ];

  const [enabled, setEnabled] = useState(!!template.multiProduct?.enabled);
  const [maxCount, setMaxCount] = useState(template.multiProduct?.maxCount ?? 4);
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "ok" | "error"; msg?: string }>({
    kind: "idle",
  });

  // Сканер наклеек (бета)
  const [scanForEmployees, setScanForEmployees] = useState(!!template.labelScanner?.enabledForEmployees);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [testResult, setTestResult] = useState<ParsedLabel | null>(null);
  const [scanSave, setScanSave] = useState<{ kind: "idle" | "saving" | "ok" | "error"; msg?: string }>({
    kind: "idle",
  });

  // Контакты магазина
  const store0 = template.store as Record<string, unknown>;
  const [shop, setShop] = useState({
    whatsapp: (store0.whatsapp as string) || "",
    instagram: (store0.instagram as string) || "",
    currency: (store0.currency as string) || "₺",
    about: (store0.about as string) || "",
  });
  const [shopSave, setShopSave] = useState<{ kind: "idle" | "saving" | "ok" | "error"; msg?: string }>({
    kind: "idle",
  });

  async function saveShop() {
    setShopSave({ kind: "saving" });
    try {
      const next: Template = {
        ...template,
        store: { ...(template.store as Record<string, unknown>), ...shop },
      };
      await api.saveTemplate(next, adminPin);
      onTemplateChange(next);
      setShopSave({ kind: "ok", msg: t("common.saved") });
    } catch (e) {
      setShopSave({
        kind: "error",
        msg: e instanceof ApiError && e.status === 401 ? t("common.no_access") : t("common.save_fail"),
      });
    }
  }

  async function saveScanSetting() {
    setScanSave({ kind: "saving" });
    try {
      const next: Template = { ...template, labelScanner: { enabledForEmployees: scanForEmployees } };
      await api.saveTemplate(next, adminPin);
      onTemplateChange(next);
      setScanSave({ kind: "ok", msg: t("common.saved") });
    } catch (e) {
      setScanSave({
        kind: "error",
        msg: e instanceof ApiError && e.status === 401 ? t("common.no_access") : t("common.save_fail"),
      });
    }
  }

  async function saveMulti() {
    setStatus({ kind: "saving" });
    try {
      const next: Template = {
        ...template,
        multiProduct: {
          ...(template.multiProduct ?? { previewCount: 2, previewOnCanvas: true }),
          enabled,
          maxCount: Math.max(2, Math.min(8, maxCount)),
        },
      };
      await api.saveTemplate(next, adminPin);
      onTemplateChange(next);
      setStatus({ kind: "ok", msg: t("common.saved") });
    } catch (e) {
      setStatus({
        kind: "error",
        msg: e instanceof ApiError && e.status === 401 ? t("common.no_access") : t("common.save_fail"),
      });
    }
  }

  const dirty =
    enabled !== !!template.multiProduct?.enabled || maxCount !== (template.multiProduct?.maxCount ?? 4);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl">{t("adm.ov_title")}</h1>
        <p className="text-sm text-ink/50">{t("adm.ov_sub")}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="font-serif text-3xl">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-ink/40">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card space-y-4 p-5">
        <div>
          <h2 className="font-serif text-lg">{t("adm.mp_title")}</h2>
          <p className="text-sm text-ink/50">{t("adm.mp_sub")}</p>
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <span
            className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-ink" : "bg-line"}`}
            onClick={() => setEnabled((v) => !v)}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                enabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
          <span className="text-sm font-medium">{enabled ? t("adm.mp_on") : t("adm.mp_off")}</span>
        </label>

        {enabled && (
          <div className="max-w-[200px]">
            <label className="field-label">{t("adm.mp_max")}</label>
            <select className="input" value={maxCount} onChange={(e) => setMaxCount(Number(e.target.value))}>
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={saveMulti} disabled={status.kind === "saving" || !dirty}>
            {status.kind === "saving" ? t("common.saving") : t("common.save")}
          </button>
          {status.msg && (
            <span
              className={`text-sm font-medium ${status.kind === "error" ? "text-red-600" : "text-green-600"}`}
            >
              {status.msg}
            </span>
          )}
        </div>

        {enabled && (
          <p className="rounded-lg bg-clay/5 p-3 text-xs text-ink/60">{t("adm.mp_hint")}</p>
        )}
      </div>

      {/* Контакты магазина */}
      <div className="card space-y-4 p-5">
        <div>
          <h2 className="font-serif text-lg">{t("adm.shop_title")}</h2>
          <p className="text-sm text-ink/50">{t("adm.shop_sub")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="field-label">{t("adm.shop_wa")}</label>
            <input
              className="input"
              placeholder="905339178551"
              value={shop.whatsapp}
              onChange={(e) => setShop({ ...shop, whatsapp: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">{t("adm.shop_ig")}</label>
            <input
              className="input"
              placeholder="peraistanbulstore"
              value={shop.instagram}
              onChange={(e) => setShop({ ...shop, instagram: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">{t("adm.shop_cur")}</label>
            <input
              className="input"
              placeholder="₺"
              value={shop.currency}
              onChange={(e) => setShop({ ...shop, currency: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="field-label">{t("adm.shop_about")}</label>
          <textarea
            className="input"
            rows={4}
            value={shop.about}
            onChange={(e) => setShop({ ...shop, about: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={saveShop} disabled={shopSave.kind === "saving"}>
            {shopSave.kind === "saving" ? t("common.saving") : t("common.save")}
          </button>
          {shopSave.msg && (
            <span className={`text-sm font-medium ${shopSave.kind === "error" ? "text-red-600" : "text-green-600"}`}>
              {shopSave.msg}
            </span>
          )}
        </div>
      </div>

      {/* Сканер наклеек (бета) */}
      <div className="card space-y-4 p-5">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-lg">{t("adm.scan_title")}</h2>
          <span className="rounded-full bg-clay/10 px-2 py-0.5 text-xs font-semibold text-clay">{t("adm.beta")}</span>
        </div>
        <p className="text-sm text-ink/50">{t("adm.scan_sub")}</p>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-clay" onClick={() => { setTestResult(null); setScannerOpen(true); }}>
            {t("adm.scan_test")}
          </button>
        </div>

        {testResult && (
          <div className="rounded-lg border border-line bg-sand/50 p-3 text-sm">
            <div className="mb-1 font-semibold">{t("adm.scan_recognized")}</div>
            <ul className="space-y-0.5 text-ink/70">
              <li>{t("adm.f_code")}: <b>{testResult.code || "—"}</b></li>
              <li>{t("adm.f_category")}: <b>{testResult.category || "—"}</b></li>
              <li>{t("adm.f_color")}: <b>{testResult.color || "—"}</b></li>
              <li>{t("adm.f_size")}: <b>{testResult.size || "—"}</b></li>
              <li>{t("adm.f_price")}: <b>{testResult.price || "—"}</b></li>
            </ul>
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-3">
          <span
            className={`relative h-6 w-11 rounded-full transition ${scanForEmployees ? "bg-ink" : "bg-line"}`}
            onClick={() => setScanForEmployees((v) => !v)}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                scanForEmployees ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
          <span className="text-sm font-medium">{t("adm.scan_show_emp")}</span>
        </label>

        <div className="flex items-center gap-3">
          <button
            className="btn-primary"
            onClick={saveScanSetting}
            disabled={scanSave.kind === "saving" || scanForEmployees === !!template.labelScanner?.enabledForEmployees}
          >
            {scanSave.kind === "saving" ? t("common.saving") : t("common.save")}
          </button>
          {scanSave.msg && (
            <span className={`text-sm font-medium ${scanSave.kind === "error" ? "text-red-600" : "text-green-600"}`}>
              {scanSave.msg}
            </span>
          )}
        </div>
      </div>

      {scannerOpen && (
        <LabelScanner
          onClose={() => setScannerOpen(false)}
          onResult={(parsed) => {
            setTestResult(parsed);
            setScannerOpen(false);
          }}
        />
      )}
    </div>
  );
}

