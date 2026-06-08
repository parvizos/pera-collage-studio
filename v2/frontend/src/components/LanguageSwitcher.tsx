import { useI18n } from "../i18n";
import { LANGS, type Lang } from "../i18n/translations";

/** Compact language dropdown. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <select
      aria-label="Language"
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      className={`cursor-pointer rounded-full border border-line bg-white px-2 py-1.5 text-sm text-ink/70 hover:border-ink/40 focus:outline-none ${className}`}
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
