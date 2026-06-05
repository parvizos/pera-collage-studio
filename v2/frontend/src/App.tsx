import { useEffect, useState } from "react";
import { api } from "./api/client";
import type { Template, User } from "./api/types";
import { LoginScreen } from "./screens/LoginScreen";
import { EmployeeApp } from "./screens/EmployeeApp";
import { AdminApp } from "./screens/AdminApp";

type Route = "employee" | "admin";
type Session =
  | { kind: "none" }
  | { kind: "employee"; user: User; pin: string }
  | { kind: "admin"; pin: string };

function detectRoute(): Route {
  return window.location.pathname.replace(/\/+$/, "") === "/admin" ? "admin" : "employee";
}

export default function App() {
  const route = detectRoute();
  const [template, setTemplate] = useState<Template | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session>({ kind: "none" });

  useEffect(() => {
    Promise.all([api.getTemplate(), api.getUsers()])
      .then(([tpl, us]) => {
        setTemplate(tpl);
        setUsers(us);
      })
      .catch(() => setError("Не удалось загрузить данные с сервера"));
  }, []);

  if (error) {
    return <CenterMessage title="Ошибка" body={error} />;
  }
  if (!template) {
    return <CenterMessage title="Pera Collage Studio" body="Загрузка…" />;
  }

  if (session.kind === "none") {
    return (
      <LoginScreen
        route={route}
        users={users}
        onEmployee={(user, pin) => setSession({ kind: "employee", user, pin })}
        onAdmin={(pin) => setSession({ kind: "admin", pin })}
      />
    );
  }

  if (session.kind === "admin") {
    return (
      <AdminApp
        template={template}
        users={users}
        adminPin={session.pin}
        onTemplateChange={setTemplate}
        onUsersChange={setUsers}
        onLogout={() => setSession({ kind: "none" })}
      />
    );
  }

  return (
    <EmployeeApp
      template={template}
      user={session.user}
      pin={session.pin}
      onLogout={() => setSession({ kind: "none" })}
    />
  );
}

function CenterMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="text-center">
        <h1 className="font-serif text-4xl">{title}</h1>
        <p className="mt-2 text-ink/60">{body}</p>
      </div>
    </div>
  );
}
