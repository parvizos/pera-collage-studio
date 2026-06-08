import { useState } from "react";
import type { FieldDef, Template } from "../../api/types";
import { api, ApiError } from "../../api/client";
import { useI18n } from "../../i18n";

interface Props {
  template: Template;
  adminPin: string;
  onTemplateChange: (t: Template) => void;
}

function newFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function FieldsSection({ template, adminPin, onTemplateChange }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<FieldDef[]>(() =>
    template.fields.map((f) => ({ ...f, options: [...(f.options ?? [])] })),
  );
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "ok" | "error"; msg?: string }>({
    kind: "idle",
  });

  function patch(index: number, p: Partial<FieldDef>) {
    setDraft((prev) => prev.map((f, i) => (i === index ? { ...f, ...p } : f)));
    setStatus({ kind: "idle" });
  }

  function move(index: number, dir: -1 | 1) {
    setDraft((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setStatus({ kind: "idle" });
  }

  function setOption(fieldIndex: number, optIndex: number, value: string) {
    setDraft((prev) =>
      prev.map((f, i) =>
        i === fieldIndex ? { ...f, options: f.options.map((o, j) => (j === optIndex ? value : o)) } : f,
      ),
    );
    setStatus({ kind: "idle" });
  }

  function addOption(fieldIndex: number) {
    setDraft((prev) =>
      prev.map((f, i) => (i === fieldIndex ? { ...f, options: [...f.options, ""] } : f)),
    );
  }

  function removeOption(fieldIndex: number, optIndex: number) {
    setDraft((prev) =>
      prev.map((f, i) =>
        i === fieldIndex ? { ...f, options: f.options.filter((_, j) => j !== optIndex) } : f,
      ),
    );
  }

  function addField() {
    setDraft((prev) => [
      ...prev,
      { id: newFieldId(), label: t("adm.new_field"), inputType: "text", defaultValue: "", options: [] },
    ]);
    setStatus({ kind: "idle" });
  }

  function removeField(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index));
    setStatus({ kind: "idle" });
  }

  async function save() {
    setStatus({ kind: "saving" });
    try {
      const cleaned = draft.map((f) => ({
        ...f,
        options: f.inputType === "select" ? f.options.filter((o) => o.trim() !== "") : [],
      }));
      const next: Template = { ...template, fields: cleaned };
      await api.saveTemplate(next, adminPin);
      onTemplateChange(next);
      setDraft(cleaned.map((f) => ({ ...f, options: [...f.options] })));
      setStatus({ kind: "ok", msg: t("common.saved") });
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 401 ? t("common.no_access") : t("common.save_fail");
      setStatus({ kind: "error", msg });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl">{t("adm.fields_title")}</h1>
          <p className="text-sm text-ink/50">{t("adm.fields_sub")}</p>
        </div>
        <button className="btn-ghost" onClick={addField}>
          {t("common.add")}
        </button>
      </div>

      <div className="space-y-4">
        {draft.map((field, index) => (
          <div key={field.id} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <code className="rounded bg-sand px-2 py-0.5 text-xs text-ink/50">{field.id}</code>
              <div className="flex items-center gap-1">
                <button
                  className="rounded px-2 py-1 text-sm text-ink/50 hover:bg-sand disabled:opacity-30"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  className="rounded px-2 py-1 text-sm text-ink/50 hover:bg-sand disabled:opacity-30"
                  onClick={() => move(index, 1)}
                  disabled={index === draft.length - 1}
                >
                  ↓
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="field-label">{t("adm.f_name")}</label>
                <input
                  className="input"
                  value={field.label}
                  onChange={(e) => patch(index, { label: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">{t("adm.f_type")}</label>
                <select
                  className="input"
                  value={field.inputType}
                  onChange={(e) => patch(index, { inputType: e.target.value })}
                >
                  <option value="text">{t("adm.f_type_text")}</option>
                  <option value="select">{t("adm.f_type_select")}</option>
                </select>
              </div>
              <div>
                <label className="field-label">{t("adm.f_default")}</label>
                <input
                  className="input"
                  value={field.defaultValue}
                  onChange={(e) => patch(index, { defaultValue: e.target.value })}
                />
              </div>
            </div>

            {field.inputType === "select" && (
              <div className="mt-4">
                <label className="field-label">{t("adm.f_options")}</label>
                <div className="space-y-2">
                  {field.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <input
                        className="input"
                        value={opt}
                        onChange={(e) => setOption(index, optIndex, e.target.value)}
                      />
                      <button
                        className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                        onClick={() => removeOption(index, optIndex)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button className="text-sm font-medium text-ink/60 hover:underline" onClick={() => addOption(index)}>
                    {t("adm.f_add_option")}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                className="text-sm font-medium text-red-600 hover:underline"
                onClick={() => removeField(index)}
              >
                {t("adm.field_delete")}
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
          {status.kind === "saving" ? t("common.saving") : t("common.save_changes")}
        </button>
      </div>
    </div>
  );
}
