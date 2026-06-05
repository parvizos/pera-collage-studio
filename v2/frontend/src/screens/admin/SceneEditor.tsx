import { useMemo, useRef, useState } from "react";
import type { Block, CollageState, Template, TextBinding } from "../../api/types";
import { CollageCanvas } from "../../components/CollageCanvas";
import { resolveScene } from "../../render/scene";
import { buildDefaultState, buildDefaultFieldValues } from "../../render/state";
import { api, ApiError } from "../../api/client";

interface Props {
  template: Template;
  adminPin: string;
  onTemplateChange: (t: Template) => void;
}

const BLOCK_LABELS: Record<string, string> = {
  header: "Шапка (фон)",
  footer: "Подвал (фон)",
  headerLogo: "Логотип / название",
  leftBadge: "Бейдж слева",
  rightBadge: "Бейдж справа",
  brandPlate: "Плашка бренда",
  textLeft: "Текст слева",
  textCenterTop: "Текст центр (верх)",
  textCenterBottom: "Текст центр (низ)",
  priceBox: "Цена",
};

const STRUCTURAL = new Set(["header", "footer", "headerLogo", "leftBadge", "rightBadge"]);
const TEXT_KEYS = new Set(["textLeft", "textCenterTop", "textCenterBottom", "priceBox"]);

const THEME_FIELDS: { key: string; label: string }[] = [
  { key: "headerBackground", label: "Фон шапки" },
  { key: "footerBackground", label: "Фон подвала" },
  { key: "storeTextColor", label: "Текст магазина" },
  { key: "brandTextColor", label: "Текст бренда" },
  { key: "footerTextColor", label: "Текст подвала" },
  { key: "priceTextColor", label: "Текст цены" },
];

const LAYOUT_KEYS = ["single", "2", "3", "4"] as const;
type LayoutKey = (typeof LAYOUT_KEYS)[number];

function layoutLabel(k: LayoutKey): string {
  return k === "single" ? "1 товар" : `${k} товара`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

interface Geom {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragState {
  mode: "move" | "resize";
  startX: number;
  startY: number;
  gx: number;
  gy: number;
  gw: number;
  gh: number;
  sf: number;
  apply: (patch: Partial<Geom>) => void;
}

type ContentType = "none" | "static" | "field";

function contentTypeOf(binding: TextBinding | undefined): ContentType {
  if (!binding) return "none";
  if (binding.type === "static") return "static";
  if (binding.type === "field" || binding.primary) return "field";
  return "none";
}

export function SceneEditor({ template, adminPin, onTemplateChange }: Props) {
  const [draft, setDraft] = useState<Template>(() => structuredClone(template));
  const [templateId, setTemplateId] = useState<string>(
    () => template.photoTemplates[0]?.id ?? "template_1",
  );
  const [layoutKey, setLayoutKey] = useState<LayoutKey>("single");
  const [editLayer, setEditLayer] = useState<"blocks" | "photos">("blocks");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "ok" | "error"; msg?: string }>({
    kind: "idle",
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const productCount = layoutKey === "single" ? 1 : Number(layoutKey);

  const previewState = useMemo<CollageState>(() => {
    const base = buildDefaultState(draft, null);
    const values = buildDefaultFieldValues(draft, null);
    return {
      ...base,
      photoTemplateId: templateId,
      products: Array.from({ length: productCount }, (_, i) => ({
        id: `p${i}`,
        values: { ...values, code: `${values.code || "КОД"}-${i + 1}` },
      })),
    };
  }, [draft, templateId, productCount]);

  const scene = useMemo(() => resolveScene(draft, previewState), [draft, previewState]);
  const canvasW = draft.canvas.width;
  const canvasH = scene.canvasHeight;

  const blockEntries = useMemo(() => Object.entries(scene.blocks).filter(([, b]) => b), [scene.blocks]);
  const selectedBlock = selected ? scene.blocks[selected] : null;
  const selectedBinding = selected ? scene.textBindings[selected] : undefined;
  const store = draft.store as Record<string, unknown>;
  const theme = draft.theme as Record<string, string>;
  const cell = editLayer === "photos" && selectedCell != null ? scene.photoCells[selectedCell] : null;

  function blockLabel(key: string): string {
    const b = scene.blocks[key];
    return b?.name || BLOCK_LABELS[key] || (key.startsWith("custom-") ? "Свой блок" : key);
  }

  function isTextual(key: string): boolean {
    return TEXT_KEYS.has(key) || key === "brandPlate" || scene.blocks[key]?.kind === "custom-text";
  }

  // ---- generic slice mutation -------------------------------------------
  function mutateSlice(fn: (slice: { blocks: Record<string, Block>; blockOrder: string[]; textBindings: Record<string, TextBinding>; textStyles: Record<string, { color?: string; align?: string }> }) => void) {
    setDraft((prev) => {
      const next = structuredClone(prev);
      const scenes = next.templateScenes?.[templateId];
      if (!scenes) return prev;
      const layouts = scenes.layouts;
      const slice = (
        layouts
          ? layoutKey === "single"
            ? layouts.single
            : layouts.byCount?.[layoutKey]
          : scenes // legacy flat scene = the single layout itself
      ) as unknown as
        | { blocks: Record<string, Block>; blockOrder: string[]; textBindings: Record<string, TextBinding>; textStyles: Record<string, { color?: string; align?: string }> }
        | undefined;
      if (!slice) return prev;
      slice.blocks = slice.blocks || {};
      slice.blockOrder = slice.blockOrder || [];
      slice.textBindings = slice.textBindings || {};
      slice.textStyles = slice.textStyles || {};
      fn(slice);
      return next;
    });
    setStatus({ kind: "idle" });
  }

  function updateBlock(key: string, patch: Partial<Block>) {
    mutateSlice((slice) => {
      if (slice.blocks[key]) slice.blocks[key] = { ...slice.blocks[key], ...patch };
    });
  }

  function setBinding(key: string, patch: Partial<TextBinding>) {
    mutateSlice((slice) => {
      slice.textBindings[key] = { ...(slice.textBindings[key] ?? {}), ...patch };
    });
  }

  function setStyle(key: string, patch: { color?: string; align?: string }) {
    mutateSlice((slice) => {
      slice.textStyles[key] = { ...(slice.textStyles[key] ?? {}), ...patch };
    });
  }

  function setContentType(key: string, type: ContentType) {
    mutateSlice((slice) => {
      const block = slice.blocks[key];
      if (type === "none") {
        delete slice.textBindings[key];
        if (block?.kind === "custom-text") block.kind = "custom-shape";
      } else {
        if (block && block.kind?.startsWith("custom")) block.kind = "custom-text";
        const prev = slice.textBindings[key] ?? {};
        slice.textBindings[key] =
          type === "static"
            ? { type: "static", text: prev.text ?? "Текст" }
            : { type: "field", primary: prev.primary || draft.fields[0]?.id || "", productIndex: prev.productIndex ?? 0 };
      }
    });
  }

  function renameBlock(key: string, name: string) {
    updateBlock(key, { name });
  }

  function deleteBlock(key: string) {
    mutateSlice((slice) => {
      delete slice.blocks[key];
      slice.blockOrder = slice.blockOrder.filter((k) => k !== key);
      delete slice.textBindings[key];
      delete slice.textStyles[key];
    });
    setSelected(null);
  }

  function addBlock(kind: "field" | "static" | "shape" | "image") {
    const key = `custom-${Date.now()}`;
    mutateSlice((slice) => {
      slice.blocks[key] = {
        x: 80,
        y: 320,
        width: 360,
        height: 130,
        fill: kind === "shape" ? "#d47516" : "#111111",
        radius: 12,
        kind: kind === "shape" ? "custom-shape" : kind === "image" ? "custom-image" : "custom-text",
        name: kind === "field" ? "Переменная" : kind === "static" ? "Текст" : kind === "shape" ? "Фигура" : "Картинка",
        background: false,
        ...(kind === "image" ? { imageSrc: null } : {}),
      };
      slice.blockOrder.push(key);
      if (kind === "static") slice.textBindings[key] = { type: "static", text: "Текст" };
      if (kind === "field")
        slice.textBindings[key] = { type: "field", primary: draft.fields[0]?.id || "", productIndex: 0 };
      if (kind === "static" || kind === "field") slice.textStyles[key] = { color: "#ffffff", align: "center" };
    });
    setSelected(key);
    setEditLayer("blocks");
  }

  function duplicateBlock(key: string) {
    const src = scene.blocks[key];
    if (!src) return;
    const newKey = `custom-${Date.now()}`;
    mutateSlice((slice) => {
      slice.blocks[newKey] = {
        ...structuredClone(src),
        x: Math.min(canvasW - src.width, src.x + 24),
        y: Math.min(canvasH - src.height, src.y + 24),
        kind: src.kind?.startsWith("custom") ? src.kind : "custom-text",
        name: `${blockLabel(key)} (копия)`,
      };
      slice.blockOrder.push(newKey);
      if (slice.textBindings[key]) slice.textBindings[newKey] = structuredClone(slice.textBindings[key]);
      if (slice.textStyles[key]) slice.textStyles[newKey] = structuredClone(slice.textStyles[key]);
    });
    setSelected(newKey);
  }

  async function uploadCustomImage(key: string, file: File | undefined) {
    if (!file) return;
    updateBlock(key, { imageSrc: await fileToDataUrl(file) });
  }

  function addField(label: string): string {
    const id = `field_${Date.now()}`;
    setDraft((prev) => ({
      ...prev,
      fields: [...prev.fields, { id, label: label || "Новое поле", inputType: "text", defaultValue: "", options: [] }],
    }));
    return id;
  }

  // ---- photo cells ------------------------------------------------------
  function updateCell(index: number, patch: Partial<Geom & { fill: string; stroke: string; radius: number; borderWidth: number }>) {
    setDraft((prev) => {
      const next = structuredClone(prev);
      const scenes = next.templateScenes?.[templateId];
      if (!scenes?.photoLayout?.[index]) return prev;
      scenes.photoLayout[index] = { ...scenes.photoLayout[index], ...patch };
      return next;
    });
    setStatus({ kind: "idle" });
  }

  function addCell() {
    setDraft((prev) => {
      const next = structuredClone(prev);
      const scenes = next.templateScenes?.[templateId];
      if (!scenes) return prev;
      scenes.photoLayout = scenes.photoLayout || [];
      scenes.photoLayout.push({ x: 60, y: 240, width: 480, height: 600, fill: "#ffffff", stroke: "#d6c5b3", radius: 0, borderWidth: 2 });
      return next;
    });
    setStatus({ kind: "idle" });
  }

  function removeCell(index: number) {
    setDraft((prev) => {
      const next = structuredClone(prev);
      const scenes = next.templateScenes?.[templateId];
      if (!scenes?.photoLayout) return prev;
      scenes.photoLayout.splice(index, 1);
      return next;
    });
    setSelectedCell(null);
    setStatus({ kind: "idle" });
  }

  // ---- studio -----------------------------------------------------------
  function setStore(patch: Record<string, unknown>) {
    setDraft((prev) => ({ ...prev, store: { ...prev.store, ...patch } }));
    setStatus({ kind: "idle" });
  }
  function setTheme(patch: Record<string, string>) {
    setDraft((prev) => ({ ...prev, theme: { ...prev.theme, ...patch } }));
    setStatus({ kind: "idle" });
  }
  function setCanvas(patch: Partial<Template["canvas"]>) {
    setDraft((prev) => ({ ...prev, canvas: { ...prev.canvas, ...patch } }));
    setStatus({ kind: "idle" });
  }
  function setSliceHeight(height: number) {
    setDraft((prev) => {
      const next = structuredClone(prev);
      const scenes = next.templateScenes?.[templateId];
      if (!scenes) return prev;
      const layouts = scenes.layouts;
      const slice = (
        layouts
          ? layoutKey === "single"
            ? layouts.single
            : layouts.byCount?.[layoutKey]
          : scenes
      ) as unknown as { canvasHeight?: number } | undefined;
      if (!slice) return prev;
      slice.canvasHeight = height;
      return next;
    });
  }
  async function uploadStoreAsset(field: string, file: File | undefined) {
    if (!file) return;
    setStore({ [field]: await fileToDataUrl(file) });
  }

  // ---- photo templates --------------------------------------------------
  function addPhotoTemplate() {
    const id = `template_${Date.now()}`;
    setDraft((prev) => {
      const next = structuredClone(prev);
      const base = next.templateScenes?.[templateId] ?? next.templateScenes?.[next.photoTemplates[0]?.id];
      next.templateScenes = next.templateScenes || {};
      next.templateScenes[id] = base
        ? structuredClone(base)
        : { layouts: { single: { blocks: {}, blockOrder: [], textBindings: {}, textStyles: {} }, byCount: {} }, photoLayout: [] };
      next.photoTemplates = [...next.photoTemplates, { id, name: `Шаблон ${next.photoTemplates.length + 1}` }];
      return next;
    });
    setTemplateId(id);
    setSelected(null);
    setSelectedCell(null);
    setStatus({ kind: "idle" });
  }
  function renamePhotoTemplate(id: string, name: string) {
    setDraft((prev) => ({ ...prev, photoTemplates: prev.photoTemplates.map((p) => (p.id === id ? { ...p, name } : p)) }));
    setStatus({ kind: "idle" });
  }
  function removePhotoTemplate(id: string) {
    if (draft.photoTemplates.length <= 1) return;
    setDraft((prev) => {
      const next = structuredClone(prev);
      next.photoTemplates = next.photoTemplates.filter((p) => p.id !== id);
      if (next.templateScenes) delete next.templateScenes[id];
      next.brands = next.brands.map((b) => {
        const templateIds = (b.templateIds ?? []).filter((t) => t !== id);
        const defaultTemplateId = b.defaultTemplateId === id ? templateIds[0] ?? null : b.defaultTemplateId;
        return { ...b, templateIds, defaultTemplateId };
      });
      return next;
    });
    if (templateId === id) {
      const remaining = draft.photoTemplates.find((p) => p.id !== id);
      if (remaining) setTemplateId(remaining.id);
      setSelected(null);
      setSelectedCell(null);
    }
    setStatus({ kind: "idle" });
  }

  // ---- drag -------------------------------------------------------------
  function startDrag(mode: "move" | "resize", geom: Geom, apply: (patch: Partial<Geom>) => void, e: React.PointerEvent) {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, gx: geom.x, gy: geom.y, gw: geom.width, gh: geom.height, sf: canvasW / rect.width, apply };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) * d.sf;
    const dy = (e.clientY - d.startY) * d.sf;
    if (d.mode === "move") {
      d.apply({ x: Math.round(Math.max(0, Math.min(d.gx + dx, canvasW - d.gw))), y: Math.round(Math.max(0, Math.min(d.gy + dy, canvasH - d.gh))) });
    } else {
      d.apply({ width: Math.round(Math.max(20, Math.min(d.gw + dx, canvasW - d.gx))), height: Math.round(Math.max(20, Math.min(d.gh + dy, canvasH - d.gy))) });
    }
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  async function save() {
    setStatus({ kind: "saving" });
    try {
      await api.saveTemplate(draft, adminPin);
      onTemplateChange(draft);
      setStatus({ kind: "ok", msg: "Сохранено" });
    } catch (e) {
      setStatus({ kind: "error", msg: e instanceof ApiError && e.status === 401 ? "Нет доступа (PIN администратора)" : "Не удалось сохранить" });
    }
  }

  const contentType = contentTypeOf(selectedBinding);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl">Шаблоны</h1>
          <p className="text-sm text-ink/50">Соберите коллаж из блоков. Любой блок можно сделать переменной.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-auto" value={templateId} onChange={(e) => { setTemplateId(e.target.value); setSelected(null); setSelectedCell(null); }}>
            {draft.photoTemplates.map((pt) => (
              <option key={pt.id} value={pt.id}>{pt.name}</option>
            ))}
          </select>
          <select className="input w-auto" value={layoutKey} onChange={(e) => { setLayoutKey(e.target.value as LayoutKey); setSelected(null); setSelectedCell(null); }}>
            {LAYOUT_KEYS.map((k) => (
              <option key={k} value={k}>{layoutLabel(k)}</option>
            ))}
          </select>
        </div>
      </div>

      {productCount > 1 && (
        <div className="rounded-xl border border-clay/30 bg-clay/5 p-3 text-sm text-ink/70">
          Это макет для <b>{productCount} товаров</b>. Для каждого блока-переменной выберите «Товар №», чтобы он показывал данные нужного товара. Кнопка «Дублировать» поможет быстро размножить блок.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-line bg-white p-1 text-sm font-semibold">
          {(["blocks", "photos"] as const).map((l) => (
            <button key={l} className={`rounded-full px-4 py-1.5 transition ${editLayer === l ? "bg-ink text-white" : "text-ink/60"}`} onClick={() => { setEditLayer(l); setSelected(null); setSelectedCell(null); }}>
              {l === "blocks" ? "Блоки" : "Фото товара"}
            </button>
          ))}
        </div>
        {editLayer === "blocks" ? (
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => addBlock("field")}>+ Переменная</button>
            <button className="btn-ghost" onClick={() => addBlock("static")}>+ Текст</button>
            <button className="btn-ghost" onClick={() => addBlock("shape")}>+ Фигура</button>
            <button className="btn-ghost" onClick={() => addBlock("image")}>+ Картинка</button>
          </div>
        ) : (
          <button className="btn-ghost" onClick={addCell}>+ Фото товара</button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Canvas */}
        <div className="card p-3">
          <div ref={containerRef} className="relative mx-auto max-w-md select-none" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
            <CollageCanvas template={draft} state={previewState} showGuides className="rounded-lg" />
            <div className="absolute inset-0" onPointerDown={() => { setSelected(null); setSelectedCell(null); }}>
              {editLayer === "blocks" &&
                blockEntries.map(([key, block]) => {
                  const active = selected === key;
                  return (
                    <div key={key} className={`absolute ${active ? "ring-2 ring-clay" : "ring-1 ring-ink/20 hover:ring-ink/50"}`}
                      style={{ left: `${(block.x / canvasW) * 100}%`, top: `${(block.y / canvasH) * 100}%`, width: `${(block.width / canvasW) * 100}%`, height: `${(block.height / canvasH) * 100}%`, cursor: "move" }}
                      onPointerDown={(e) => { setSelected(key); startDrag("move", block, (p) => updateBlock(key, p), e); }}>
                      {active && (
                        <div className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 rounded-sm bg-clay" style={{ cursor: "nwse-resize" }} onPointerDown={(e) => startDrag("resize", block, (p) => updateBlock(key, p), e)} />
                      )}
                    </div>
                  );
                })}
              {editLayer === "photos" &&
                scene.photoCells.map((c, index) => {
                  const active = selectedCell === index;
                  return (
                    <div key={index} className={`absolute ${active ? "bg-blue-500/10 ring-2 ring-blue-500" : "ring-1 ring-blue-400/50 hover:ring-blue-500"}`}
                      style={{ left: `${(c.x / canvasW) * 100}%`, top: `${(c.y / canvasH) * 100}%`, width: `${(c.width / canvasW) * 100}%`, height: `${(c.height / canvasH) * 100}%`, cursor: "move" }}
                      onPointerDown={(e) => { setSelectedCell(index); startDrag("move", c, (p) => updateCell(index, p), e); }}>
                      <span className="absolute left-1 top-1 rounded bg-blue-500 px-1.5 text-xs font-bold text-white">{index + 1}</span>
                      {active && (
                        <div className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 rounded-sm bg-blue-500" style={{ cursor: "nwse-resize" }} onPointerDown={(e) => startDrag("resize", c, (p) => updateCell(index, p), e)} />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-ink/40">Кликните блок, тяните для перемещения, угол — для размера</p>

          {/* Block list */}
          {editLayer === "blocks" && (
            <div className="mt-3 max-h-48 space-y-1 overflow-auto border-t border-line pt-3">
              {blockEntries.map(([key, block]) => (
                <button key={key} onClick={() => setSelected(key)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm ${selected === key ? "bg-ink text-white" : "hover:bg-sand"}`}>
                  <span className="truncate">{blockLabel(key)}</span>
                  <span className={`ml-2 shrink-0 text-xs ${selected === key ? "text-white/60" : "text-ink/30"}`}>
                    {isTextual(key) ? (contentTypeOf(scene.textBindings[key]) === "field" ? "перем." : contentTypeOf(scene.textBindings[key]) === "static" ? "текст" : "") : block.kind === "custom-image" ? "карт." : ""}
                    {block.hidden ? " скрыт" : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Properties */}
        <div className="space-y-4">
          {editLayer === "photos" ? (
            !cell ? (
              <div className="card p-5 text-sm text-ink/50">Выберите фото товара на холсте</div>
            ) : (
              <div className="card space-y-4 p-5">
                <div className="text-sm font-semibold">Фото товара {selectedCell! + 1}</div>
                <div className="grid grid-cols-2 gap-2">
                  {(["x", "y", "width", "height"] as const).map((prop) => (
                    <div key={prop}>
                      <label className="field-label">{prop}</label>
                      <input type="number" className="input" value={Math.round((cell[prop] as number) ?? 0)} onChange={(e) => updateCell(selectedCell!, { [prop]: Number(e.target.value) })} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="field-label">Рамка (px)</label>
                    <input type="number" className="input" value={Math.round(cell.borderWidth ?? 0)} onChange={(e) => updateCell(selectedCell!, { borderWidth: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="field-label">Скругление</label>
                    <input type="number" className="input" value={Math.round(cell.radius ?? 0)} onChange={(e) => updateCell(selectedCell!, { radius: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="field-label">Цвет рамки</label>
                    <input type="color" className="h-9 w-full rounded border border-line" value={cell.stroke || "#d6c5b3"} onChange={(e) => updateCell(selectedCell!, { stroke: e.target.value })} />
                  </div>
                </div>
                <button className="text-sm font-medium text-red-600 hover:underline" onClick={() => removeCell(selectedCell!)}>Удалить фото</button>
              </div>
            )
          ) : !selectedBlock ? (
            <div className="card p-5 text-sm text-ink/50">Выберите блок на холсте или в списке</div>
          ) : (
            <div className="card space-y-4 p-5">
              <div>
                <label className="field-label">Название блока</label>
                <input className="input" value={selectedBlock.name ?? BLOCK_LABELS[selected!] ?? ""} placeholder={blockLabel(selected!)} onChange={(e) => renameBlock(selected!, e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(["x", "y", "width", "height"] as const).map((prop) => (
                  <div key={prop}>
                    <label className="field-label">{prop}</label>
                    <input type="number" className="input" value={Math.round(selectedBlock[prop] ?? 0)} onChange={(e) => updateBlock(selected!, { [prop]: Number(e.target.value) })} />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="field-label">Заливка</label>
                  <input type="color" className="h-9 w-full rounded border border-line" value={selectedBlock.fill || "#ffffff"} onChange={(e) => updateBlock(selected!, { fill: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Скругление</label>
                  <input type="number" className="input" value={Math.round(selectedBlock.radius ?? 0)} onChange={(e) => updateBlock(selected!, { radius: Number(e.target.value) })} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-ink/70">
                <input type="checkbox" checked={!!selectedBlock.hidden} onChange={(e) => updateBlock(selected!, { hidden: e.target.checked })} />
                Скрыть блок
              </label>

              {/* Content */}
              {(isTextual(selected!) || selectedBlock.kind?.startsWith("custom")) && !STRUCTURAL.has(selected!) && (
                <div className="space-y-3 border-t border-line pt-3">
                  <div>
                    <label className="field-label">Содержимое</label>
                    <select className="input" value={contentType} onChange={(e) => setContentType(selected!, e.target.value as ContentType)}>
                      <option value="none">Без текста (фон/фигура)</option>
                      <option value="static">Статичный текст</option>
                      <option value="field">Переменная (поле товара)</option>
                    </select>
                  </div>

                  {contentType === "static" && (
                    <input className="input" placeholder="Введите текст" value={selectedBinding?.text ?? ""} onChange={(e) => setBinding(selected!, { type: "static", text: e.target.value })} />
                  )}

                  {contentType === "field" && (
                    <>
                      <div>
                        <label className="field-label">Поле (переменная)</label>
                        <select className="input" value={selectedBinding?.primary ?? ""} onChange={(e) => setBinding(selected!, { type: "field", primary: e.target.value })}>
                          <option value="">— выберите —</option>
                          {draft.fields.map((f) => (
                            <option key={f.id} value={f.id}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <input className="input" placeholder="новое поле…" value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} />
                        <button className="btn-ghost shrink-0" onClick={() => { if (!newFieldLabel.trim()) return; const id = addField(newFieldLabel.trim()); setBinding(selected!, { type: "field", primary: id }); setNewFieldLabel(""); }}>+ поле</button>
                      </div>
                      {productCount > 1 && (
                        <div>
                          <label className="field-label">Товар №</label>
                          <select className="input" value={selectedBinding?.productIndex ?? 0} onChange={(e) => setBinding(selected!, { productIndex: Number(e.target.value) })}>
                            {Array.from({ length: productCount }, (_, i) => (
                              <option key={i} value={i}>Товар {i + 1}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  {contentType !== "none" && (
                    <>
                      <label className="flex items-center gap-2 text-sm text-ink/70">
                        <input type="checkbox" checked={!!selectedBlock.background} onChange={(e) => updateBlock(selected!, { background: e.target.checked })} />
                        Подложка (фон под текстом)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="field-label">Цвет текста</label>
                          <input type="color" className="h-9 w-full rounded border border-line" value={scene.textStyles[selected!]?.color || "#121212"} onChange={(e) => setStyle(selected!, { color: e.target.value })} />
                        </div>
                        <div>
                          <label className="field-label">Выравнивание</label>
                          <select className="input" value={scene.textStyles[selected!]?.align || "left"} onChange={(e) => setStyle(selected!, { align: e.target.value })}>
                            <option value="left">Слева</option>
                            <option value="center">По центру</option>
                            <option value="right">Справа</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {selectedBlock.kind === "custom-image" && (
                <div className="space-y-2 border-t border-line pt-3">
                  <div className="text-xs font-semibold uppercase text-ink/40">Картинка</div>
                  <div className="relative aspect-video overflow-hidden rounded-lg border border-line bg-sand">
                    {selectedBlock.imageSrc ? (
                      <img src={selectedBlock.imageSrc} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-ink/30">нет картинки</div>
                    )}
                    <label className="absolute inset-x-0 bottom-0 cursor-pointer bg-black/40 py-0.5 text-center text-xs font-semibold text-white hover:bg-black/60">
                      Загрузить
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadCustomImage(selected!, e.target.files?.[0])} />
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-line pt-3">
                <button className="text-sm font-medium text-ink/60 hover:underline" onClick={() => duplicateBlock(selected!)}>Дублировать</button>
                <button className="text-sm font-medium text-red-600 hover:underline" onClick={() => deleteBlock(selected!)}>Удалить блок</button>
              </div>
            </div>
          )}

          <div className="card flex items-center justify-between gap-3 p-4">
            {status.msg && (
              <span className={`text-sm font-medium ${status.kind === "error" ? "text-red-600" : "text-green-600"}`}>{status.msg}</span>
            )}
            <button className="btn-primary ml-auto" onClick={save} disabled={status.kind === "saving"}>
              {status.kind === "saving" ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </div>
      </div>

      {/* Studio */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card space-y-3 p-5">
          <h2 className="font-serif text-lg">Магазин</h2>
          <div>
            <label className="field-label">Название</label>
            <input className="input" value={(store.title as string) ?? ""} onChange={(e) => setStore({ title: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Подпись</label>
            <input className="input" value={(store.subtitle as string) ?? ""} onChange={(e) => setStore({ subtitle: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Размер названия</label>
              <input type="number" className="input" value={Number(store.titleSize ?? 74)} onChange={(e) => setStore({ titleSize: Number(e.target.value) })} />
            </div>
            <div>
              <label className="field-label">Размер подписи</label>
              <input type="number" className="input" value={Number(store.subtitleSize ?? 26)} onChange={(e) => setStore({ subtitleSize: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["logo", "leftBadge", "rightBadge"] as const).map((field) => {
              const label = field === "logo" ? "Логотип" : field === "leftBadge" ? "Бейдж слева" : "Бейдж справа";
              const value = store[field] as string | null;
              return (
                <div key={field}>
                  <label className="field-label">{label}</label>
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-sand">
                    {value ? <img src={value} alt="" className="h-full w-full object-contain p-1" /> : <div className="flex h-full items-center justify-center text-[10px] text-ink/30">нет</div>}
                    <label className="absolute inset-x-0 bottom-0 cursor-pointer bg-black/40 py-0.5 text-center text-[10px] font-semibold text-white hover:bg-black/60">
                      файл
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadStoreAsset(field, e.target.files?.[0])} />
                    </label>
                  </div>
                  {value && <button className="mt-1 w-full text-[10px] text-red-600 hover:underline" onClick={() => setStore({ [field]: null })}>убрать</button>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card space-y-3 p-5">
          <h2 className="font-serif text-lg">Тема оформления</h2>
          {THEME_FIELDS.map((tf) => (
            <div key={tf.key} className="flex items-center justify-between">
              <span className="text-sm text-ink/70">{tf.label}</span>
              <input type="color" className="h-8 w-14 rounded border border-line" value={theme[tf.key] || "#ffffff"} onChange={(e) => setTheme({ [tf.key]: e.target.value })} />
            </div>
          ))}
        </div>

        <div className="card space-y-3 p-5">
          <h2 className="font-serif text-lg">Холст</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink/70">Цвет фона</span>
            <input type="color" className="h-8 w-14 rounded border border-line" value={draft.canvas.backgroundColor || "#ffffff"} onChange={(e) => setCanvas({ backgroundColor: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Ширина холста</label>
            <input type="number" className="input" value={draft.canvas.width} onChange={(e) => setCanvas({ width: Number(e.target.value) })} />
          </div>
          <div>
            <label className="field-label">Высота этого макета</label>
            <input type="number" className="input" value={Math.round(scene.canvasHeight)} onChange={(e) => setSliceHeight(Number(e.target.value))} />
            <p className="mt-1 text-xs text-ink/40">Для «{layoutLabel(layoutKey)}»</p>
          </div>
        </div>
      </div>

      {/* Photo template management */}
      <div className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg">Шаблоны фото</h2>
          <button className="btn-ghost" onClick={addPhotoTemplate}>+ Добавить шаблон</button>
        </div>
        <div className="space-y-2">
          {draft.photoTemplates.map((pt) => (
            <div key={pt.id} className="flex items-center gap-2">
              <input className="input" value={pt.name} onChange={(e) => renamePhotoTemplate(pt.id, e.target.value)} />
              <button className="shrink-0 rounded px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-30" onClick={() => removePhotoTemplate(pt.id)} disabled={draft.photoTemplates.length <= 1}>Удалить</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
