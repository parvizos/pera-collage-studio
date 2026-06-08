import { useEffect, useState } from "react";
import { api } from "./api/client";
import { useI18n } from "./i18n";
import type { Template, User } from "./api/types";
import { LoginScreen } from "./screens/LoginScreen";
import { EmployeeApp } from "./screens/EmployeeApp";
import { AdminApp } from "./screens/AdminApp";
import { Store } from "./screens/Store";

type Route = "store" | "staff" | "admin";
type Session =
  | { kind: "none" }
  | { kind: "employee"; user: User; pin: string }
  | { kind: "admin"; pin: string };

function detectRoute(): Route {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path === "/admin") return "admin";
  if (path === "/staff") return "staff";
  return "store";
}

export default function App() {
  const { t } = useI18n();
  const route = detectRoute();
  const [template, setTemplate] = useState<Template | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session>({ kind: "none" });

  useEffect(() => {
    if (route === "store") {
      api
        .getTemplate()
        .then(setTemplate)
        .catch(() => setError("load"));
    } else {
      Promise.all([api.getTemplate(), api.getUsers()])
        .then(([tpl, us]) => {
          setTemplate(tpl);
          setUsers(us);
        })
        .catch(() => setError("load"));
    }
  }, [route]);

  if (error) {
    return <CenterMessage title={t("common.error")} body={t("common.load_failed")} />;
  }
  if (!template) {
    return <CenterMessage title="PERA" body={t("common.loading")} />;
  }

  // Public storefront
  if (route === "store") {
    return <Store template={template} />;
  }

  // Staff / Admin: login flow
  if (session.kind === "none") {
    return (
      <LoginScreen
        route={route === "admin" ? "admin" : "employee"}
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
