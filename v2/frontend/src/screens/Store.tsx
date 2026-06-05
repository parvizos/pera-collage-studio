import type { Template } from "../api/types";

interface Props {
  template: Template;
}

export function Store({ template }: Props) {
  const store = template.store as Record<string, unknown>;
  const title = (store.title as string) || "PERA";
  const subtitle = (store.subtitle as string) || "ISTANBUL";
  const logo = store.logo as string | null;

  return (
    <div className="min-h-screen bg-sand">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt={title} className="h-9 w-auto" />
            ) : (
              <div className="leading-none">
                <div className="font-serif text-2xl tracking-tight">{title}</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-ink/50">
                  {subtitle}
                </div>
              </div>
            )}
          </a>
          <nav className="flex items-center gap-4 text-sm text-ink/60">
            <a href="https://instagram.com/peraistanbulstore" target="_blank" rel="noreferrer" className="hover:text-ink">
              Instagram
            </a>
            <a href="/staff" className="rounded-full border border-line px-3 py-1.5 font-medium hover:border-ink/40">
              Вход для сотрудников
            </a>
          </nav>
        </div>
      </header>

      {/* Placeholder */}
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid min-h-[50vh] place-items-center rounded-2xl border border-dashed border-line bg-white/50 p-10 text-center">
          <div>
            <div className="font-serif text-3xl">Витрина магазина</div>
            <p className="mx-auto mt-3 max-w-md text-ink/55">
              Здесь скоро появятся товары. Каталог наполняется из того, что отмечает администратор.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-ink/40">
        © {new Date().getFullYear()} {title} {subtitle}
      </footer>
    </div>
  );
}
