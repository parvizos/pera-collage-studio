import { useMemo, useState } from "react";
import type { Brand, CollageState, HistoryRecord, Template, User } from "../api/types";
import { CollageEditor } from "../components/CollageEditor";
import { CollageCanvas } from "../components/CollageCanvas";
import { EmployeeHistory } from "./EmployeeHistory";
import { renderCollage } from "../render/renderer";
import { api } from "../api/client";
import { LabelScanner } from "../components/LabelScanner";
import type { ParsedLabel } from "../lib/scanLabel";
import {
  buildDefaultFieldValues,
  buildDefaultState,
  resolveTemplateIdForBrand,
} from "../render/state";

interface Props {
  template: Template;
  user: User;
  pin: string;
  onLogout: () => void;
}

type SaveStatus = { kind: "idle" | "saving" | "ok" | "error"; message?: string };

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

function makeProductId(): string {
  return `product_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function EmployeeApp({ template, user, pin, onLogout }: Props) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle" });
  const [view, setView] = useState<"compose" | "history">("compose");
  const [step, setStep] = useState<1 | 2>(1);
  const [state, setState] = useState<CollageState>(() => buildDefaultState(template, user));
  const [scannerIndex, setScannerIndex] = useState<number | null>(null);

  function fillFromParsed(index: number, parsed: ParsedLabel) {
    const filled = Object.entries(parsed).filter(([, v]) => v);
    if (filled.length === 0) return;
    setState((prev) => {
      const products = (prev.products ?? []).map((p, i) => {
        if (i !== index) return p;
        const values = { ...p.values };
        for (const [k, v] of filled) if (v) values[k] = v as string;
        return { ...p, values };
      });
      return { ...prev, products, values: products[0]?.values ?? prev.values };
    });
  }

  function reopenRecord(record: HistoryRecord) {
    const s = record.state;
    if (s) {
      setState({
        photoTemplateId: s.photoTemplateId,
        brandId: s.brandId ?? null,
        values: s.values ?? {},
        photos: s.photos ?? [],
        photoTransforms: s.photoTransforms ?? [],
        products: s.products?.length ? s.products : [{ id: "product_0", values: s.values ?? {} }],
      });
    }
    setSaveStatus({ kind: "idle" });
    setView("compose");
    setStep(2);
  }

  const allowedBrands = useMemo<Brand[]>(() => {
    if (user.brandIds?.length) {
      const list = template.brands.filter((b) => user.brandIds.includes(b.id));
      if (list.length) return list;
    }
    return template.brands;
  }, [template.brands, user.brandIds]);

  const currentBrand = useMemo(
    () => template.brands.find((b) => b.id === state.brandId) ?? null,
    [template.brands, state.brandId],
  );

  const availableTemplates = useMemo(() => {
    if (currentBrand?.templateIds?.length) {
      return template.photoTemplates.filter((t) => currentBrand.templateIds.includes(t.id));
    }
    return template.photoTemplates;
  }, [template.photoTemplates, currentBrand]);

  const multiEnabled = !!template.multiProduct?.enabled;
  const maxCount = Math.max(1, template.multiProduct?.maxCount ?? 1);
  const products = state.products ?? [];
  const productCount = Math.max(1, products.length);
  const isMulti = multiEnabled && productCount > 1;

  function setProductField(index: number, fieldId: string, value: string) {
    setState((prev) => {
      const next = (prev.products ?? []).map((p, i) =>
        i === index ? { ...p, values: { ...p.values, [fieldId]: value } } : p,
      );
      return { ...prev, products: next, values: next[0]?.values ?? prev.values };
    });
  }

  function setProductCount(n: number) {
    setState((prev) => {
      const brand = template.brands.find((b) => b.id === prev.brandId) ?? null;
      let next = [...(prev.products ?? [])];
      if (n > next.length) {
        while (next.length < n) {
          next.push({ id: makeProductId(), values: buildDefaultFieldValues(template, brand) });
        }
      } else if (n < next.length) {
        next = next.slice(0, n);
      }
      return { ...prev, products: next, values: next[0]?.values ?? prev.values };
    });
  }

  function changeBrand(brandId: string) {
    const brand = template.brands.find((b) => b.id === brandId) ?? null;
    const photoTemplateId = resolveTemplateIdForBrand(template, brand);
    const values = buildDefaultFieldValues(template, brand);
    setState((prev) => {
      const count = Math.max(1, prev.products?.length ?? 1);
      const next = Array.from({ length: count }, (_, i) => ({
        id: prev.products?.[i]?.id ?? makeProductId(),
        values: { ...values },
      }));
      return { ...prev, brandId, photoTemplateId, values, products: next };
    });
  }

  function changeTemplate(photoTemplateId: string) {
    setState((prev) => ({ ...prev, photoTemplateId }));
  }

  async function uploadPhoto(index: number, file: File | undefined) {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setState((prev) => {
      const photos = [...(prev.photos ?? [])];
      photos[index] = dataUrl;
      const transforms = [...(prev.photoTransforms ?? [])];
      transforms[index] = { scale: 1, offsetX: 0, offsetY: 0 };
      return { ...prev, photos, photoTransforms: transforms };
    });
  }

  async function renderToDataUrl(): Promise<string> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas недоступен");
    await renderCollage(ctx, template, state);
    return canvas.toDataURL("image/png");
  }

  function templateName(): string {
    return template.photoTemplates.find((t) => t.id === state.photoTemplateId)?.name ?? "";
  }

  function productLabel(): string {
    const codes = (state.products ?? [])
      .map((p) => (p.values.code || "").trim())
      .filter(Boolean);
    return codes.length ? codes.join("-") : (state.values.code || "collage").trim();
  }

  function triggerDownload(dataUrl: string) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${productLabel()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function handleSave() {
    setSaveStatus({ kind: "saving" });
    try {
      const imageDataUrl = await renderToDataUrl();
      await api.saveCollage(
        {
          createdAt: new Date().toISOString(),
          userId: user.id,
          userName: user.name,
          brandId: state.brandId,
          brandName: currentBrand?.name ?? null,
          templateId: state.photoTemplateId,
          templateName: templateName(),
          imageDataUrl,
          state,
        },
        { userId: user.id, pin },
      );
      // Saved to history — also download the file automatically.
      triggerDownload(imageDataUrl);
      setSaveStatus({ kind: "ok", message: "Сохранено в историю и скачано" });
    } catch (e) {
      setSaveStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Не удалось сохранить",
      });
    }
  }

  async function handleDownload() {
    try {
      triggerDownload(await renderToDataUrl());
    } catch {
      setSaveStatus({ kind: "error", message: "Не удалось подготовить файл" });
    }
  }

  function renderFields(index: number) {
    const vals = products[index]?.values ?? state.values;
    return (
      <div className="space-y-4">
        {template.labelScanner?.enabledForEmployees && (
          <div className="rounded-xl border border-dashed border-clay/40 bg-clay/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-ink/70">Заполнить вручную ниже или отсканировать наклейку:</span>
              <button className="btn-clay" onClick={() => setScannerIndex(index)}>
                📷 Сканировать наклейку
              </button>
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {template.fields.map((field) => (
          <div key={field.id}>
            <label className="field-label">{field.label}</label>
            {field.inputType === "select" && field.options?.length ? (
              <select
                className="input"
                value={vals[field.id] ?? ""}
                onChange={(e) => setProductField(index, field.id, e.target.value)}
              >
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                value={vals[field.id] ?? ""}
                onChange={(e) => setProductField(index, field.id, e.target.value)}
              />
            )}
          </div>
        ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/80 px-6 py-3 backdrop-blur">
        <div className="font-serif text-2xl">PERA</div>
        <div className="inline-flex rounded-full border border-line bg-sand p-1 text-sm font-semibold">
          {(["compose", "history"] as const).map((v) => (
            <button
              key={v}
              className={`rounded-full px-4 py-1.5 transition ${
                view === v ? "bg-ink text-white shadow" : "text-ink/60"
              }`}
              onClick={() => setView(v)}
            >
              {v === "compose" ? "Создать" : "История"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-ink/60 sm:inline">{user.name}</span>
          <button className="btn-ghost" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </header>

      {view === "history" ? (
        <EmployeeHistory userId={user.id} onReopen={reopenRecord} />
      ) : (
        <main className="mx-auto max-w-6xl space-y-6 p-6">
          {/* Steps */}
          <div className="flex items-center justify-center gap-2">
            <button
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${step === 1 ? "bg-ink text-white" : "bg-white text-ink/60 ring-1 ring-line"}`}
              onClick={() => setStep(1)}
            >
              <span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${step === 1 ? "bg-white text-ink" : "bg-ink/10"}`}>1</span>
              Данные
            </button>
            <div className="h-px w-8 bg-line" />
            <button
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${step === 2 ? "bg-ink text-white" : "bg-white text-ink/60 ring-1 ring-line"}`}
              onClick={() => setStep(2)}
            >
              <span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${step === 2 ? "bg-white text-ink" : "bg-ink/10"}`}>2</span>
              Фото
            </button>
          </div>

          {step === 1 ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_minmax(300px,360px)]">
              <section className="space-y-6">
                <div className="card p-5">
                  <h2 className="mb-4 font-serif text-xl">Параметры</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {allowedBrands.length > 0 && (
                      <div>
                        <label className="field-label">Бренд</label>
                        <select className="input" value={state.brandId ?? ""} onChange={(e) => changeBrand(e.target.value)}>
                          {allowedBrands.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="field-label">Шаблон</label>
                      <select className="input" value={state.photoTemplateId} onChange={(e) => changeTemplate(e.target.value)}>
                        {availableTemplates.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {multiEnabled && maxCount > 1 && (
                    <div className="mt-4">
                      <label className="field-label">Количество товаров</label>
                      <div className="inline-flex rounded-full border border-line bg-sand p-1">
                        {Array.from({ length: maxCount }, (_, i) => i + 1).map((n) => (
                          <button key={n} className={`h-9 w-10 rounded-full text-sm font-semibold transition ${productCount === n ? "bg-ink text-white shadow" : "text-ink/60 hover:text-ink"}`} onClick={() => setProductCount(n)}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {!isMulti ? (
                  <div className="card p-5">
                    <h2 className="mb-4 font-serif text-xl">Данные товара</h2>
                    {renderFields(0)}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {products.map((product, index) => (
                      <div key={product.id} className="card p-5">
                        <h2 className="mb-4 font-serif text-xl">Товар {index + 1}</h2>
                        {renderFields(index)}
                      </div>
                    ))}
                  </div>
                )}

                <button className="btn-primary w-full sm:w-auto" onClick={() => setStep(2)}>
                  Далее: фото →
                </button>
              </section>

              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="card overflow-hidden p-3">
                  <CollageCanvas template={template} state={state} className="rounded-lg" />
                  <p className="mt-2 text-center text-xs text-ink/40">Предпросмотр</p>
                </div>
              </aside>
            </div>
          ) : (
            <div className="mx-auto max-w-md space-y-4">
              <div className="card overflow-hidden p-3">
                <CollageEditor template={template} state={state} onChange={setState} onUploadPhoto={(i, f) => uploadPhoto(i, f)} />
                <p className="mt-2 text-center text-xs text-ink/40">
                  Дважды нажмите на отсек — загрузить фото · перетаскивайте — двигать · колесо — масштаб
                </p>
              </div>

              <div className="card space-y-3 p-4">
                <button className="btn-primary w-full" onClick={handleSave} disabled={saveStatus.kind === "saving"}>
                  {saveStatus.kind === "saving" ? "Сохранение…" : "Сохранить и скачать"}
                </button>
                <div className="flex gap-2">
                  <button className="btn-ghost flex-1" onClick={() => setStep(1)}>
                    ← Назад
                  </button>
                  <button className="btn-ghost flex-1" onClick={handleDownload}>
                    Скачать PNG
                  </button>
                </div>
                {saveStatus.message && (
                  <p className={`text-center text-sm font-medium ${saveStatus.kind === "error" ? "text-red-600" : "text-green-600"}`}>
                    {saveStatus.message}
                  </p>
                )}
              </div>
            </div>
          )}
        </main>
      )}

      {scannerIndex !== null && (
        <LabelScanner
          onClose={() => setScannerIndex(null)}
          onResult={(parsed) => {
            const i = scannerIndex;
            setScannerIndex(null);
            if (i !== null) fillFromParsed(i, parsed);
          }}
        />
      )}
    </div>
  );
}
