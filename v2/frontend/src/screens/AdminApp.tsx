import { useState } from "react";
import type { Template, User } from "../api/types";
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
          {section === "overview" && <Overview template={template} users={users} />}
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

function Overview({ template, users }: { template: Template; users: User[] }) {
  const stats = [
    { label: "Сотрудники", value: users.length },
    { label: "Бренды", value: template.brands.length },
    { label: "Шаблоны фото", value: template.photoTemplates.length },
    { label: "Поля", value: template.fields.length },
  ];
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
      <div className="card p-5">
        <h2 className="mb-2 font-serif text-lg">Мультипродукт</h2>
        <p className="text-sm text-ink/60">
          {template.multiProduct?.enabled
            ? `Включён, до ${template.multiProduct.maxCount} товаров в одном коллаже.`
            : "Отключён."}
        </p>
      </div>
    </div>
  );
}

