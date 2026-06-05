import { useState } from "react";
import type { Template, User } from "../../api/types";
import { api, ApiError } from "../../api/client";

interface Props {
  template: Template;
  users: User[];
  adminPin: string;
  onUsersChange: (users: User[]) => void;
}

function makeUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function UsersSection({ template, users, adminPin, onUsersChange }: Props) {
  const [draft, setDraft] = useState<User[]>(() => users.map((u) => ({ ...u, brandIds: [...u.brandIds] })));
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "ok" | "error"; msg?: string }>({
    kind: "idle",
  });

  function update(index: number, patch: Partial<User>) {
    setDraft((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
    setStatus({ kind: "idle" });
  }

  function toggleBrand(index: number, brandId: string) {
    setDraft((prev) =>
      prev.map((u, i) => {
        if (i !== index) return u;
        const has = u.brandIds.includes(brandId);
        return { ...u, brandIds: has ? u.brandIds.filter((b) => b !== brandId) : [...u.brandIds, brandId] };
      }),
    );
    setStatus({ kind: "idle" });
  }

  function addUser() {
    setDraft((prev) => [
      ...prev,
      {
        id: makeUserId(),
        name: `employee-${String(prev.length + 1).padStart(2, "0")}`,
        pin: "1111",
        brandIds: template.brands[0] ? [template.brands[0].id] : [],
      },
    ]);
    setStatus({ kind: "idle" });
  }

  function removeUser(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index));
    setStatus({ kind: "idle" });
  }

  async function save() {
    setStatus({ kind: "saving" });
    try {
      const saved = await api.saveUsers(draft, adminPin);
      onUsersChange(saved);
      setDraft(saved.map((u) => ({ ...u, brandIds: [...u.brandIds] })));
      setStatus({ kind: "ok", msg: "Сохранено" });
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 401 ? "Нет доступа (PIN администратора)" : "Не удалось сохранить";
      setStatus({ kind: "error", msg });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl">Сотрудники</h1>
          <p className="text-sm text-ink/50">Логины, PIN-коды и доступные бренды</p>
        </div>
        <button className="btn-ghost" onClick={addUser}>
          + Добавить
        </button>
      </div>

      <div className="space-y-4">
        {draft.map((user, index) => (
          <div key={user.id} className="card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label">Имя сотрудника</label>
                <input
                  className="input"
                  value={user.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">PIN</label>
                <input
                  className="input tracking-[0.3em]"
                  value={user.pin}
                  onChange={(e) => update(index, { pin: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="field-label">Доступные бренды</label>
              {template.brands.length === 0 ? (
                <p className="text-sm text-ink/40">Сначала добавьте бренды</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {template.brands.map((brand) => {
                    const active = user.brandIds.includes(brand.id);
                    return (
                      <button
                        key={brand.id}
                        onClick={() => toggleBrand(index, brand.id)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                          active
                            ? "border-ink bg-ink text-white"
                            : "border-line bg-white text-ink/60 hover:border-ink/40"
                        }`}
                      >
                        {brand.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                className="text-sm font-medium text-red-600 hover:underline"
                onClick={() => removeUser(index)}
              >
                Удалить сотрудника
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-line bg-sand/80 py-3 backdrop-blur">
        {status.msg && (
          <span
            className={`text-sm font-medium ${
              status.kind === "error" ? "text-red-600" : "text-green-600"
            }`}
          >
            {status.msg}
          </span>
        )}
        <button className="btn-primary" onClick={save} disabled={status.kind === "saving"}>
          {status.kind === "saving" ? "Сохранение…" : "Сохранить изменения"}
        </button>
      </div>
    </div>
  );
}
