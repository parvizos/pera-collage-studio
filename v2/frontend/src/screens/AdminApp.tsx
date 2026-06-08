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

interface Props {
  template: Template;
  users: User[];
  adminPin: string;
  onTemplateChange: (t: Template) => void;
  onUsersChange: (u: User[]) => void;
  onLogout: () => void;
}

type SectionId = "overview" | "users" | "brands" | "fields" | "history" | "templates";

const NAV: { id: SectionId; label: string; ready: boolean }[] = [
  { id: "overview", label: "Обзор", ready: true },
  { id: "users", label: "Сотрудники", ready: true },
  { id: "brands", label: "Бренды", ready: true },
  { id: "fields", label: "Поля", ready: true },
  { id: "templates", label: "Шаблоны", ready: true },
  { id: "history", label: "История", ready: true },
];

export function AdminApp({
  template,
  users,
  adminPin,
  onTemplateChange,
  onUsersChange,
  onLogout,
}: Props) {
  const [section, setSection] = useState<SectionId>("overview");

  return (
    <div className="min-h-screen bg-sand">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white/80 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="font-serif text-2xl">PERA</span>
          <span className="rounded-full bg-clay/10 px-2 py-0.5 text-xs font-semibold text-clay">
            Админка
          </span>
        </div>
        <button className="btn-ghost" onClick={onLogout}>
          Закрыть админку
        </button>
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
                  {item.label}
                  {!item.ready && (
                    <span
                      className={`text-[10px] uppercase ${
                        section === item.id ? "text-white/60" : "text-ink/30"
                      }`}
                    >
                      скоро
                    </span>
                  )}
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
  const stats = [
    { label: "Сотрудники", value: users.length },
    { label: "Бренды", value: template.brands.length },
    { label: "Шаблоны фото", value: template.photoTemplates.length },
    { label: "Поля", value: template.fields.length },
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
      setShopSave({ kind: "ok", msg: "Сохранено" });
    } catch (e) {
      setShopSave({
        kind: "error",
        msg: e instanceof ApiError && e.status === 401 ? "Нет доступа (PIN)" : "Не удалось сохранить",
      });
    }
  }

  async function saveScanSetting() {
    setScanSave({ kind: "saving" });
    try {
      const next: Template = { ...template, labelScanner: { enabledForEmployees: scanForEmployees } };
      await api.saveTemplate(next, adminPin);
      onTemplateChange(next);
      setScanSave({ kind: "ok", msg: "Сохранено" });
    } catch (e) {
      setScanSave({
        kind: "error",
        msg: e instanceof ApiError && e.status === 401 ? "Нет доступа (PIN)" : "Не удалось сохранить",
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
      setStatus({ kind: "ok", msg: "Сохранено" });
    } catch (e) {
      setStatus({
        kind: "error",
        msg: e instanceof ApiError && e.status === 401 ? "Нет доступа (PIN)" : "Не удалось сохранить",
      });
    }
  }

  const dirty =
    enabled !== !!template.multiProduct?.enabled || maxCount !== (template.multiProduct?.maxCount ?? 4);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl">Обзор</h1>
        <p className="text-sm text-ink/50">Текущее состояние студии</p>
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
          <h2 className="font-serif text-lg">Мультипродукт</h2>
          <p className="text-sm text-ink/50">Несколько разных товаров в одном коллаже</p>
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
          <span className="text-sm font-medium">{enabled ? "Включён" : "Отключён"}</span>
        </label>

        {enabled && (
          <div className="max-w-[200px]">
            <label className="field-label">Максимум товаров</label>
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
            {status.kind === "saving" ? "Сохранение…" : "Сохранить"}
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
          <p className="rounded-lg bg-clay/5 p-3 text-xs text-ink/60">
            После включения зайди в <b>Шаблоны</b> → выбери «2 товара» (или 3/4) и настрой раскладку: для
            каждого блока-переменной укажи «Товар №». Сотрудник сможет выбирать количество товаров при
            создании коллажа.
          </p>
        )}
      </div>

      {/* Контакты магазина */}
      <div className="card space-y-4 p-5">
        <div>
          <h2 className="font-serif text-lg">Магазин — контакты</h2>
          <p className="text-sm text-ink/50">Показываются на витрине vrapzi.com</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="field-label">WhatsApp (номер)</label>
            <input
              className="input"
              placeholder="905339178551"
              value={shop.whatsapp}
              onChange={(e) => setShop({ ...shop, whatsapp: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Instagram (логин)</label>
            <input
              className="input"
              placeholder="peraistanbulstore"
              value={shop.instagram}
              onChange={(e) => setShop({ ...shop, instagram: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Валюта</label>
            <input
              className="input"
              placeholder="₺"
              value={shop.currency}
              onChange={(e) => setShop({ ...shop, currency: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={saveShop} disabled={shopSave.kind === "saving"}>
            {shopSave.kind === "saving" ? "Сохранение…" : "Сохранить"}
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
          <h2 className="font-serif text-lg">Сканер наклеек</h2>
          <span className="rounded-full bg-clay/10 px-2 py-0.5 text-xs font-semibold text-clay">бета</span>
        </div>
        <p className="text-sm text-ink/50">
          Распознаёт код, категорию, цвет, размер и цену с наклейки. Иногда ошибается — проверь точность
          здесь, прежде чем включать сотрудникам.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-clay" onClick={() => { setTestResult(null); setScannerOpen(true); }}>
            🧪 Проверить сканер
          </button>
        </div>

        {testResult && (
          <div className="rounded-lg border border-line bg-sand/50 p-3 text-sm">
            <div className="mb-1 font-semibold">Распознано:</div>
            <ul className="space-y-0.5 text-ink/70">
              <li>Код: <b>{testResult.code || "—"}</b></li>
              <li>Категория: <b>{testResult.category || "—"}</b></li>
              <li>Цвет: <b>{testResult.color || "—"}</b></li>
              <li>Размер: <b>{testResult.size || "—"}</b></li>
              <li>Цена: <b>{testResult.price || "—"}</b></li>
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
          <span className="text-sm font-medium">Показывать сотрудникам</span>
        </label>

        <div className="flex items-center gap-3">
          <button
            className="btn-primary"
            onClick={saveScanSetting}
            disabled={scanSave.kind === "saving" || scanForEmployees === !!template.labelScanner?.enabledForEmployees}
          >
            {scanSave.kind === "saving" ? "Сохранение…" : "Сохранить"}
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

