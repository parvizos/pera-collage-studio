import { useMemo, useState } from "react";
import { api } from "../api/client";
import type { User } from "../api/types";

interface Props {
  route: "employee" | "admin";
  users: User[];
  onEmployee: (user: User, pin: string) => void;
  onAdmin: (pin: string) => void;
}

export function LoginScreen({ route, users, onEmployee, onAdmin }: Props) {
  const [mode, setMode] = useState<"employee" | "admin">(route);
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedUser = useMemo(() => users.find((u) => u.id === userId), [users, userId]);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      if (mode === "admin") {
        const ok = await api.verifyAdmin(pin.trim());
        if (!ok) throw new Error("Неверный PIN администратора");
        onAdmin(pin.trim());
      } else {
        if (!selectedUser) throw new Error("Выберите сотрудника");
        if (selectedUser.pin !== pin.trim()) throw new Error("Неверный PIN");
        onEmployee(selectedUser, pin.trim());
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка входа");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-sand to-[#efe7da] p-6">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="font-serif text-5xl leading-none tracking-tight">PERA</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.4em] text-ink/50">
            Collage Studio
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-line/50 p-1 text-sm font-semibold">
          <button
            className={`rounded-full py-2 transition ${mode === "employee" ? "bg-white shadow" : "text-ink/50"}`}
            onClick={() => {
              setMode("employee");
              setErr(null);
            }}
          >
            Сотрудник
          </button>
          <button
            className={`rounded-full py-2 transition ${mode === "admin" ? "bg-white shadow" : "text-ink/50"}`}
            onClick={() => {
              setMode("admin");
              setErr(null);
            }}
          >
            Администратор
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) submit();
          }}
          className="space-y-4"
        >
          {mode === "employee" && (
            <div>
              <label className="field-label">Сотрудник</label>
              <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="field-label">
              {mode === "admin" ? "PIN администратора" : "PIN"}
            </label>
            <input
              className="input tracking-[0.3em]"
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={mode === "admin" ? "Введите PIN администратора" : "Введите PIN"}
            />
          </div>

          {err && <p className="text-sm font-medium text-red-600">{err}</p>}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Проверка…" : mode === "admin" ? "Войти в админку" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
