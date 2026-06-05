import { useState } from "react";
import type { Template, User } from "../api/types";
import { api, ApiError } from "../api/client";
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
    </div>
  );
}

