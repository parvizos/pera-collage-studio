const STORAGE_KEY = "pera-collage-template-v3";

const TEMPLATE_API_URL = "/api/template";
const COLLAGES_API_URL = "/api/collages";
const USERS_API_URL = "/api/users";

const BLOCK_LABELS = {
  header: "Шапка",
  headerLogo: "Логотип магазина",
  leftBadge: "Левая эмблема",
  rightBadge: "Правая эмблема",
  brandPlate: "Плашка бренда",
  footer: "Нижний блок",
  priceBox: "Блок цены",
  textLeft: "Текстовый блок 1",
  textCenterTop: "Текстовый блок 2",
  textCenterBottom: "Текстовый блок 3",
};

const BINDABLE_BLOCKS = new Set([
  "brandPlate",
  "textLeft",
  "textCenterTop",
  "textCenterBottom",
  "priceBox",
]);

const DEFAULT_PHOTO_TEMPLATE_ID = "template_2";

function createBlock(x, y, width, height, fill, stroke, radius = 0, borderWidth = 0) {
  return { x, y, width, height, fill, stroke, radius, borderWidth, hidden: false };
}

const BLOCK_ORDER = [
  "header",
  "headerLogo",
  "leftBadge",
  "rightBadge",
  "brandPlate",
  "footer",
  "priceBox",
  "textLeft",
  "textCenterTop",
  "textCenterBottom",
];

const BLOCK_LIBRARY = {
  header: createBlock(0, 0, 1080, 180, "#ffffff", "#ffffff", 0, 0),
  headerLogo: createBlock(302, 20, 476, 136, "#ffffff", "#ffffff", 0, 0),
  leftBadge: createBlock(20, 14, 152, 152, "#ffffff", "#ffffff", 0, 0),
  rightBadge: createBlock(908, 14, 152, 152, "#ffffff", "#ffffff", 0, 0),
  brandPlate: createBlock(330, 1304, 420, 120, "#ffffff", "#151515", 60, 4),
  footer: createBlock(0, 1400, 1080, 220, "#ffffff", "#ffffff", 0, 0),
  priceBox: createBlock(810, 1454, 258, 114, "#050505", "#050505", 26, 0),
  textLeft: createBlock(22, 1422, 220, 132, "#ffffff", "#ffffff", 0, 0),
  textCenterTop: createBlock(290, 1424, 350, 44, "#ffffff", "#ffffff", 0, 0),
  textCenterBottom: createBlock(290, 1506, 350, 40, "#ffffff", "#ffffff", 0, 0),
};

function createPhotoCell(x, y, width, height) {
  return {
    x,
    y,
    width,
    height,
    fill: "#ffffff",
    stroke: "#d6c5b3",
    radius: 0,
    borderWidth: 2,
  };
}

function normalizeBrandTemplateIds(rawTemplateIds, photoTemplates = []) {
  const availableIds = new Set((photoTemplates ?? []).map((item) => item.id));
  const sourceIds =
    Array.isArray(rawTemplateIds) && rawTemplateIds.length
      ? rawTemplateIds
      : photoTemplates.map((item) => item.id);
  const normalizedIds = sourceIds.filter((id) => availableIds.has(id));
  return Array.from(new Set(normalizedIds));
}

function normalizeBrandFieldSettings(fieldSettings = {}) {
  const result = {};
  Object.entries(fieldSettings ?? {}).forEach(([fieldId, settings]) => {
    result[fieldId] = {
      defaultValue: settings?.defaultValue ?? "",
      hidden: Boolean(settings?.hidden),
    };
  });
  return result;
}

function createBrandProfile(name, photoTemplates, overrides = {}) {
  const templateIds = normalizeBrandTemplateIds(overrides.templateIds, photoTemplates);
  const defaultTemplateId =
    templateIds.find((id) => id === overrides.defaultTemplateId) ??
    templateIds[0] ??
    photoTemplates[0]?.id ??
    null;

  return {
    id: overrides.id || crypto.randomUUID(),
    name,
    logo: overrides.logo ?? null,
    templateIds,
    defaultTemplateId,
    fieldSettings: normalizeBrandFieldSettings(overrides.fieldSettings),
  };
}

const defaultPhotoTemplates = [
  { id: "template_1", name: "1 фото" },
  { id: "template_2", name: "2 фото" },
  { id: "template_3", name: "3 фото" },
];

const defaultPhotoLayouts = {
  template_1: [createPhotoCell(24, 204, 1032, 1160)],
  template_2: [
    createPhotoCell(24, 204, 510, 1160),
    createPhotoCell(546, 204, 510, 1160),
  ],
  template_3: [
    createPhotoCell(24, 204, 536, 1160),
    createPhotoCell(572, 204, 484, 574),
    createPhotoCell(572, 790, 484, 574),
  ],
};

const defaultBrands = [
  createBrandProfile("EXXpose ILine", defaultPhotoTemplates),
  createBrandProfile("BILJANA", defaultPhotoTemplates),
  createBrandProfile("Brand 03", defaultPhotoTemplates),
  createBrandProfile("Brand 04", defaultPhotoTemplates),
];

const defaultTemplate = {
  security: {
    adminPin: "1234",
  },
  canvas: {
    width: 1080,
    height: 1620,
    backgroundColor: "#f6f1ea",
    guideColor: "#d47516",
    showGuides: true,
  },
  theme: {
    headerBackground: "#ffffff",
    footerBackground: "#ffffff",
    storeTextColor: "#121212",
    brandTextColor: "#151515",
    footerTextColor: "#121212",
    priceTextColor: "#ffffff",
  },
  store: {
    title: "PERA",
    subtitle: "ISTANBUL",
    titleSize: 74,
    subtitleSize: 26,
    logo: null,
    leftBadge: null,
    rightBadge: null,
  },
  fields: [
    { id: "category", label: "Категория", inputType: "text", defaultValue: "TAKIM", options: [] },
    { id: "size", label: "Размер", inputType: "text", defaultValue: "42-48", options: [] },
    { id: "code", label: "Код товара", inputType: "text", defaultValue: "EXPO-533-B", options: [] },
    { id: "color", label: "Цвет / описание", inputType: "text", defaultValue: "STD", options: [] },
    { id: "price", label: "Цена", inputType: "text", defaultValue: "$50", options: [] },
  ],
  textBindings: {
    brandPlate: { primary: "", secondary: "" },
    textLeft: { primary: "category", secondary: "size" },
    textCenterTop: { primary: "code", secondary: "" },
    textCenterBottom: { primary: "color", secondary: "" },
    priceBox: { primary: "price", secondary: "" },
  },
  textStyles: {
    brandPlate: { color: "#151515", align: "center" },
    textLeft: { color: "#121212", align: "left" },
    textCenterTop: { color: "#121212", align: "center" },
    textCenterBottom: { color: "#121212", align: "center" },
    priceBox: { color: "#ffffff", align: "center" },
  },
  blocks: structuredClone(BLOCK_LIBRARY),
  blockOrder: [...BLOCK_ORDER],
  photoTemplates: defaultPhotoTemplates,
  photoLayouts: defaultPhotoLayouts,
  brands: defaultBrands,
  users: [
    { id: crypto.randomUUID(), name: "employee-01", pin: "1111", brandIds: [] },
  ],
};

const defaultEmployeeData = {
  photoTemplateId: DEFAULT_PHOTO_TEMPLATE_ID,
  brandId: null,
  values: {},
  photos: Array.from({ length: 8 }, () => null),
  photoTransforms: Array.from({ length: 8 }, () => ({ scale: 1, offsetX: 0, offsetY: 0 })),
};

let template = structuredClone(defaultTemplate);
template.templateScenes = mergeTemplateScenes({}, template.photoTemplates);
let users = [];
let employeeData = {
  ...defaultEmployeeData,
  brandId: template.brands[0]?.id ?? null,
  values: buildDefaultFieldValues(template.fields),
};

let currentMode = "employee";
let editorLayer = "blocks";
let activePhotoLayout = DEFAULT_PHOTO_TEMPLATE_ID;
let currentSceneTemplateId = DEFAULT_PHOTO_TEMPLATE_ID;
let activeBrandSettingsId = null;
let selection = { type: "block", key: "header" };
let employeeView = "compose";
let employeeComposeStep = "details";
let adminView = "scene";
let currentEmployeeUserId = null;
let adminUnlocked = false;
let employeeHistory = [];
let adminHistory = [];
let employeeHistoryQuery = "";
let adminHistoryQuery = "";
let employeeHistoryView = "list";
let adminHistoryView = "list";
let employeeHistorySort = "newest";
let adminHistorySort = "newest";
let employeeHistoryRange = "all";
let adminHistoryRange = "all";
let employeeHistoryLoading = false;
let adminHistoryLoading = false;
let employeeHistoryPage = 1;
let adminHistoryPage = 1;
let employeeHistoryHasMore = false;
let adminHistoryHasMore = false;
let employeeHistorySearchTimer = null;
let adminHistorySearchTimer = null;
let employeeHistorySelection = new Set();
let adminHistorySelection = new Set();
let activeHistoryPreview = null;
let dragState = null;
let photoAdjustSelection = 0;
let employeeTouchState = null;
let employeeTapState = { lastIndex: null, lastTime: 0 };
let renderScheduled = false;
let adminTapState = { count: 0, lastTime: 0 };
let localDataRootHandle = null;
const imageCache = new Map();
const imagePromiseCache = new Map();
const HISTORY_PAGE_LIMIT = 24;

function isFileMode() {
  return window.location.protocol === "file:";
}

function isAdminRoute() {
  return (
    !isFileMode() &&
    (window.location.pathname === "/admin" ||
      window.location.pathname === "/admin/" ||
      document.body?.dataset?.route === "admin" ||
      window.__PERA_ROUTE__ === "admin")
  );
}

function goToEmployeeRoute() {
  if (isFileMode()) return;
  window.location.href = "/";
}

function applyAdminRouteLoginState() {
  if (!isAdminRoute()) return;

  document.body.classList.add("app-route-admin");
  document.body.dataset.route = "admin";

  if (elements.authHeadEyebrow) {
    elements.authHeadEyebrow.textContent = "Вход";
  }
  if (elements.authHeadTitle) {
    elements.authHeadTitle.textContent = "Администратор";
  }
  if (elements.employeeUserField) {
    elements.employeeUserField.style.display = "none";
  }
  if (elements.employeeUserPinField) {
    const label = elements.employeeUserPinField.querySelector("span");
    if (label) {
      label.textContent = "PIN администратора";
    }
  }
  if (elements.employeeUserPin) {
    elements.employeeUserPin.placeholder = "Введите PIN администратора";
  }
  if (elements.loginUser) {
    elements.loginUser.textContent = "Войти в админку";
  }
  if (elements.employeeSessionHint) {
    elements.employeeSessionHint.textContent = "";
  }
}

function supportsLocalFileSystem() {
  return typeof window.showDirectoryPicker === "function";
}

function getServerLaunchMessage(actionLabel = "Эта функция") {
  return `${actionLabel} требует либо локальный сервер, либо доступ к папке данных в standalone-режиме.\n\nВариант 1:\n1. powershell -ExecutionPolicy Bypass -File .\\serve.ps1\n2. Открой http://localhost:8080\n\nВариант 2:\nОткрой страницу как файл и выбери папку данных по запросу браузера.`;
}

async function ensureLocalDataRoot(interactive = true) {
  if (!isFileMode()) return null;
  if (localDataRootHandle) return localDataRootHandle;
  if (!supportsLocalFileSystem()) {
    throw new Error("File System Access API is not supported in this browser.");
  }
  if (!interactive) return null;

  localDataRootHandle = await window.showDirectoryPicker({
    id: "pera-collage-data",
    mode: "readwrite",
  });
  return localDataRootHandle;
}

async function ensureLocalSubdir(parentHandle, name) {
  return parentHandle.getDirectoryHandle(name, { create: true });
}

async function getLocalFileHandle(pathParts, create = false) {
  const rootHandle = await ensureLocalDataRoot(create);
  if (!rootHandle) return null;

  let current = rootHandle;
  for (let index = 0; index < pathParts.length - 1; index += 1) {
    current = await current.getDirectoryHandle(pathParts[index], { create });
  }

  return current.getFileHandle(pathParts[pathParts.length - 1], { create });
}

async function readLocalJson(pathParts) {
  try {
    const fileHandle = await getLocalFileHandle(pathParts, false);
    if (!fileHandle) return null;
    const file = await fileHandle.getFile();
    return JSON.parse(await file.text());
  } catch (error) {
    if (error?.name === "NotFoundError") return null;
    throw error;
  }
}

async function writeLocalJson(pathParts, payload) {
  const fileHandle = await getLocalFileHandle(pathParts, true);
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(payload, null, 2));
  await writable.close();
}

async function writeLocalDataUrl(pathParts, dataUrl) {
  const fileHandle = await getLocalFileHandle(pathParts, true);
  const writable = await fileHandle.createWritable();
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  await writable.write(blob);
  await writable.close();
}

async function listLocalJsonRecords(pathParts) {
  const rootHandle = await ensureLocalDataRoot(false);
  if (!rootHandle) return [];

  let current = rootHandle;
  try {
    for (const part of pathParts) {
      current = await current.getDirectoryHandle(part, { create: false });
    }
  } catch (error) {
    if (error?.name === "NotFoundError") return [];
    throw error;
  }

  const records = [];
  for await (const [name, handle] of current.entries()) {
    if (handle.kind !== "file" || !name.endsWith(".json")) continue;
    const file = await handle.getFile();
    try {
      records.push(JSON.parse(await file.text()));
    } catch (error) {
      console.error("Local JSON parse failed", name, error);
    }
  }
  return records;
}

async function listLocalJsonRecordsRecursive(pathParts) {
  const rootHandle = await ensureLocalDataRoot(false);
  if (!rootHandle) return [];

  let current = rootHandle;
  try {
    for (const part of pathParts) {
      current = await current.getDirectoryHandle(part, { create: false });
    }
  } catch (error) {
    if (error?.name === "NotFoundError") return [];
    throw error;
  }

  const records = [];

  async function walkDirectory(directoryHandle) {
    for await (const [name, handle] of directoryHandle.entries()) {
      if (handle.kind === "directory") {
        await walkDirectory(handle);
        continue;
      }
      if (!name.endsWith(".json")) continue;
      const file = await handle.getFile();
      try {
        records.push(JSON.parse(await file.text()));
      } catch (error) {
        console.error("Local JSON parse failed", name, error);
      }
    }
  }

  await walkDirectory(current);
  return records;
}

async function listLocalHistorySummaryRecords() {
  const rootHandle = await ensureLocalDataRoot(false);
  if (!rootHandle) return [];

  const records = [];

  async function collectJsonFiles(pathParts) {
    let current = rootHandle;
    try {
      for (const part of pathParts) {
        current = await current.getDirectoryHandle(part, { create: false });
      }
    } catch (error) {
      if (error?.name === "NotFoundError") return;
      throw error;
    }

    for await (const [name, handle] of current.entries()) {
      if (handle.kind !== "file" || !name.endsWith(".json")) continue;
      const file = await handle.getFile();
      try {
        records.push(JSON.parse(await file.text()));
      } catch (error) {
        console.error("Local history summary parse failed", name, error);
      }
    }
  }

  await collectJsonFiles(["history", "records"]);

  let brandsHandle = null;
  try {
    brandsHandle = await rootHandle.getDirectoryHandle("history", { create: false });
    brandsHandle = await brandsHandle.getDirectoryHandle("brands", { create: false });
  } catch (error) {
    if (error?.name === "NotFoundError") {
      return records;
    }
    throw error;
  }

  for await (const [, brandHandle] of brandsHandle.entries()) {
    if (brandHandle.kind !== "directory") continue;
    try {
      const recordsHandle = await brandHandle.getDirectoryHandle("records", { create: false });
      for await (const [name, handle] of recordsHandle.entries()) {
        if (handle.kind !== "file" || !name.endsWith(".json")) continue;
        const file = await handle.getFile();
        try {
          records.push(JSON.parse(await file.text()));
        } catch (error) {
          console.error("Local brand history summary parse failed", name, error);
        }
      }
    } catch (error) {
      if (error?.name !== "NotFoundError") {
        throw error;
      }
    }
  }

  return records;
}

async function deleteLocalEntry(pathParts) {
  const rootHandle = await ensureLocalDataRoot(false);
  if (!rootHandle) return false;

  let current = rootHandle;
  try {
    for (let index = 0; index < pathParts.length - 1; index += 1) {
      current = await current.getDirectoryHandle(pathParts[index], { create: false });
    }
    await current.removeEntry(pathParts[pathParts.length - 1]);
    return true;
  } catch (error) {
    if (error?.name === "NotFoundError") return false;
    throw error;
  }
}

async function deleteLocalHistoryRecord(record) {
  const brandSlug = record?.brandSlug || slugifyValue(record?.brandName || record?.brandId || "unknown-brand", "unknown-brand");
  const recordId = record?.id;
  const imageFileName = record?.imageFileName || `${recordId}.png`;

  const deletionPaths = [
    ["history", "brands", brandSlug, "records", `${recordId}.json`],
    ["history", "brands", brandSlug, "details", `${recordId}.json`],
    ["history", "brands", brandSlug, "images", imageFileName],
    ["history", "records", `${recordId}.json`],
    ["history", "images", imageFileName],
  ];

  let deleted = false;
  for (const pathParts of deletionPaths) {
    deleted = (await deleteLocalEntry(pathParts)) || deleted;
  }
  return deleted;
}

async function readLocalHistoryRecordDetail(record) {
  const candidatePaths = [];
  if (record?.brandSlug && record?.id) {
    candidatePaths.push(["history", "brands", record.brandSlug, "details", `${record.id}.json`]);
    candidatePaths.push(["history", "brands", record.brandSlug, "records", `${record.id}.json`]);
  }
  if (record?.id) {
    candidatePaths.push(["history", "records", `${record.id}.json`]);
  }

  for (const pathParts of candidatePaths) {
    const loaded = await readLocalJson(pathParts);
    if (loaded?.id === record?.id) {
      return loaded;
    }
  }

  return record;
}

const elements = {
  canvas: document.getElementById("collageCanvas"),
  stage: document.getElementById("stage"),
  overlay: document.getElementById("editorOverlay"),
  heroBadge: document.querySelector(".hero-badge"),
  secretAdminTrigger: document.getElementById("adminSecretTrigger"),
  modeButtons: Array.from(document.querySelectorAll(".segment[data-mode]")),
  panels: Array.from(document.querySelectorAll(".mode-panel")),
  photoCount: document.getElementById("photoCount"),
  brandSelect: document.getElementById("brandSelect"),
  employeeUserSelect: document.getElementById("employeeUserSelect"),
  employeeUserPin: document.getElementById("employeeUserPin"),
  loginUser: document.getElementById("loginUser"),
  logoutUser: document.getElementById("logoutUser"),
  employeeWorkspaceLogout: document.getElementById("employeeWorkspaceLogout"),
  employeeAuthShell: document.getElementById("employeeAuthShell"),
  authHeadEyebrow: document.querySelector(".auth-head .eyebrow"),
  authHeadTitle: document.querySelector(".auth-head h3"),
  employeeUserField: document.getElementById("employeeUserSelect")?.closest(".field"),
  employeeUserPinField: document.getElementById("employeeUserPin")?.closest(".field"),
  employeeSessionHint: document.getElementById("employeeSessionHint"),
  employeeWorkspace: document.getElementById("employeeWorkspace"),
  employeePrimaryFields: document.getElementById("employeePrimaryFields"),
  employeeComposeActionsHost: document.getElementById("employeeComposeActionsHost"),
  employeeComposeActions: document.getElementById("employeeComposeActions"),
  employeePreviewActionsHost: document.getElementById("employeePreviewActionsHost"),
  employeeComposeCollage: document.getElementById("employeeComposeCollage"),
  employeeNextStep: document.getElementById("employeeNextStep"),
  employeeBackStep: document.getElementById("employeeBackStep"),
  employeeHistoryList: document.getElementById("employeeHistoryList"),
  adminHistoryList: document.getElementById("adminHistoryList"),
  employeeHistorySearch: document.getElementById("employeeHistorySearch"),
  adminHistorySearch: document.getElementById("adminHistorySearch"),
  employeeHistorySort: document.getElementById("employeeHistorySort"),
  adminHistorySort: document.getElementById("adminHistorySort"),
  employeeHistoryRangeButtons: Array.from(document.querySelectorAll("[data-history-scope='employee'][data-history-range]")),
  adminHistoryRangeButtons: Array.from(document.querySelectorAll("[data-history-scope='admin'][data-history-range]")),
  historyViewButtons: Array.from(document.querySelectorAll("[data-history-view]")),
  employeeHistoryBulkBar: document.getElementById("employeeHistoryBulkBar"),
  adminHistoryBulkBar: document.getElementById("adminHistoryBulkBar"),
  employeeHistoryLoadMore: document.getElementById("employeeHistoryLoadMore"),
  adminHistoryLoadMore: document.getElementById("adminHistoryLoadMore"),
  employeeHistorySelectedCount: document.getElementById("employeeHistorySelectedCount"),
  adminHistorySelectedCount: document.getElementById("adminHistorySelectedCount"),
  employeeHistoryDownloadSelected: document.getElementById("employeeHistoryDownloadSelected"),
  adminHistoryDownloadSelected: document.getElementById("adminHistoryDownloadSelected"),
  employeeHistoryDeleteSelected: document.getElementById("employeeHistoryDeleteSelected"),
  adminHistoryDeleteSelected: document.getElementById("adminHistoryDeleteSelected"),
  employeeCustomFields: document.getElementById("employeeCustomFields"),
  employeeViewButtons: Array.from(document.querySelectorAll("[data-employee-view]")),
  employeeViewPanels: Array.from(document.querySelectorAll("[data-employee-view-panel]")),
  employeeComposeStepButtons: Array.from(document.querySelectorAll("[data-employee-compose-step]")),
  photoInputs: Array.from(document.querySelectorAll(".hidden-inputs input[type='file']")),
  downloadPng: document.getElementById("downloadPng"),
  resetEmployee: document.getElementById("resetEmployee"),
  adminPin: document.getElementById("adminPin"),
  lockAdmin: document.getElementById("lockAdmin"),
  canvasWidth: document.getElementById("canvasWidth"),
  canvasHeight: document.getElementById("canvasHeight"),
  headerBackground: document.getElementById("headerBackground"),
  footerBackground: document.getElementById("footerBackground"),
  canvasBackground: document.getElementById("canvasBackground"),
  guideColor: document.getElementById("guideColor"),
  showGuides: document.getElementById("showGuides"),
  editBlocksBtn: document.getElementById("editBlocksBtn"),
  editPhotosBtn: document.getElementById("editPhotosBtn"),
  adminPhotoTemplateSelect: document.getElementById("adminPhotoTemplateSelect"),
  addPhotoTemplate: document.getElementById("addPhotoTemplate"),
  duplicatePhotoTemplate: document.getElementById("duplicatePhotoTemplate"),
  clearPhotoTemplate: document.getElementById("clearPhotoTemplate"),
  removePhotoTemplate: document.getElementById("removePhotoTemplate"),
  adminPhotoTemplateName: document.getElementById("adminPhotoTemplateName"),
  photoLayoutTabs: Array.from(document.querySelectorAll(".photo-layout-tab")),
  photoTemplateList: document.getElementById("photoTemplateList"),
  itemList: document.getElementById("templateItemList"),
  availableBlockSelect: document.getElementById("availableBlockSelect"),
  insertBlock: document.getElementById("insertBlock"),
  addPhotoCell: document.getElementById("addPhotoCell"),
  removeSelected: document.getElementById("removeSelected"),
  selectionTitle: document.getElementById("selectionTitle"),
  selectionMeta: document.getElementById("selectionMeta"),
  textBindingSection: document.getElementById("textBindingSection"),
  imageBlockSection: document.getElementById("imageBlockSection"),
  bindingPrimary: document.getElementById("bindingPrimary"),
  bindingSecondary: document.getElementById("bindingSecondary"),
  textColor: document.getElementById("textColor"),
  textAlign: document.getElementById("textAlign"),
  customImageUpload: document.getElementById("customImageUpload"),
  itemX: document.getElementById("itemX"),
  itemY: document.getElementById("itemY"),
  itemWidth: document.getElementById("itemWidth"),
  itemHeight: document.getElementById("itemHeight"),
  itemRadius: document.getElementById("itemRadius"),
  itemBorderWidth: document.getElementById("itemBorderWidth"),
  itemFill: document.getElementById("itemFill"),
  itemStroke: document.getElementById("itemStroke"),
  storeTitle: document.getElementById("storeTitle"),
  storeSubtitle: document.getElementById("storeSubtitle"),
  storeTitleSize: document.getElementById("storeTitleSize"),
  storeSubtitleSize: document.getElementById("storeSubtitleSize"),
  storeTextColor: document.getElementById("storeTextColor"),
  brandTextColor: document.getElementById("brandTextColor"),
  footerTextColor: document.getElementById("footerTextColor"),
  priceTextColor: document.getElementById("priceTextColor"),
  storeLogoUpload: document.getElementById("storeLogoUpload"),
  leftBadgeUpload: document.getElementById("leftBadgeUpload"),
  rightBadgeUpload: document.getElementById("rightBadgeUpload"),
  employeeFieldAdminList: document.getElementById("employeeFieldAdminList"),
  brandFieldSettingsSelect: document.getElementById("brandFieldSettingsSelect"),
  addEmployeeField: document.getElementById("addEmployeeField"),
  brandAdminList: document.getElementById("brandAdminList"),
  addBrand: document.getElementById("addBrand"),
  userAdminList: document.getElementById("userAdminList"),
  addUser: document.getElementById("addUser"),
  adminViewButtons: Array.from(document.querySelectorAll("[data-admin-view]")),
  adminViewPanels: Array.from(document.querySelectorAll("[data-admin-view-panel]")),
  saveTemplate: document.getElementById("saveTemplate"),
  exportTemplate: document.getElementById("exportTemplate"),
  resetTemplate: document.getElementById("resetTemplate"),
  historyPreviewModal: document.getElementById("historyPreviewModal"),
  historyPreviewBackdrop: document.getElementById("historyPreviewBackdrop"),
  historyPreviewClose: document.getElementById("historyPreviewClose"),
  historyPreviewImage: document.getElementById("historyPreviewImage"),
  historyPreviewBrand: document.getElementById("historyPreviewBrand"),
  historyPreviewUser: document.getElementById("historyPreviewUser"),
  historyPreviewTitle: document.getElementById("historyPreviewTitle"),
  historyPreviewMeta: document.getElementById("historyPreviewMeta"),
  historyPreviewOpen: document.getElementById("historyPreviewOpen"),
  historyPreviewDownload: document.getElementById("historyPreviewDownload"),
};

elements.photoCountField = elements.photoCount.closest(".field");
elements.brandSelectField = elements.brandSelect.closest(".field");

const ctx = elements.canvas ? elements.canvas.getContext("2d") : null;

function bootstrapAuthShell() {
  try {
    ensureFallbackUsers();
    populateEmployeeUserSelect();
    applyAdminRouteLoginState();
    bindEmployeeInputs();
  } catch (error) {
    console.error("Auth shell bootstrap failed", error);
  }
}

bootstrapAuthShell();

boot().catch((error) => {
  console.error("Boot failed", error);
  alert(
    isFileMode()
      ? getServerLaunchMessage("Редактор")
      : "Не удалось запустить редактор. Запусти локальный сервер заново."
  );
});

async function boot() {
  if (isFileMode()) {
    console.warn("App opened via file://. Standalone file mode is enabled.");
    try {
      await ensureLocalDataRoot(false);
    } catch (error) {
      console.error("Standalone folder access failed", error);
    }
  }
  await initializeUsersStorage();
  populateEmployeeUserSelect();
  applyAdminRouteLoginState();
  await initializeTemplateStorage();
  elements.overlay.classList.remove("is-hidden");
  ensureTemplateState();
  loadScene(activePhotoLayout);
  syncTemplateInputs();
  syncEmployeeInputs();
  bindModeSwitch();
  bindWorkspaceTabs();
  bindSecretAdminTrigger();
  bindEmployeeInputs();
  bindAdminInputs();
  bindOverlayPointer();
  renderBrandAdminList();
  renderUserAdminList();
  populatePhotoTemplateSelectors();
  populateBrandSelect();
  populateEmployeeUserSelect();
  renderEmployeeFieldInputs();
  renderEmployeeFieldAdminList();
  syncEmployeeAccess();
  renderAvailableBlocks();
  renderItemList();
  syncSelectionInspector();
  updatePhotoInputState();
  scheduleRender();

  renderEmployeeHistoryList();
  renderAdminHistoryList();

  applyAdminRouteLoginState();
  syncAppStateClasses();
}

async function initializeTemplateStorage() {
  try {
    const savedTemplate = await loadTemplateFromServer();
    if (savedTemplate) {
      template = mergeTemplate(savedTemplate);
    } else {
      template = structuredClone(defaultTemplate);
      template.templateScenes = mergeTemplateScenes({}, template.photoTemplates);
      await saveTemplateToServer();
    }
  } catch (error) {
    console.error("Template file load failed", error);
    template = structuredClone(defaultTemplate);
    template.templateScenes = mergeTemplateScenes({}, template.photoTemplates);
  }

  employeeData = {
    ...defaultEmployeeData,
    brandId: template.brands[0]?.id ?? null,
    values: buildDefaultFieldValues(template.fields),
  };
  activeBrandSettingsId = template.brands[0]?.id ?? null;
  applyBrandFieldDefaults(employeeData.brandId, { replace: true });
  activePhotoLayout = template.photoTemplates[0]?.id ?? DEFAULT_PHOTO_TEMPLATE_ID;
  currentSceneTemplateId = activePhotoLayout;
  employeeData.photoTemplateId = getBrandDefaultTemplateId(employeeData.brandId);
  currentEmployeeUserId = null;
}

async function initializeUsersStorage() {
  try {
    const payload = await loadUsersFromServer();
    users = Array.isArray(payload?.users) ? payload.users.map(normalizeUserRecord) : [];
  } catch (error) {
    console.error("Users load failed", error);
    users = [];
  }

  if (!users.length) {
    users = [createEmployeeUser(1)];
    try {
      await saveUsersToServer();
    } catch (error) {
      console.error("Initial users save failed", error);
    }
  }
}

function ensureFallbackUsers() {
  if (users.length) return false;
  users = [createEmployeeUser(1)];
  saveUsersToServer().catch((error) => {
    console.error("Fallback users save failed", error);
  });
  return true;
}

async function loadTemplateFromServer() {
  if (isFileMode()) {
    return readLocalJson(["templates", "studio-template.json"]);
  }

  const response = await fetch(TEMPLATE_API_URL, {
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Template load failed: ${response.status}`);
  }

  return response.json();
}

async function loadUsersFromServer() {
  if (isFileMode()) {
    return readLocalJson(["users.json"]);
  }

  const response = await fetch(USERS_API_URL, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Users load failed: ${response.status}`);
  }

  return response.json();
}

async function saveUsersToServer() {
  if (isFileMode()) {
    await writeLocalJson(["users.json"], { users });
    return { ok: true, users };
  }

  const response = await fetch(USERS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ users }, null, 2),
  });

  if (!response.ok) {
    throw new Error(`Users save failed: ${response.status}`);
  }

  return response.json();
}

function normalizeUserRecord(user, index = 0) {
  return {
    id: user.id || `user_${index + 1}`,
    name: user.name || `employee-${String(index + 1).padStart(2, "0")}`,
    pin: String(user.pin ?? "1111"),
    brandIds: Array.isArray(user.brandIds) ? user.brandIds.filter(Boolean) : [user.brandId].filter(Boolean),
  };
}

function normalizeBrandRecord(brand, index = 0, photoTemplates = template.photoTemplates ?? []) {
  return createBrandProfile(
    brand?.name || `Brand ${String(index + 1).padStart(2, "0")}`,
    photoTemplates,
    brand ?? {}
  );
}

function mergeTemplate(parsed) {
  const photoTemplates = mergePhotoTemplates(parsed.photoTemplates);
  const templateScenes = mergeTemplateScenes(parsed.templateScenes, photoTemplates);
  return {
    security: { ...defaultTemplate.security, ...(parsed.security ?? {}) },
    canvas: { ...defaultTemplate.canvas, ...(parsed.canvas ?? {}) },
    theme: { ...defaultTemplate.theme, ...(parsed.theme ?? {}) },
    store: { ...defaultTemplate.store, ...(parsed.store ?? {}) },
    fields:
      Array.isArray(parsed.fields) && parsed.fields.length
        ? parsed.fields.map((field, index) => ({
            id: field.id || `field_${index + 1}`,
            label: field.label || `Поле ${index + 1}`,
            inputType: field.inputType === "select" ? "select" : "text",
            defaultValue: field.defaultValue ?? "",
            options: Array.isArray(field.options) ? field.options : [],
          }))
        : structuredClone(defaultTemplate.fields),
    textBindings: structuredClone(defaultTemplate.textBindings),
    textStyles: structuredClone(defaultTemplate.textStyles),
    blocks: structuredClone(BLOCK_LIBRARY),
    blockOrder: [...BLOCK_ORDER],
    photoTemplates,
    photoLayouts: mergePhotoLayouts(parsed.photoLayouts, photoTemplates),
    templateScenes,
    brands:
      Array.isArray(parsed.brands) && parsed.brands.length
        ? parsed.brands.map((brand, index) => normalizeBrandRecord(brand, index, photoTemplates))
        : defaultBrands.map((brand, index) => normalizeBrandRecord(brand, index, photoTemplates)),
    users:
      Array.isArray(parsed.users) && parsed.users.length
        ? parsed.users.map((user, index) => ({
            id: user.id || `user_${index + 1}`,
            name: user.name || `employee-${String(index + 1).padStart(2, "0")}`,
            pin: String(user.pin ?? "1111"),
            brandIds:
              Array.isArray(user.brandIds) && user.brandIds.length
                ? user.brandIds
                : [user.brandId].filter(Boolean),
          }))
        : structuredClone(defaultTemplate.users),
  };
}

function getBrandById(brandId) {
  return template.brands.find((brand) => brand.id === brandId) ?? null;
}

function getBrandTemplateIds(brandId) {
  const brand = getBrandById(brandId);
  if (!brand) {
    return template.photoTemplates.map((item) => item.id);
  }
  const normalizedIds = normalizeBrandTemplateIds(brand.templateIds, template.photoTemplates);
  return normalizedIds.length ? normalizedIds : template.photoTemplates.map((item) => item.id);
}

function getBrandDefaultTemplateId(brandId) {
  const brand = getBrandById(brandId);
  if (!brand) {
    return template.photoTemplates[0]?.id ?? DEFAULT_PHOTO_TEMPLATE_ID;
  }
  const templateIds = getBrandTemplateIds(brandId);
  return templateIds.find((id) => id === brand.defaultTemplateId) ?? templateIds[0] ?? template.photoTemplates[0]?.id ?? DEFAULT_PHOTO_TEMPLATE_ID;
}

function getAvailablePhotoTemplatesForBrand(brandId) {
  const allowedIds = new Set(getBrandTemplateIds(brandId));
  const available = template.photoTemplates.filter((item) => allowedIds.has(item.id));
  return available.length ? available : [...template.photoTemplates];
}

function getBrandFieldSetting(brandId, fieldId) {
  const brand = getBrandById(brandId);
  return brand?.fieldSettings?.[fieldId] ?? null;
}

function getFieldDefaultValue(field, brandId) {
  const brandDefault = getBrandFieldSetting(brandId, field.id)?.defaultValue;
  if (brandDefault !== undefined && brandDefault !== null && brandDefault !== "") {
    return brandDefault;
  }
  if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== "") {
    return field.defaultValue;
  }
  return field.inputType === "select" ? field.options?.[0] ?? "" : "";
}

function getEffectiveFieldConfig(field, brandId) {
  const brandSetting = getBrandFieldSetting(brandId, field.id);
  return {
    ...field,
    defaultValue: getFieldDefaultValue(field, brandId),
    hidden: Boolean(brandSetting?.hidden),
  };
}

function getEffectiveEmployeeFields(brandId = employeeData.brandId) {
  return template.fields
    .map((field) => getEffectiveFieldConfig(field, brandId))
    .filter((field) => !field.hidden);
}

function applyBrandFieldDefaults(brandId, { replace = false } = {}) {
  template.fields.forEach((field) => {
    const nextValue = getFieldDefaultValue(field, brandId);
    const currentValue = employeeData.values[field.id];
    if (replace || currentValue === undefined || currentValue === null || currentValue === "") {
      employeeData.values[field.id] = nextValue;
    }
  });
}

function syncEmployeeBrandTemplate(brandId, { forceDefault = false } = {}) {
  const availableTemplates = getAvailablePhotoTemplatesForBrand(brandId);
  const defaultTemplateId = getBrandDefaultTemplateId(brandId);
  if (
    forceDefault ||
    !availableTemplates.some((item) => item.id === employeeData.photoTemplateId)
  ) {
    employeeData.photoTemplateId =
      availableTemplates.find((item) => item.id === defaultTemplateId)?.id ??
      availableTemplates[0]?.id ??
      template.photoTemplates[0]?.id ??
      DEFAULT_PHOTO_TEMPLATE_ID;
  }
}

function ensureBrandsState() {
  if (!Array.isArray(template.brands) || !template.brands.length) {
    template.brands = [normalizeBrandRecord(defaultBrands[0], 0, template.photoTemplates)];
  }

  template.brands = template.brands.map((brand, index) => normalizeBrandRecord(brand, index, template.photoTemplates));

  users = users.map((user, index) => {
    const normalized = normalizeUserRecord(user, index);
    normalized.brandIds = normalized.brandIds.filter((brandId) => template.brands.some((brand) => brand.id === brandId));
    if (!normalized.brandIds.length && template.brands[0]?.id) {
      normalized.brandIds = [template.brands[0].id];
    }
    return normalized;
  });

  if (!template.brands.some((brand) => brand.id === employeeData.brandId)) {
    employeeData.brandId = template.brands[0]?.id ?? null;
  }

  activeBrandSettingsId =
    template.brands.find((brand) => brand.id === activeBrandSettingsId)?.id ??
    template.brands[0]?.id ??
    null;
}

function mergeBlockMap(savedBlocks = {}, fallbackBlocks = BLOCK_LIBRARY) {
  const result = {};
  const fallbackKeys = fallbackBlocks ? Object.keys(fallbackBlocks) : [];
  const keys = Object.keys(savedBlocks).length ? Object.keys(savedBlocks) : fallbackKeys;
  keys.forEach((key) => {
    if (BLOCK_LIBRARY[key]) {
      result[key] = { ...BLOCK_LIBRARY[key], ...(savedBlocks[key] ?? {}) };
      return;
    }
    result[key] = { ...(savedBlocks[key] ?? {}) };
  });
  return result;
}

function mergeTextStyles(savedStyles = {}) {
  const result = structuredClone(defaultTemplate.textStyles);
  Object.keys(savedStyles ?? {}).forEach((key) => {
    if (!result[key]) return;
    result[key] = { ...result[key], ...(savedStyles[key] ?? {}) };
  });
  return result;
}

function buildDefaultFieldValues(fields) {
  const values = {};
  fields.forEach((field) => {
    values[field.id] =
      field.defaultValue ??
      (field.inputType === "select" ? field.options?.[0] ?? "" : "");
  });
  return values;
}

function getProductCodeFromState(state = employeeData) {
  return String(state?.values?.code ?? "").trim() || "collage";
}

function getRecordProductCode(record) {
  return String(record?.productCode ?? record?.state?.values?.code ?? "").trim() || "Коллаж";
}

function getRecordDisplayName(record) {
  return getRecordProductCode(record) || record?.templateName || "Коллаж";
}

function buildSafeFileName(baseName, extension = "png") {
  const safeBase =
    String(baseName || "collage")
      .trim()
      .replace(/[<>:\"/\\\\|?*\u0000-\u001F]+/g, "-")
      .replace(/\s+/g, " ")
      .replace(/\.+$/g, "") || "collage";
  return `${safeBase}.${extension}`;
}

function slugifyValue(value, fallback = "item") {
  return (
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0400-\u04ff]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

function getHistorySearchText(record) {
  return [
    getRecordProductCode(record),
    record?.brandName,
    record?.userName,
    record?.templateName,
    record?.createdAt,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterHistoryRecords(records, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return records;
  return records.filter((record) => getHistorySearchText(record).includes(normalizedQuery));
}

function summarizeHistoryRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    createdAt: record.createdAt,
    userId: record.userId,
    userName: record.userName,
    brandId: record.brandId,
    brandName: record.brandName,
    brandSlug: record.brandSlug,
    productCode: getRecordProductCode(record),
    templateId: record.templateId,
    templateName: record.templateName,
    imageFileName: record.imageFileName,
    imagePath: record.imagePath,
    imageDataUrl: record.imageDataUrl,
    hasState: Boolean(record.hasState || record.state),
  };
}

function dedupeHistoryRecords(records) {
  const map = new Map();
  records
    .map(summarizeHistoryRecord)
    .filter(Boolean)
    .forEach((record) => {
      const previous = map.get(record.id);
      if (!previous || (!previous.imagePath && record.imagePath) || (!previous.hasState && record.hasState)) {
        map.set(record.id, record);
      }
    });
  return Array.from(map.values());
}

function sortHistoryRecords(records, sortMode = "newest") {
  const sorted = [...records];
  sorted.sort((left, right) => {
    if (sortMode === "oldest") {
      return String(left.createdAt ?? "").localeCompare(String(right.createdAt ?? ""));
    }
    if (sortMode === "code") {
      return getRecordProductCode(left).localeCompare(getRecordProductCode(right), "ru");
    }
    if (sortMode === "brand") {
      return String(left.brandName ?? "").localeCompare(String(right.brandName ?? ""), "ru");
    }
    if (sortMode === "user") {
      return String(left.userName ?? "").localeCompare(String(right.userName ?? ""), "ru");
    }
    return String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""));
  });
  return sorted;
}

function getHistoryRangeDays(range) {
  if (range === "today") return 1;
  if (range === "7") return 7;
  if (range === "30") return 30;
  return 0;
}

function filterHistoryRecordsByRange(records, range = "all") {
  const days = getHistoryRangeDays(range);
  if (!days) return records;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const threshold = days === 1 ? startOfToday : now.getTime() - days * 24 * 60 * 60 * 1000;

  return records.filter((record) => {
    const createdAt = new Date(record?.createdAt ?? "");
    if (Number.isNaN(createdAt.getTime())) return false;
    return createdAt.getTime() >= threshold;
  });
}

function paginateHistoryRecords(records, page = 1, limit = HISTORY_PAGE_LIMIT) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || HISTORY_PAGE_LIMIT);
  const offset = (safePage - 1) * safeLimit;
  const paginatedRecords = records.slice(offset, offset + safeLimit);
  return {
    records: paginatedRecords,
    page: safePage,
    limit: safeLimit,
    total: records.length,
    hasMore: offset + safeLimit < records.length,
  };
}

function applyHistoryQuery(records, options = {}) {
  const {
    query = "",
    range = "all",
    sort = "newest",
    page = 1,
    limit = HISTORY_PAGE_LIMIT,
    userId = null,
  } = options;

  const normalizedRecords = userId ? records.filter((record) => record?.userId === userId) : records;
  const filteredRecords = filterHistoryRecordsByRange(filterHistoryRecords(normalizedRecords, query), range);
  return paginateHistoryRecords(sortHistoryRecords(filteredRecords, sort), page, limit);
}

function getHistorySelection(scope) {
  return scope === "admin" ? adminHistorySelection : employeeHistorySelection;
}

function getHistoryCollection(scope) {
  return scope === "admin" ? adminHistory : employeeHistory;
}

function setHistorySelection(scope, nextSelection) {
  if (scope === "admin") {
    adminHistorySelection = nextSelection;
  } else {
    employeeHistorySelection = nextSelection;
  }
}

function isHistoryRecordSelected(scope, recordId) {
  return getHistorySelection(scope).has(recordId);
}

function toggleHistoryRecordSelection(scope, recordId) {
  const nextSelection = new Set(getHistorySelection(scope));
  if (nextSelection.has(recordId)) {
    nextSelection.delete(recordId);
  } else {
    nextSelection.add(recordId);
  }
  setHistorySelection(scope, nextSelection);
  if (scope === "admin") {
    renderAdminHistoryList();
  } else {
    renderEmployeeHistoryList();
  }
}

function clearHistorySelection(scope) {
  setHistorySelection(scope, new Set());
}

function getVisibleEmployeeHistoryRecords() {
  return employeeHistory;
}

function getVisibleAdminHistoryRecords() {
  return adminHistory;
}

function syncHistoryRangeButtons(scope) {
  const buttons = scope === "admin" ? elements.adminHistoryRangeButtons : elements.employeeHistoryRangeButtons;
  const currentRange = scope === "admin" ? adminHistoryRange : employeeHistoryRange;
  buttons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.historyRange === currentRange);
  });
}

function syncHistoryBulkBar(scope, visibleRecords = []) {
  const bulkBar = scope === "admin" ? elements.adminHistoryBulkBar : elements.employeeHistoryBulkBar;
  const countNode = scope === "admin" ? elements.adminHistorySelectedCount : elements.employeeHistorySelectedCount;
  const downloadButton =
    scope === "admin" ? elements.adminHistoryDownloadSelected : elements.employeeHistoryDownloadSelected;
  const deleteButton = scope === "admin" ? elements.adminHistoryDeleteSelected : elements.employeeHistoryDeleteSelected;

  if (!bulkBar || !countNode || !downloadButton || !deleteButton) return;

  const visibleIds = new Set(visibleRecords.map((record) => record.id));
  const selectedRecords = getHistoryCollection(scope).filter(
    (record) => getHistorySelection(scope).has(record.id) && (!visibleIds.size || visibleIds.has(record.id))
  );
  const selectedCount = selectedRecords.length;
  bulkBar.classList.toggle("is-hidden", selectedCount === 0);
  countNode.textContent = selectedCount ? `Выбрано: ${selectedCount}` : "Ничего не выбрано";
  downloadButton.disabled = selectedCount === 0;
  deleteButton.disabled = selectedCount === 0;
}

function syncHistoryPagination(scope) {
  const button = scope === "admin" ? elements.adminHistoryLoadMore : elements.employeeHistoryLoadMore;
  const isLoading = scope === "admin" ? adminHistoryLoading : employeeHistoryLoading;
  const hasMore = scope === "admin" ? adminHistoryHasMore : employeeHistoryHasMore;

  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? "Загружаем..." : "Показать ещё";
  button.classList.toggle("is-hidden", !hasMore && !isLoading);
}

function closeHistoryPreview() {
  activeHistoryPreview = null;
  if (elements.historyPreviewModal) {
    elements.historyPreviewModal.classList.add("is-hidden");
  }
}

function openHistoryPreview(record, scope) {
  activeHistoryPreview = { record, scope };
  if (!elements.historyPreviewModal) return;

  const info = getHistoryCardMeta(record);
  const previewSrc = getHistoryPreviewUrl(record);
  elements.historyPreviewImage.src =
    previewSrc ||
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  elements.historyPreviewImage.alt = info.title;
  elements.historyPreviewBrand.textContent = info.brandName;
  elements.historyPreviewUser.textContent = scope === "admin" ? info.userName : "Мой коллаж";
  elements.historyPreviewTitle.textContent = info.title;
  elements.historyPreviewMeta.textContent = info.subtitle || "Без даты";
  elements.historyPreviewOpen.onclick = async () => {
    await openHistoryRecord(record);
    closeHistoryPreview();
  };
  elements.historyPreviewDownload.onclick = () => {
    downloadHistoryRecord(record);
  };
  elements.historyPreviewModal.classList.remove("is-hidden");
}

function downloadHistoryRecord(record) {
  const previewSrc = getHistoryPreviewUrl(record);
  if (!previewSrc) return;

  if (/^data:/i.test(previewSrc)) {
    const fileName = buildSafeFileName(getRecordDisplayName(record));
    triggerBlobDownload(dataUrlToBlob(previewSrc), fileName);
    return;
  }

  const link = document.createElement("a");
  link.href = previewSrc;
  link.download = buildSafeFileName(getRecordDisplayName(record));
  document.body.append(link);
  link.click();
  link.remove();
}

async function downloadSelectedHistoryRecords(scope) {
  const selectedIds = getHistorySelection(scope);
  const selectedRecords = getHistoryCollection(scope).filter((record) => selectedIds.has(record.id));
  for (const record of selectedRecords) {
    downloadHistoryRecord(record);
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }
}

async function deleteHistoryRecordFromServer(record, scope) {
  if (isFileMode()) {
    return deleteLocalHistoryRecord(record);
  }

  const currentUser = getCurrentEmployeeUser();
  const payload = {
    records: [
      {
        id: record.id,
        brandSlug: record.brandSlug,
        userId: scope === "employee" ? currentUser?.id || record.userId : record.userId,
      },
    ],
  };

  const response = await fetch(`${COLLAGES_API_URL}/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`History delete failed: ${response.status}`);
  }
  return true;
}

async function deleteSelectedHistoryRecords(scope) {
  const selectedIds = getHistorySelection(scope);
  const selectedRecords = getHistoryCollection(scope).filter((record) => selectedIds.has(record.id));
  if (!selectedRecords.length) return;

  const isConfirmed = window.confirm(`Удалить выбранные коллажи: ${selectedRecords.length} шт.?`);
  if (!isConfirmed) return;

  try {
    for (const record of selectedRecords) {
      await deleteHistoryRecordFromServer(record, scope);
    }
    clearHistorySelection(scope);
    if (scope === "admin") {
      await loadAdminHistory();
    } else {
      await loadEmployeeHistory();
    }
  } catch (error) {
    console.error("History delete failed", error);
    alert("Не удалось удалить выбранные коллажи.");
  }
}

function getHistoryCardMeta(record) {
  const createdAt = record?.createdAt ? new Date(record.createdAt) : null;
  return {
    title: getRecordDisplayName(record),
    subtitle: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toLocaleString("ru-RU") : "",
    brandName: record?.brandName || "Без бренда",
    userName: record?.userName || "Без сотрудника",
  };
}

function getHistoryPreviewUrl(record) {
  if (!record) return "";
  return record.imageDataUrl || record.imagePath || "";
}

function createEmployeeField(index = template.fields.length + 1) {
  return {
    id: `field_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    label: `Поле ${index}`,
    inputType: "text",
    defaultValue: "",
    options: [],
  };
}

function createCustomBlock(kind) {
  const id = `custom_${kind}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const titles = {
    text: "Новый текст",
    shape: "Новая фигура",
    image: "Новая картинка",
  };

  const base = createBlock(120, 120, 260, 90, "#ffffff", "#151515", 0, 0);
  base.kind = `custom-${kind}`;
  base.name = titles[kind] ?? "Новый блок";

  if (kind === "shape") {
    base.height = 140;
    base.fill = "#f0e4d6";
    base.borderWidth = 2;
  }

  if (kind === "image") {
    base.width = 220;
    base.height = 220;
    base.fill = "transparent";
    base.imageSrc = null;
    base.imageFit = "contain";
  }

  return { id, block: base };
}

function getBlockLabel(key) {
  return template.blocks[key]?.name || BLOCK_LABELS[key] || key;
}

function isBindableBlock(key) {
  const block = template.blocks[key];
  return Boolean(block) && (BINDABLE_BLOCKS.has(key) || block.kind === "custom-text");
}

function mergePhotoTemplates(savedTemplates = []) {
  if (Array.isArray(savedTemplates) && savedTemplates.length) {
    return savedTemplates.map((item, index) => ({
      id: item.id || `template_${index + 1}`,
      name: item.name || `Шаблон ${index + 1}`,
    }));
  }
  return structuredClone(defaultTemplate.photoTemplates);
}

function mergePhotoLayouts(savedLayouts = {}, photoTemplates = defaultTemplate.photoTemplates) {
  const result = {};
  photoTemplates.forEach((photoTemplate, index) => {
    const fallback =
      defaultTemplate.photoLayouts[photoTemplate.id] ??
      [createPhotoCell(40 + index * 20, 240 + index * 20, 320, 420)];
    const saved = savedLayouts[photoTemplate.id];
    result[photoTemplate.id] =
      Array.isArray(saved) && saved.length
        ? saved.map((cell, index) => ({ ...(fallback[index] ?? createPhotoCell(40, 240, 300, 300)), ...cell }))
        : structuredClone(fallback);
  });
  return result;
}

function buildDefaultScene(templateId, index = 0) {
  return {
    blocks: structuredClone(BLOCK_LIBRARY),
    blockOrder: [...BLOCK_ORDER],
    textBindings: structuredClone(defaultTemplate.textBindings),
    textStyles: structuredClone(defaultTemplate.textStyles),
    photoLayout: structuredClone(
      defaultTemplate.photoLayouts[templateId] ??
        [createPhotoCell(40 + index * 20, 240 + index * 20, 320, 420)]
    ),
  };
}

function buildEmptyScene() {
  return {
    blocks: {},
    blockOrder: [],
    textBindings: {},
    textStyles: {},
    photoLayout: [],
  };
}

function mergeTemplateScenes(savedScenes = {}, photoTemplates = defaultTemplate.photoTemplates) {
  const result = {};
  photoTemplates.forEach((photoTemplate, index) => {
    const fallback = buildDefaultScene(photoTemplate.id, index);
    const hasSavedScene = Object.prototype.hasOwnProperty.call(savedScenes ?? {}, photoTemplate.id);

    if (!hasSavedScene) {
      result[photoTemplate.id] = fallback;
      return;
    }

    const saved = savedScenes?.[photoTemplate.id] ?? {};
    const savedBlocks = saved.blocks ?? {};
    result[photoTemplate.id] = {
      blocks: mergeBlockMap(savedBlocks, {}),
      blockOrder: Array.isArray(saved.blockOrder)
        ? saved.blockOrder.filter((key) => Boolean(savedBlocks[key]))
        : [],
      textBindings: structuredClone(saved.textBindings ?? {}),
      textStyles: structuredClone(saved.textStyles ?? {}),
      photoLayout: Array.isArray(saved.photoLayout)
        ? saved.photoLayout.map((cell) => ({
            ...createPhotoCell(40, 240, 300, 300),
            ...cell,
          }))
        : [],
    };
  });
  return result;
}

async function saveTemplateToServer() {
  saveCurrentScene();
  const templatePayload = {
    ...template,
    users: [],
  };

  if (isFileMode()) {
    await writeLocalJson(["templates", "studio-template.json"], templatePayload);
    const sceneWrites = template.photoTemplates.map(async (item, index) => {
      const scenePayload = {
        id: item.id,
        name: item.name,
        scene: template.templateScenes?.[item.id] ?? {},
      };
      const safeName = (item.name || `Шаблон ${index + 1}`)
        .toLowerCase()
        .replace(/[^a-z0-9а-яё]+/gi, "-")
        .replace(/^-+|-+$/g, "") || `template-${index + 1}`;
      await writeLocalJson(["templates", "scenes", `${String(index + 1).padStart(2, "0")}-${safeName}.json`], scenePayload);
    });
    await Promise.all(sceneWrites);
    return { ok: true };
  }

  const response = await fetch(TEMPLATE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(templatePayload, null, 2),
  });

  if (!response.ok) {
    throw new Error(`Template save failed: ${response.status}`);
  }

  return response.json();
}

function getPhotoTemplateName(templateId) {
  return template.photoTemplates.find((item) => item.id === templateId)?.name ?? "Шаблон";
}

function getTemplateScene(templateId) {
  template.templateScenes ??= {};
  if (!template.templateScenes[templateId]) {
    template.templateScenes[templateId] = buildEmptyScene();
  }
  return template.templateScenes[templateId];
}

function getLayoutById(templateId) {
  return getTemplateScene(templateId).photoLayout ?? [];
}

function createSceneSnapshot(templateId = currentSceneTemplateId) {
  return {
    blocks: structuredClone(template.blocks),
    blockOrder: [...template.blockOrder],
    textBindings: structuredClone(template.textBindings),
    textStyles: structuredClone(template.textStyles),
    photoLayout: structuredClone(getLayoutById(templateId)),
  };
}

function saveCurrentScene() {
  if (!currentSceneTemplateId) return;
  template.templateScenes ??= {};
  template.templateScenes[currentSceneTemplateId] = createSceneSnapshot(currentSceneTemplateId);
}

function loadScene(templateId) {
  const scene = getTemplateScene(templateId);
  template.blocks = structuredClone(scene.blocks);
  template.blockOrder = [...scene.blockOrder];
  template.textBindings = structuredClone(scene.textBindings);
  template.textStyles = structuredClone(scene.textStyles);
  currentSceneTemplateId = templateId;
}

function ensureTemplateState() {
  if (!template.photoTemplates.length) {
    template.photoTemplates = [{ id: DEFAULT_PHOTO_TEMPLATE_ID, name: "Шаблон 1" }];
  }

  template.photoTemplates.forEach((item, index) => {
    getTemplateScene(item.id);
  });

  ensureBrandsState();

  if (!template.photoTemplates.some((item) => item.id === activePhotoLayout)) {
    activePhotoLayout = template.photoTemplates[0].id;
  }

  syncEmployeeBrandTemplate(employeeData.brandId);
}

function populatePhotoTemplateSelectors() {
  ensureTemplateState();
  const templateSwitcherLabel = document.querySelector("#photoLayoutSwitcher .mini-label");
  if (templateSwitcherLabel) {
    templateSwitcherLabel.textContent = "Шаблоны";
  }

  elements.photoCount.innerHTML = "";
  elements.adminPhotoTemplateSelect.innerHTML = "";

  const employeeTemplates = getAvailablePhotoTemplatesForBrand(employeeData.brandId);

  employeeTemplates.forEach((item) => {
    const employeeOption = document.createElement("option");
    employeeOption.value = item.id;
    employeeOption.textContent = item.name;
    elements.photoCount.append(employeeOption);
  });

  template.photoTemplates.forEach((item) => {
    const adminOption = document.createElement("option");
    adminOption.value = item.id;
    adminOption.textContent = item.name;
    elements.adminPhotoTemplateSelect.append(adminOption);
  });

  syncEmployeeBrandTemplate(employeeData.brandId);
  elements.photoCount.value = employeeData.photoTemplateId;
  elements.adminPhotoTemplateSelect.value = activePhotoLayout;
  elements.adminPhotoTemplateName.value = getPhotoTemplateName(activePhotoLayout);
  renderPhotoTemplateList();
}

function createPhotoTemplate() {
  const nextIndex = template.photoTemplates.length + 1;
  const id = `template_${Date.now()}`;
  const name = `Шаблон ${nextIndex}`;
  saveCurrentScene();
  template.photoTemplates.push({ id, name });
  template.templateScenes[id] = buildEmptyScene();
  template.brands.forEach((brand) => {
    brand.templateIds = Array.from(new Set([...(brand.templateIds ?? []), id]));
    brand.defaultTemplateId ??= id;
  });
  return id;
}

function duplicatePhotoTemplate(templateId) {
  const source = template.photoTemplates.find((item) => item.id === templateId);
  const sourceScene = getTemplateScene(templateId);
  const nextIndex = template.photoTemplates.length + 1;
  const id = `template_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  template.photoTemplates.push({
    id,
    name: `${source?.name || `Шаблон ${nextIndex}`} копия`,
  });
  template.templateScenes[id] = structuredClone(sourceScene);
  template.brands.forEach((brand) => {
    brand.templateIds = Array.from(new Set([...(brand.templateIds ?? []), id]));
    brand.defaultTemplateId ??= id;
  });
  return id;
}

function resetPhotoTemplateScene(templateId) {
  template.templateScenes[templateId] = buildEmptyScene();
}

function renderPhotoTemplateList() {
  if (!elements.photoTemplateList) return;
  elements.photoTemplateList.innerHTML = "";

  template.photoTemplates.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "item-chip";
    button.textContent = item.name;
    button.classList.toggle("is-active", item.id === activePhotoLayout);
    button.addEventListener("click", () => {
      saveCurrentScene();
      activePhotoLayout = item.id;
      if (editorLayer === "photos") {
        selection = { type: "photo", layout: activePhotoLayout, index: 0 };
        ensureValidSelection();
      }
      loadScene(activePhotoLayout);
      populatePhotoTemplateSelectors();
      renderItemList();
      syncSelectionInspector();
      renderOverlay();
    });
    elements.photoTemplateList.append(button);
  });
}

function syncEmployeeInputs() {
  const employeeTemplateLabel = elements.photoCountField?.querySelector("span");
  if (employeeTemplateLabel) {
    employeeTemplateLabel.textContent = "Шаблон";
  }
  populateEmployeeUserSelect();
  populatePhotoTemplateSelectors();
  renderEmployeeFieldInputs();
  populateBrandSelect();
  syncEmployeeFieldVisibility();
  syncEmployeeAccess();
}

function syncTemplateInputs() {
  if (elements.adminPin) {
    elements.adminPin.value = template.security.adminPin ?? defaultTemplate.security.adminPin;
  }
  elements.canvasWidth.value = template.canvas.width;
  elements.canvasHeight.value = template.canvas.height;
  elements.headerBackground.value = template.theme.headerBackground;
  elements.footerBackground.value = template.theme.footerBackground;
  elements.canvasBackground.value = template.canvas.backgroundColor;
  elements.guideColor.value = template.canvas.guideColor;
  elements.showGuides.checked = template.canvas.showGuides;
  elements.storeTitle.value = template.store.title;
  elements.storeSubtitle.value = template.store.subtitle;
  elements.storeTitleSize.value = template.store.titleSize;
  elements.storeSubtitleSize.value = template.store.subtitleSize;
  elements.storeTextColor.value = template.theme.storeTextColor;
  elements.brandTextColor.value = template.theme.brandTextColor;
  elements.footerTextColor.value = template.theme.footerTextColor;
  elements.priceTextColor.value = template.theme.priceTextColor;
}

function getCurrentEmployeeUser() {
  return users.find((user) => user.id === currentEmployeeUserId) ?? null;
}

function setCurrentEmployeeUser(userId) {
  currentEmployeeUserId = userId;
}

function isAdminUnlocked() {
  return adminUnlocked;
}

function unlockAdminSession() {
  adminUnlocked = true;
}

function lockAdminSession() {
  adminUnlocked = false;
}

function syncAppStateClasses() {
  const isLoggedIn = Boolean(getCurrentEmployeeUser());
  document.body.classList.toggle("app-state-login", currentMode === "employee" && !isLoggedIn);
  document.body.classList.toggle("app-state-employee", currentMode === "employee" && isLoggedIn);
  document.body.classList.toggle("app-state-admin", currentMode === "admin");
  document.body.classList.toggle("app-route-admin", isAdminRoute());
  document.body.classList.toggle(
    "app-state-compose-details",
    currentMode === "employee" && isLoggedIn && employeeView === "compose" && employeeComposeStep === "details"
  );
  document.body.classList.toggle(
    "app-state-compose-collage",
    currentMode === "employee" && isLoggedIn && employeeView === "compose" && employeeComposeStep === "collage"
  );

  if (elements.employeeAuthShell) {
    elements.employeeAuthShell.classList.toggle("is-authenticated", isLoggedIn);
  }
}

function activateMode(mode) {
  currentMode = mode;
  elements.modeButtons.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.mode === mode);
  });
  elements.panels.forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.panel !== mode);
  });
  elements.overlay.classList.remove("is-hidden");
  syncAppStateClasses();
  loadScene(mode === "admin" ? activePhotoLayout : employeeData.photoTemplateId);
  renderOverlay();
  scheduleRender();
}

function requestAdminAccess(providedPin) {
  const pin = typeof providedPin === "string" ? providedPin : window.prompt("Введите PIN для входа в админку");
  if (pin === null) {
    return false;
  }

  if (pin !== (template.security.adminPin ?? defaultTemplate.security.adminPin)) {
    alert("Неверный PIN-код.");
    return false;
  }

  unlockAdminSession();
  return true;
}

function bindModeSwitch() {
  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      saveCurrentScene();
      const nextMode = button.dataset.mode;
      if (nextMode === "admin" && !isAdminUnlocked() && !requestAdminAccess()) {
        activateMode("employee");
        return;
      }
      activateMode(nextMode);
    });
  });
}

function activateEmployeeView(view) {
  employeeView = view;
  elements.employeeViewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.employeeView === view);
  });
  elements.employeeViewPanels.forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.employeeViewPanel !== view);
  });
  syncAppStateClasses();
  if (view === "history") {
    loadEmployeeHistory().catch((error) => {
      console.error("Employee history load failed", error);
    });
  }
}

function activateEmployeeComposeStep(step) {
  employeeComposeStep = step;
  elements.employeeComposeStepButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.employeeComposeStep === step);
  });

  if (elements.employeePrimaryFields) {
    elements.employeePrimaryFields.classList.toggle("is-hidden", step !== "details");
  }

  if (elements.employeeCustomFields) {
    elements.employeeCustomFields.classList.toggle("is-hidden", step !== "details");
  }

  if (elements.employeeComposeCollage) {
    elements.employeeComposeCollage.classList.toggle("is-hidden", step !== "collage");
  }

  if (elements.employeeNextStep) {
    elements.employeeNextStep.style.display = step === "details" ? "" : "none";
  }

  if (elements.employeeBackStep) {
    elements.employeeBackStep.style.display = step === "collage" ? "" : "none";
  }

  if (elements.downloadPng) {
    elements.downloadPng.style.display = step === "collage" ? "" : "none";
  }

  if (elements.resetEmployee) {
    elements.resetEmployee.textContent = step === "details" ? "Сбросить" : "Сбросить всё";
  }

  if (elements.employeeComposeActions) {
    const targetHost =
      step === "collage" && elements.employeePreviewActionsHost
        ? elements.employeePreviewActionsHost
        : elements.employeeComposeActionsHost;
    if (targetHost && elements.employeeComposeActions.parentElement !== targetHost) {
      targetHost.appendChild(elements.employeeComposeActions);
    }
  }

  syncAppStateClasses();
}

function activateAdminView(view) {
  adminView = view;
  elements.adminViewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminView === view);
  });
  elements.adminViewPanels.forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.adminViewPanel !== view);
  });
  if (view === "history") {
    loadAdminHistory().catch((error) => {
      console.error("Admin history load failed", error);
    });
  }
}

function bindWorkspaceTabs() {
  activateEmployeeView(employeeView);
  activateEmployeeComposeStep(employeeComposeStep);
  activateAdminView(adminView);

  elements.employeeViewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateEmployeeView(button.dataset.employeeView);
    });
  });

  elements.employeeComposeStepButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateEmployeeComposeStep(button.dataset.employeeComposeStep);
    });
  });

  elements.adminViewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateAdminView(button.dataset.adminView);
    });
  });
}

function bindSecretAdminTrigger() {
  const trigger = elements.secretAdminTrigger || elements.heroBadge;
  if (!trigger) return;

  trigger.addEventListener("click", () => {
    const now = Date.now();
    if (now - adminTapState.lastTime > 1800) {
      adminTapState.count = 0;
    }
    adminTapState.lastTime = now;
    adminTapState.count += 1;

    if (adminTapState.count < 5) return;

    adminTapState.count = 0;
    if (!isAdminUnlocked() && !requestAdminAccess()) {
      return;
    }
    saveCurrentScene();
    activateMode("admin");
  });
}

function bindEmployeeInputs() {
  if (elements.loginUser) {
    if (elements.loginUser.dataset.bound !== "true") {
      elements.loginUser.dataset.bound = "true";
      elements.loginUser.addEventListener("click", async () => {
        if (isAdminRoute()) {
          if (!requestAdminAccess(elements.employeeUserPin.value.trim())) {
            return;
          }
          elements.employeeUserPin.value = "";
          activateMode("admin");
          return;
        }

        let selectedUser = users.find((user) => user.id === elements.employeeUserSelect.value) ?? users[0];
        if (!selectedUser) {
          ensureFallbackUsers();
          populateEmployeeUserSelect();
          selectedUser = users.find((user) => user.id === elements.employeeUserSelect.value) ?? users[0];
        }
        if (!selectedUser) {
          alert("Выбери пользователя.");
          return;
        }

        if (elements.employeeUserPin.value !== selectedUser.pin) {
          alert("Неверный PIN сотрудника.");
          return;
        }

        setCurrentEmployeeUser(selectedUser.id);
        elements.employeeUserPin.value = "";
        employeeData.brandId = selectedUser.brandIds?.[0] ?? null;
        applyBrandFieldDefaults(employeeData.brandId, { replace: true });
        syncEmployeeBrandTemplate(employeeData.brandId, { forceDefault: true });
        activateEmployeeComposeStep("details");
        activateEmployeeView("compose");
        populateBrandSelect();
        syncEmployeeInputs();
        scheduleRender();
      });
    }
  }

  if (elements.logoutUser) {
    if (elements.logoutUser.dataset.bound !== "true") {
      elements.logoutUser.dataset.bound = "true";
      elements.logoutUser.addEventListener("click", () => {
        setCurrentEmployeeUser(null);
        elements.employeeUserPin.value = "";
        employeeHistory = [];
        activateEmployeeComposeStep("details");
        syncEmployeeInputs();
        scheduleRender();
      });
    }
  }

  if (elements.employeeWorkspaceLogout) {
    if (elements.employeeWorkspaceLogout.dataset.bound !== "true") {
      elements.employeeWorkspaceLogout.dataset.bound = "true";
      elements.employeeWorkspaceLogout.addEventListener("click", () => {
        setCurrentEmployeeUser(null);
        elements.employeeUserPin.value = "";
        activateEmployeeComposeStep("details");
        syncEmployeeInputs();
        scheduleRender();
      });
    }
  }

  if (elements.employeeHistorySearch) {
    elements.employeeHistorySearch.addEventListener("input", (event) => {
      employeeHistoryQuery = event.target.value;
      window.clearTimeout(employeeHistorySearchTimer);
      employeeHistorySearchTimer = window.setTimeout(() => {
        loadEmployeeHistory().catch((error) => {
          console.error("Employee history load failed", error);
        });
      }, 220);
    });
  }

  if (elements.adminHistorySearch) {
    elements.adminHistorySearch.addEventListener("input", (event) => {
      adminHistoryQuery = event.target.value;
      window.clearTimeout(adminHistorySearchTimer);
      adminHistorySearchTimer = window.setTimeout(() => {
        loadAdminHistory().catch((error) => {
          console.error("Admin history load failed", error);
        });
      }, 220);
    });
  }

  if (elements.employeeHistorySort) {
    elements.employeeHistorySort.addEventListener("change", (event) => {
      employeeHistorySort = event.target.value;
      loadEmployeeHistory().catch((error) => {
        console.error("Employee history load failed", error);
      });
    });
  }

  if (elements.adminHistorySort) {
    elements.adminHistorySort.addEventListener("change", (event) => {
      adminHistorySort = event.target.value;
      loadAdminHistory().catch((error) => {
        console.error("Admin history load failed", error);
      });
    });
  }

  elements.historyViewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const scope = button.dataset.historyScope;
      const view = button.dataset.historyView;
      if (scope === "employee") {
        employeeHistoryView = view;
        renderEmployeeHistoryList();
      } else if (scope === "admin") {
        adminHistoryView = view;
        renderAdminHistoryList();
      }
      elements.historyViewButtons.forEach((item) => {
        item.classList.toggle(
          "is-active",
          item.dataset.historyScope === scope && item.dataset.historyView === view
        );
      });
    });
  });

  elements.employeeHistoryRangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      employeeHistoryRange = button.dataset.historyRange || "all";
      loadEmployeeHistory().catch((error) => {
        console.error("Employee history load failed", error);
      });
    });
  });

  elements.adminHistoryRangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      adminHistoryRange = button.dataset.historyRange || "all";
      loadAdminHistory().catch((error) => {
        console.error("Admin history load failed", error);
      });
    });
  });

  if (elements.employeeHistoryLoadMore) {
    elements.employeeHistoryLoadMore.addEventListener("click", async () => {
      await loadEmployeeHistory({ append: true });
    });
  }

  if (elements.adminHistoryLoadMore) {
    elements.adminHistoryLoadMore.addEventListener("click", async () => {
      await loadAdminHistory({ append: true });
    });
  }

  if (elements.employeeHistoryDownloadSelected) {
    elements.employeeHistoryDownloadSelected.addEventListener("click", async () => {
      await downloadSelectedHistoryRecords("employee");
    });
  }

  if (elements.adminHistoryDownloadSelected) {
    elements.adminHistoryDownloadSelected.addEventListener("click", async () => {
      await downloadSelectedHistoryRecords("admin");
    });
  }

  if (elements.employeeHistoryDeleteSelected) {
    elements.employeeHistoryDeleteSelected.addEventListener("click", async () => {
      await deleteSelectedHistoryRecords("employee");
    });
  }

  if (elements.adminHistoryDeleteSelected) {
    elements.adminHistoryDeleteSelected.addEventListener("click", async () => {
      await deleteSelectedHistoryRecords("admin");
    });
  }

  [elements.historyPreviewBackdrop, elements.historyPreviewClose].forEach((element) => {
    if (element) {
      element.addEventListener("click", () => {
        closeHistoryPreview();
      });
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeHistoryPreview) {
      closeHistoryPreview();
    }
  });

  if (elements.employeeNextStep) {
    elements.employeeNextStep.addEventListener("click", () => {
      activateEmployeeComposeStep("collage");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (elements.employeeBackStep) {
    elements.employeeBackStep.addEventListener("click", () => {
      activateEmployeeComposeStep("details");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  elements.photoCount.addEventListener("change", () => {
    saveCurrentScene();
    employeeData.photoTemplateId = elements.photoCount.value;
    loadScene(employeeData.photoTemplateId);
    updatePhotoInputState();
    scheduleRender();
  });

  elements.brandSelect.addEventListener("change", () => {
    const currentUser = getCurrentEmployeeUser();
    if (currentUser) {
      const allowedBrandIds = currentUser.brandIds ?? [];
      if (!allowedBrandIds.includes(elements.brandSelect.value)) {
        elements.brandSelect.value = employeeData.brandId ?? allowedBrandIds[0] ?? "";
        return;
      }
    }
    employeeData.brandId = elements.brandSelect.value;
    applyBrandFieldDefaults(employeeData.brandId, { replace: true });
    syncEmployeeBrandTemplate(employeeData.brandId, { forceDefault: true });
    renderEmployeeFieldInputs();
    populatePhotoTemplateSelectors();
    updatePhotoInputState();
    if (currentMode === "employee") {
      loadScene(employeeData.photoTemplateId);
    }
    scheduleRender();
  });

  const handleEmployeeFieldChange = (event) => {
    const fieldId = event.target.dataset.fieldId;
    if (!fieldId) return;
    employeeData.values[fieldId] = event.target.value;
    scheduleRender();
  };
  elements.employeeCustomFields.addEventListener("input", handleEmployeeFieldChange);
  elements.employeeCustomFields.addEventListener("change", handleEmployeeFieldChange);

  elements.photoInputs.forEach((input, index) => {
    input.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      employeeData.photos[index] = file ? await fileToDataUrl(file) : null;
      employeeData.photoTransforms[index] = { scale: 1, offsetX: 0, offsetY: 0 };
      photoAdjustSelection = index;
      if (employeeData.photos[index]) {
        await loadImage(employeeData.photos[index]);
      }
      scheduleRender();
    });
  });

  elements.downloadPng.addEventListener("click", async () => {
    if (!getCurrentEmployeeUser()) {
      alert("Сначала войди как сотрудник.");
      return;
    }
    const productCode = getProductCodeFromState();
    let exportAsset;
    try {
      exportAsset = await exportCanvasPng(elements.canvas);
    } catch (error) {
      console.error("PNG export failed", error);
      alert("Не удалось подготовить PNG для скачивания.");
      return;
    }

    triggerBlobDownload(exportAsset.blob, buildSafeFileName(productCode));

    try {
      const imageDataUrl = exportAsset.dataUrl ?? (await blobToDataUrl(exportAsset.blob));
      await saveCollageHistory(imageDataUrl);
    } catch (error) {
      console.error("History save failed", error);
      alert(
        isFileMode()
          ? getServerLaunchMessage("Сохранение коллажа в историю")
          : "Не удалось сохранить коллаж в историю."
      );
    }
  });

  elements.resetEmployee.addEventListener("click", () => {
    saveCurrentScene();
    const currentUser = getCurrentEmployeeUser();
    employeeData = {
      ...defaultEmployeeData,
      photoTemplateId: template.photoTemplates[0]?.id ?? DEFAULT_PHOTO_TEMPLATE_ID,
      brandId: currentUser?.brandIds?.[0] ?? template.brands[0]?.id ?? null,
      values: buildDefaultFieldValues(template.fields),
    };
    applyBrandFieldDefaults(employeeData.brandId, { replace: true });
    syncEmployeeBrandTemplate(employeeData.brandId, { forceDefault: true });
    photoAdjustSelection = 0;
    elements.photoInputs.forEach((input) => {
      input.value = "";
    });
    if (currentMode === "employee") {
      loadScene(employeeData.photoTemplateId);
    }
    activateEmployeeComposeStep("details");
    syncEmployeeInputs();
    populateBrandSelect();
    updatePhotoInputState();
    scheduleRender();
  });
}

function bindAdminInputs() {
  if (elements.adminPin) {
    elements.adminPin.addEventListener("input", () => {
      template.security.adminPin = elements.adminPin.value.trim() || defaultTemplate.security.adminPin;
    });
  }

  if (elements.lockAdmin) {
    elements.lockAdmin.addEventListener("click", () => {
      lockAdminSession();
      activateMode("employee");
      if (isAdminRoute()) {
        goToEmployeeRoute();
      }
    });
  }

  [
    [elements.canvasWidth, () => (template.canvas.width = numberValue(elements.canvasWidth, 1080))],
    [elements.canvasHeight, () => (template.canvas.height = numberValue(elements.canvasHeight, 1620))],
  ].forEach(([element, apply]) => {
    element.addEventListener("input", () => {
      apply();
      clampItemsToCanvas();
      renderOverlay();
      scheduleRender();
    });
  });

  [
    [elements.headerBackground, "headerBackground"],
    [elements.footerBackground, "footerBackground"],
    [elements.canvasBackground, "canvasBackground"],
    [elements.storeTextColor, "storeTextColor"],
    [elements.brandTextColor, "brandTextColor"],
    [elements.footerTextColor, "footerTextColor"],
    [elements.priceTextColor, "priceTextColor"],
    [elements.guideColor, "guideColor"],
  ].forEach(([element, key]) => {
    element.addEventListener("input", () => {
      if (key === "guideColor") {
        template.canvas.guideColor = element.value;
      } else if (key === "canvasBackground") {
        template.canvas.backgroundColor = element.value;
      } else if (key === "headerBackground") {
        template.theme.headerBackground = element.value;
        template.blocks.header.fill = element.value;
      } else if (key === "footerBackground") {
        template.theme.footerBackground = element.value;
        template.blocks.footer.fill = element.value;
      } else {
        template.theme[key] = element.value;
      }
      scheduleRender();
    });
  });

  elements.showGuides.addEventListener("change", () => {
    template.canvas.showGuides = elements.showGuides.checked;
    scheduleRender();
  });

  [
    [elements.storeTitle, "title"],
    [elements.storeSubtitle, "subtitle"],
    [elements.storeTitleSize, "titleSize", true],
    [elements.storeSubtitleSize, "subtitleSize", true],
  ].forEach(([element, key, numeric]) => {
    element.addEventListener("input", () => {
      template.store[key] = numeric ? numberValue(element, template.store[key]) : element.value;
      scheduleRender();
    });
  });

  elements.editBlocksBtn.addEventListener("click", () => {
    editorLayer = "blocks";
    selection = { type: "block", key: selection.type === "block" ? selection.key : "header" };
    syncEditorLayerState();
    renderItemList();
    syncSelectionInspector();
    renderOverlay();
  });

  elements.editPhotosBtn.addEventListener("click", () => {
    editorLayer = "photos";
    selection =
      selection.type === "photo"
        ? selection
        : { type: "photo", layout: activePhotoLayout, index: 0 };
    ensureValidSelection();
    syncEditorLayerState();
    renderItemList();
    syncSelectionInspector();
    renderOverlay();
  });

  elements.photoLayoutTabs.forEach((tab) => {
    tab.style.display = "none";
    tab.addEventListener("click", () => {
      activePhotoLayout = String(tab.dataset.layout);
      if (editorLayer === "photos") {
        selection = { type: "photo", layout: activePhotoLayout, index: 0 };
        ensureValidSelection();
      }
      syncEditorLayerState();
      renderItemList();
      syncSelectionInspector();
      renderOverlay();
    });
  });

  elements.adminPhotoTemplateSelect.addEventListener("change", () => {
    saveCurrentScene();
    activePhotoLayout = elements.adminPhotoTemplateSelect.value;
    loadScene(activePhotoLayout);
    if (editorLayer === "photos") {
      selection = { type: "photo", layout: activePhotoLayout, index: 0 };
      ensureValidSelection();
    }
    populatePhotoTemplateSelectors();
    renderItemList();
    syncSelectionInspector();
    renderOverlay();
  });

  elements.adminPhotoTemplateName.addEventListener("input", () => {
    const current = template.photoTemplates.find((item) => item.id === activePhotoLayout);
    if (!current) return;
    current.name = elements.adminPhotoTemplateName.value || "Шаблон";
    populatePhotoTemplateSelectors();
  });

  elements.addPhotoTemplate.addEventListener("click", () => {
    activePhotoLayout = createPhotoTemplate();
    loadScene(activePhotoLayout);
    selection = { type: "photo", layout: activePhotoLayout, index: 0 };
    populatePhotoTemplateSelectors();
    updatePhotoInputState();
    renderItemList();
    syncSelectionInspector();
    renderOverlay();
    scheduleRender();
  });

  elements.clearPhotoTemplate.addEventListener("click", () => {
    saveCurrentScene();
    resetPhotoTemplateScene(activePhotoLayout);
    loadScene(activePhotoLayout);
    selection =
      editorLayer === "photos"
        ? { type: "photo", layout: activePhotoLayout, index: 0 }
        : { type: "block", key: getExistingBlockKey() };
    renderItemList();
    syncSelectionInspector();
    renderOverlay();
    scheduleRender();
  });

  elements.duplicatePhotoTemplate.addEventListener("click", () => {
    saveCurrentScene();
    activePhotoLayout = duplicatePhotoTemplate(activePhotoLayout);
    loadScene(activePhotoLayout);
    selection =
      editorLayer === "photos"
        ? { type: "photo", layout: activePhotoLayout, index: 0 }
        : { type: "block", key: getExistingBlockKey() };
    populatePhotoTemplateSelectors();
    updatePhotoInputState();
    renderItemList();
    syncSelectionInspector();
    renderOverlay();
    scheduleRender();
  });

  elements.removePhotoTemplate.addEventListener("click", () => {
    if (template.photoTemplates.length <= 1) return;
    const removedTemplateId = activePhotoLayout;
    saveCurrentScene();
    template.photoTemplates = template.photoTemplates.filter((item) => item.id !== activePhotoLayout);
    delete template.templateScenes[activePhotoLayout];
    template.brands.forEach((brand) => {
      brand.templateIds = (brand.templateIds ?? []).filter((templateId) => templateId !== removedTemplateId);
      if (!brand.templateIds.length && template.photoTemplates[0]?.id) {
        brand.templateIds = [template.photoTemplates[0].id];
      }
      if (!brand.templateIds.includes(brand.defaultTemplateId)) {
        brand.defaultTemplateId = brand.templateIds[0] ?? null;
      }
    });
    activePhotoLayout = template.photoTemplates[0].id;
    if (employeeData.photoTemplateId === removedTemplateId) {
      employeeData.photoTemplateId = activePhotoLayout;
    } else if (!template.photoTemplates.some((item) => item.id === employeeData.photoTemplateId)) {
      employeeData.photoTemplateId = template.photoTemplates[0].id;
    }
    loadScene(activePhotoLayout);
    selection = { type: "photo", layout: activePhotoLayout, index: 0 };
    populatePhotoTemplateSelectors();
    updatePhotoInputState();
    renderItemList();
    syncSelectionInspector();
    renderOverlay();
    scheduleRender();
  });

  elements.bindingPrimary.addEventListener("change", () => {
    if (selection.type !== "block" || !isBindableBlock(selection.key)) return;
    template.textBindings[selection.key] ??= { primary: "", secondary: "" };
    template.textBindings[selection.key].primary = elements.bindingPrimary.value;
    syncEmployeeFieldVisibility();
    scheduleRender();
  });

  elements.bindingSecondary.addEventListener("change", () => {
    if (selection.type !== "block" || !isBindableBlock(selection.key)) return;
    template.textBindings[selection.key] ??= { primary: "", secondary: "" };
    template.textBindings[selection.key].secondary = elements.bindingSecondary.value;
    syncEmployeeFieldVisibility();
    scheduleRender();
  });

  elements.textColor.addEventListener("input", () => {
    if (selection.type !== "block" || !isBindableBlock(selection.key)) return;
    template.textStyles[selection.key] ??= { color: "#121212", align: "center" };
    template.textStyles[selection.key].color = elements.textColor.value;
    scheduleRender();
  });

  elements.textAlign.addEventListener("change", () => {
    if (selection.type !== "block" || !isBindableBlock(selection.key)) return;
    template.textStyles[selection.key] ??= { color: "#121212", align: "center" };
    template.textStyles[selection.key].align = elements.textAlign.value;
    scheduleRender();
  });

  elements.customImageUpload.addEventListener("change", async (event) => {
    if (selection.type !== "block") return;
    const block = template.blocks[selection.key];
    if (!block || block.kind !== "custom-image") return;

    const file = event.target.files?.[0];
    block.imageSrc = file ? await fileToDataUrl(file) : null;
    if (block.imageSrc) {
      await loadImage(block.imageSrc);
    }
    scheduleRender();
  });

  [
    [elements.itemX, "x"],
    [elements.itemY, "y"],
    [elements.itemWidth, "width"],
    [elements.itemHeight, "height"],
    [elements.itemRadius, "radius"],
    [elements.itemBorderWidth, "borderWidth"],
  ].forEach(([element, key]) => {
    element.addEventListener("input", () => {
      const item = getSelectedItem();
      if (!item) return;
      item[key] = clampNumber(numberValue(element, item[key]), key);
      clampItem(item);
      renderOverlay();
      scheduleRender();
    });
  });

  [
    [elements.itemFill, "fill"],
    [elements.itemStroke, "stroke"],
  ].forEach(([element, key]) => {
    element.addEventListener("input", () => {
      const item = getSelectedItem();
      if (!item) return;
      item[key] = element.value;
      renderOverlay();
      scheduleRender();
    });
  });

  elements.addPhotoCell.addEventListener("click", () => {
    const layout = getLayoutById(activePhotoLayout);
    if (layout.length >= elements.photoInputs.length) return;
    const offset = 40 * layout.length;
    layout.push(createPhotoCell(80 + offset, 260 + offset, 260, 360));
    selection = { type: "photo", layout: activePhotoLayout, index: layout.length - 1 };
    renderItemList();
    syncSelectionInspector();
    renderOverlay();
    scheduleRender();
  });

  elements.insertBlock.addEventListener("click", () => {
    const value = elements.availableBlockSelect.value;
    if (!value) return;

    if (value.startsWith("new:")) {
      const kind = value.split(":")[1];
      const { id, block } = createCustomBlock(kind);
      template.blocks[id] = block;
      template.blockOrder.push(id);
      if (kind === "text") {
        template.textBindings[id] = { primary: "", secondary: "" };
        template.textStyles[id] = { color: "#121212", align: "left" };
      }
      selection = { type: "block", key: id };
    } else if (value.startsWith("system:")) {
      const key = value.split(":")[1];
      if (!key || template.blocks[key]) return;
      template.blocks[key] = structuredClone(BLOCK_LIBRARY[key]);
      template.blockOrder = [...template.blockOrder.filter((item) => item !== key), key];
      selection = { type: "block", key };
    } else {
      return;
    }

    renderAvailableBlocks();
    renderItemList();
    syncSelectionInspector();
    renderOverlay();
    scheduleRender();
  });

  elements.addEmployeeField.addEventListener("click", () => {
    const field = createEmployeeField();
    template.fields.push(field);
    employeeData.values[field.id] = field.defaultValue;
    renderEmployeeFieldInputs();
    renderEmployeeFieldAdminList();
    syncSelectionInspector();
    scheduleRender();
  });

  if (elements.brandFieldSettingsSelect) {
    elements.brandFieldSettingsSelect.addEventListener("change", () => {
      activeBrandSettingsId = elements.brandFieldSettingsSelect.value || template.brands[0]?.id ?? null;
      renderEmployeeFieldAdminList();
    });
  }

  elements.removeSelected.addEventListener("click", () => {
    if (selection.type === "photo") {
      const layout = getLayoutById(selection.layout);
      if (layout.length <= 1) return;
      layout.splice(selection.index, 1);
      selection.index = Math.max(0, selection.index - 1);
      ensureValidSelection();
      renderItemList();
      syncSelectionInspector();
      renderOverlay();
      scheduleRender();
      return;
    }

    if (selection.type === "block") {
      delete template.textBindings[selection.key];
      delete template.textStyles[selection.key];
      delete template.blocks[selection.key];
      template.blockOrder = template.blockOrder.filter((key) => key !== selection.key);
      selection = { type: "block", key: getExistingBlockKey() };
      renderAvailableBlocks();
      renderItemList();
      syncSelectionInspector();
      renderOverlay();
      scheduleRender();
    }
  });

  elements.storeLogoUpload.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    template.store.logo = file ? await fileToDataUrl(file) : null;
    if (template.store.logo) {
      await loadImage(template.store.logo);
    }
    scheduleRender();
  });

  elements.leftBadgeUpload.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    template.store.leftBadge = file ? await fileToDataUrl(file) : null;
    if (template.store.leftBadge) {
      await loadImage(template.store.leftBadge);
    }
    scheduleRender();
  });

  elements.rightBadgeUpload.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    template.store.rightBadge = file ? await fileToDataUrl(file) : null;
    if (template.store.rightBadge) {
      await loadImage(template.store.rightBadge);
    }
    scheduleRender();
  });

  elements.addBrand.addEventListener("click", () => {
    template.brands.push(
      createBrandProfile(
        `Brand ${String(template.brands.length + 1).padStart(2, "0")}`,
        template.photoTemplates
      )
    );
    renderBrandAdminList();
    renderUserAdminList();
    populateBrandSelect();
    renderEmployeeFieldAdminList();
    scheduleRender();
  });

  if (elements.addUser) {
    elements.addUser.addEventListener("click", () => {
      users.push(createEmployeeUser());
      renderUserAdminList();
      populateEmployeeUserSelect();
      saveUsersToServer().catch((error) => {
        console.error("Users save failed", error);
      });
    });
  }

  elements.saveTemplate.addEventListener("click", async () => {
    try {
      await saveTemplateToServer();
      alert("Шаблон сохранён в файл.");
    } catch (error) {
      console.error("Template save failed", error);
      alert(
        isFileMode()
          ? getServerLaunchMessage("Сохранение шаблона в файл")
          : "Не удалось сохранить шаблон в файл. Проверь локальный сервер."
      );
    }
  });

  elements.exportTemplate.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pera-template-${Date.now()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 600);
  });

  elements.resetTemplate.addEventListener("click", async () => {
    template = structuredClone(defaultTemplate);
    template.templateScenes = mergeTemplateScenes({}, template.photoTemplates);
    employeeData.brandId = template.brands[0]?.id ?? null;
    employeeData.photoTemplateId = template.photoTemplates[0]?.id ?? DEFAULT_PHOTO_TEMPLATE_ID;
    employeeData.values = buildDefaultFieldValues(template.fields);
    applyBrandFieldDefaults(employeeData.brandId, { replace: true });
    setCurrentEmployeeUser(null);
    employeeHistory = [];
    editorLayer = "blocks";
    activeBrandSettingsId = template.brands[0]?.id ?? null;
    activePhotoLayout = template.photoTemplates[1]?.id ?? template.photoTemplates[0]?.id ?? DEFAULT_PHOTO_TEMPLATE_ID;
    loadScene(activePhotoLayout);
    selection = { type: "block", key: "header" };
    syncTemplateInputs();
    syncEmployeeInputs();
    renderBrandAdminList();
    renderUserAdminList();
    populateBrandSelect();
    renderEmployeeFieldAdminList();
    syncEditorLayerState();
    renderAvailableBlocks();
    renderItemList();
    syncSelectionInspector();
    syncEmployeeFieldVisibility();
    renderOverlay();
    scheduleRender();
    try {
      await saveTemplateToServer();
    } catch (error) {
      console.error("Template reset save failed", error);
    }
  });
}

function bindOverlayPointer() {
  elements.overlay.addEventListener("pointerdown", (event) => {
    if (currentMode === "employee") {
      handleEmployeePointerDown(event);
      return;
    }

    const itemElement = event.target.closest(".editor-item");
    if (!itemElement) return;

    if (editorLayer === "photos") {
      if (selection.type !== "photo") {
        selection = { type: "photo", layout: activePhotoLayout, index: 0 };
        ensureValidSelection();
      }
    } else {
      const type = itemElement.dataset.kind === "photo" ? "photo" : "block";
      if (type === "block") {
        selection = { type: "block", key: itemElement.dataset.key };
      } else {
        selection = {
          type: "photo",
          layout: String(itemElement.dataset.layout),
          index: Number(itemElement.dataset.index),
        };
      }
    }

    const item = getSelectedItem();
    if (!item) return;

    const rect = elements.overlay.getBoundingClientRect();
    const scale = template.canvas.width / rect.width;
    dragState = {
      action: event.target.classList.contains("resize-handle") ? "resize" : "move",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startItem: { ...item },
      scale,
    };

    elements.overlay.setPointerCapture(event.pointerId);
    syncSelectionInspector();
    renderItemList();
    renderOverlay();
  });

  elements.overlay.addEventListener("pointermove", (event) => {
    if (currentMode === "employee") {
      handleEmployeePointerMove(event);
      return;
    }

    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const item = getSelectedItem();
    if (!item) return;

    const dx = (event.clientX - dragState.startX) * dragState.scale;
    const dy = (event.clientY - dragState.startY) * dragState.scale;

    if (dragState.action === "move") {
      item.x = Math.round(dragState.startItem.x + dx);
      item.y = Math.round(dragState.startItem.y + dy);
    } else {
      item.width = Math.round(Math.max(40, dragState.startItem.width + dx));
      item.height = Math.round(Math.max(40, dragState.startItem.height + dy));
    }

    clampItem(item);
    syncSelectionInspector();
    renderOverlay();
    scheduleRender();
  });

  const finish = (event) => {
    if (currentMode === "employee") {
      handleEmployeePointerUp(event);
      return;
    }
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    dragState = null;
    renderOverlay();
  };

  elements.overlay.addEventListener("pointerup", finish);
  elements.overlay.addEventListener("pointercancel", finish);
}

function renderBrandAdminList() {
  elements.brandAdminList.innerHTML = "";

  template.brands.forEach((brand) => {
    const row = document.createElement("div");
    row.className = "brand-row";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = brand.name;
    nameInput.placeholder = "ĞĞ°Ğ·Ğ²Ğ°Ğ½Ğ¸Ğµ Ğ±Ñ€ĞµĞ½Ğ´Ğ°";
    nameInput.addEventListener("input", () => {
      brand.name = nameInput.value;
      populateBrandSelect();
      renderUserAdminList();
      scheduleRender();
    });

    const logoInput = document.createElement("input");
    logoInput.type = "file";
    logoInput.accept = "image/*";
    logoInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      brand.logo = file ? await fileToDataUrl(file) : null;
      populateBrandSelect();
      if (brand.logo) {
        await loadImage(brand.logo);
      }
      renderUserAdminList();
      scheduleRender();
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Ğ£Ğ´Ğ°Ğ»Ğ¸Ñ‚ÑŒ";
    removeButton.addEventListener("click", () => {
      template.brands = template.brands.filter((item) => item.id !== brand.id);
      users.forEach((user) => {
        user.brandIds = (user.brandIds ?? []).filter((brandId) => brandId !== brand.id);
        if (!user.brandIds.length && template.brands[0]?.id) {
          user.brandIds = [template.brands[0].id];
        }
      });
      if (!template.brands.some((item) => item.id === employeeData.brandId)) {
        employeeData.brandId = template.brands[0]?.id ?? null;
      }
      renderBrandAdminList();
      renderUserAdminList();
      populateBrandSelect();
      saveUsersToServer().catch((error) => {
        console.error("Users save failed", error);
      });
      scheduleRender();
    });

    row.append(nameInput, logoInput, removeButton);
    elements.brandAdminList.append(row);
  });
}

function createEmployeeUser(index = users.length + 1) {
  return {
    id: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: `employee-${String(index).padStart(2, "0")}`,
    pin: "1111",
    brandIds: [template.brands[index - 1]?.id ?? template.brands[0]?.id].filter(Boolean),
  };
}

function populateEmployeeUserSelect() {
  if (!elements.employeeUserSelect) return;
  ensureFallbackUsers();
  elements.employeeUserSelect.innerHTML = "";
  users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = user.name;
    elements.employeeUserSelect.append(option);
  });

  if (currentEmployeeUserId && users.some((user) => user.id === currentEmployeeUserId)) {
    elements.employeeUserSelect.value = currentEmployeeUserId;
  } else if (users[0]) {
    elements.employeeUserSelect.value = users[0].id;
  } else {
    const fallbackOption = document.createElement("option");
    fallbackOption.value = "fallback_employee_01";
    fallbackOption.textContent = "employee-01";
    elements.employeeUserSelect.append(fallbackOption);
    elements.employeeUserSelect.value = fallbackOption.value;
  }
}

function syncEmployeeAccess() {
  const currentUser = getCurrentEmployeeUser();
  const isLoggedIn = Boolean(currentUser);
  const allowedBrandIds = currentUser?.brandIds?.filter((brandId) =>
    template.brands.some((brand) => brand.id === brandId)
  ) ?? [];
  const previousBrandId = employeeData.brandId;

  if (allowedBrandIds.length) {
    if (!allowedBrandIds.includes(employeeData.brandId)) {
      employeeData.brandId = allowedBrandIds[0];
    }
  }

  if (employeeData.brandId !== previousBrandId) {
    applyBrandFieldDefaults(employeeData.brandId, { replace: true });
  }
  syncEmployeeBrandTemplate(employeeData.brandId, {
    forceDefault: employeeData.brandId !== previousBrandId,
  });

  if (elements.employeeSessionHint) {
    elements.employeeSessionHint.textContent = currentUser
      ? `Вы вошли как ${currentUser.name}. Фирм в доступе: ${allowedBrandIds.length || 0}`
      : "Войди как сотрудник, чтобы создавать и сохранять свои коллажи.";
    elements.employeeSessionHint.style.display = isLoggedIn ? "" : "none";
  }

  if (elements.logoutUser) {
    elements.logoutUser.style.display = isLoggedIn ? "" : "none";
  }

  if (elements.employeeWorkspaceLogout) {
    elements.employeeWorkspaceLogout.style.display = isLoggedIn ? "" : "none";
  }

  if (elements.employeeWorkspace) {
    elements.employeeWorkspace.classList.toggle("is-hidden", !isLoggedIn);
  }

  syncAppStateClasses();

  if (elements.brandSelectField) {
    elements.brandSelectField.style.display = isLoggedIn ? "" : "none";
  }

  [elements.photoCount, elements.downloadPng, elements.resetEmployee, elements.employeeNextStep, elements.employeeBackStep].forEach((element) => {
    if (element) {
      element.disabled = !isLoggedIn;
    }
  });

  elements.employeeCustomFields
    .querySelectorAll("input, select, button, textarea")
    .forEach((element) => {
      element.disabled = !isLoggedIn;
    });

  updatePhotoInputState();
  renderEmployeeHistoryList();
}

async function loadEmployeeHistory(options = {}) {
  const { append = false } = options;
  const currentUser = getCurrentEmployeeUser();
  if (!currentUser) {
    employeeHistoryLoading = false;
    employeeHistory = [];
    employeeHistoryPage = 1;
    employeeHistoryHasMore = false;
    clearHistorySelection("employee");
    renderEmployeeHistoryList();
    return;
  }

  const nextPage = append ? employeeHistoryPage + 1 : 1;
  employeeHistoryLoading = true;
  renderEmployeeHistoryList();

  try {
    if (isFileMode()) {
      const allRecords = dedupeHistoryRecords(await listLocalHistorySummaryRecords());
      const result = applyHistoryQuery(allRecords, {
        userId: currentUser.id,
        query: employeeHistoryQuery,
        range: employeeHistoryRange,
        sort: employeeHistorySort,
        page: nextPage,
        limit: HISTORY_PAGE_LIMIT,
      });
      employeeHistory = append ? [...employeeHistory, ...result.records] : result.records;
      employeeHistoryPage = result.page;
      employeeHistoryHasMore = result.hasMore;
    } else {
      const params = new URLSearchParams({
        userId: currentUser.id,
        page: String(nextPage),
        limit: String(HISTORY_PAGE_LIMIT),
        search: employeeHistoryQuery,
        sort: employeeHistorySort,
        range: employeeHistoryRange,
      });
      const response = await fetch(`${COLLAGES_API_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`History load failed: ${response.status}`);
      }
      const payload = await response.json();
      const records = Array.isArray(payload.records) ? dedupeHistoryRecords(payload.records) : [];
      employeeHistory = append ? [...employeeHistory, ...records] : records;
      employeeHistoryPage = Number(payload.page || nextPage);
      employeeHistoryHasMore = Boolean(payload.hasMore);
    }
  } catch (error) {
    console.error("Employee history load failed", error);
    if (!append) {
      employeeHistory = [];
      employeeHistoryPage = 1;
      employeeHistoryHasMore = false;
    }
  } finally {
    employeeHistoryLoading = false;
  }

  const availableIds = new Set(employeeHistory.map((record) => record.id));
  setHistorySelection(
    "employee",
    new Set([...employeeHistorySelection].filter((recordId) => availableIds.has(recordId)))
  );
  renderEmployeeHistoryList();
}

async function loadAdminHistory(options = {}) {
  const { append = false } = options;
  const nextPage = append ? adminHistoryPage + 1 : 1;
  adminHistoryLoading = true;
  renderAdminHistoryList();
  try {
    if (isFileMode()) {
      const allRecords = dedupeHistoryRecords(await listLocalHistorySummaryRecords());
      const result = applyHistoryQuery(allRecords, {
        query: adminHistoryQuery,
        range: adminHistoryRange,
        sort: adminHistorySort,
        page: nextPage,
        limit: HISTORY_PAGE_LIMIT,
      });
      adminHistory = append ? [...adminHistory, ...result.records] : result.records;
      adminHistoryPage = result.page;
      adminHistoryHasMore = result.hasMore;
    } else {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(HISTORY_PAGE_LIMIT),
        search: adminHistoryQuery,
        sort: adminHistorySort,
        range: adminHistoryRange,
      });
      const response = await fetch(`${COLLAGES_API_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Admin history load failed: ${response.status}`);
      }
      const payload = await response.json();
      const records = Array.isArray(payload.records) ? dedupeHistoryRecords(payload.records) : [];
      adminHistory = append ? [...adminHistory, ...records] : records;
      adminHistoryPage = Number(payload.page || nextPage);
      adminHistoryHasMore = Boolean(payload.hasMore);
    }
  } catch (error) {
    console.error("Admin history load failed", error);
    if (!append) {
      adminHistory = [];
      adminHistoryPage = 1;
      adminHistoryHasMore = false;
    }
  } finally {
    adminHistoryLoading = false;
  }

  const availableIds = new Set(adminHistory.map((record) => record.id));
  setHistorySelection(
    "admin",
    new Set([...adminHistorySelection].filter((recordId) => availableIds.has(recordId)))
  );
  renderAdminHistoryList();
}

function createHistoryCard(record, viewMode, scope) {
  const card = document.createElement("article");
  card.className = `history-card history-card--${viewMode}`;
  card.classList.toggle("is-selected", isHistoryRecordSelected(scope, record.id));

  const preview = document.createElement("div");
  preview.className = "history-card-preview";
  preview.role = "button";
  preview.tabIndex = 0;
  preview.addEventListener("click", () => openHistoryPreview(record, scope));
  preview.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openHistoryPreview(record, scope);
    }
  });
  const previewSrc = getHistoryPreviewUrl(record);
  if (previewSrc) {
    const image = document.createElement("img");
    image.src = previewSrc;
    image.alt = getRecordDisplayName(record);
    image.loading = "lazy";
    image.decoding = "async";
    preview.append(image);
  } else {
    const empty = document.createElement("div");
    empty.className = "history-card-empty";
    empty.textContent = "Нет превью";
    preview.append(empty);
  }

  const selectToggle = document.createElement("button");
  selectToggle.type = "button";
  selectToggle.className = "history-select-toggle";
  selectToggle.textContent = isHistoryRecordSelected(scope, record.id) ? "Выбрано" : "Выбрать";
  selectToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleHistoryRecordSelection(scope, record.id);
  });
  preview.append(selectToggle);

  const content = document.createElement("div");
  content.className = "history-card-content";

  const info = getHistoryCardMeta(record);
  const topLine = document.createElement("div");
  topLine.className = "history-card-topline";
  topLine.innerHTML = `<span class="history-card-badge">${info.brandName}</span>${
    scope === "admin" ? `<span class="history-card-user">${info.userName}</span>` : ""
  }`;

  const title = document.createElement("strong");
  title.className = "history-card-title";
  title.textContent = info.title;

  const subtitle = document.createElement("span");
  subtitle.className = "history-card-subtitle";
  subtitle.textContent = info.subtitle;

  const actions = document.createElement("div");
  actions.className = "history-card-actions";

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.textContent = "Открыть";
  openButton.addEventListener("click", async () => {
    await openHistoryRecord(record);
    if (scope === "admin") {
      activateMode("employee");
      activateEmployeeView("compose");
    }
  });

  const downloadButton = document.createElement("a");
  downloadButton.className = "history-download";
  downloadButton.href = previewSrc || "#";
  downloadButton.download = buildSafeFileName(getRecordDisplayName(record));
  downloadButton.textContent = "Скачать";
  downloadButton.addEventListener("click", (event) => {
    if (!previewSrc) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    downloadHistoryRecord(record);
  });

  actions.append(openButton, downloadButton);
  content.append(topLine, title, subtitle, actions);
  card.append(preview, content);
  return card;
}

function createHistoryGrid(records, viewMode, scope) {
  const list = document.createElement("div");
  list.className = `history-card-grid history-card-grid--${viewMode}`;
  records.forEach((record) => {
    list.append(createHistoryCard(record, viewMode, scope));
  });
  return list;
}

function renderEmployeeHistoryList() {
  if (!elements.employeeHistoryList) return;
  elements.employeeHistoryList.innerHTML = "";
  syncHistoryRangeButtons("employee");
  syncHistoryPagination("employee");

  const currentUser = getCurrentEmployeeUser();
  if (!currentUser) {
    syncHistoryBulkBar("employee", []);
    syncHistoryPagination("employee");
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "Войди как сотрудник, чтобы видеть историю своих коллажей.";
    elements.employeeHistoryList.append(empty);
    return;
  }

  if (employeeHistoryLoading && !employeeHistory.length) {
    syncHistoryBulkBar("employee", []);
    syncHistoryPagination("employee");
    const loading = document.createElement("div");
    loading.className = "history-empty";
    loading.textContent = "Загружаем историю...";
    elements.employeeHistoryList.append(loading);
    return;
  }

  if (!employeeHistory.length) {
    syncHistoryBulkBar("employee", []);
    syncHistoryPagination("employee");
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "История пока пустая.";
    elements.employeeHistoryList.append(empty);
    return;
  }

  const visibleRecords = getVisibleEmployeeHistoryRecords();
  if (!visibleRecords.length) {
    syncHistoryBulkBar("employee", []);
    syncHistoryPagination("employee");
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "По этому запросу ничего не найдено.";
    elements.employeeHistoryList.append(empty);
    return;
  }

  syncHistoryBulkBar("employee", visibleRecords);
  syncHistoryPagination("employee");
  const groupedRecords = visibleRecords.reduce((groups, record) => {
    const key = record.brandName?.trim() || "Без бренда";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(record);
    return groups;
  }, new Map());

  groupedRecords.forEach((records, brandName) => {
    const group = document.createElement("section");
    group.className = "history-group";

    const head = document.createElement("div");
    head.className = "history-group-head";
    const title = document.createElement("h4");
    title.textContent = brandName;
    const count = document.createElement("span");
    count.textContent = `${records.length} шт.`;
    head.append(title, count);

    const list = createHistoryGrid(records, employeeHistoryView, "employee");
    group.append(head, list);
    elements.employeeHistoryList.append(group);
  });
}

function renderAdminHistoryList() {
  if (!elements.adminHistoryList) return;
  elements.adminHistoryList.innerHTML = "";
  syncHistoryRangeButtons("admin");
  syncHistoryPagination("admin");

  if (adminHistoryLoading && !adminHistory.length) {
    syncHistoryBulkBar("admin", []);
    syncHistoryPagination("admin");
    const loading = document.createElement("div");
    loading.className = "history-empty";
    loading.textContent = "Загружаем историю...";
    elements.adminHistoryList.append(loading);
    return;
  }

  if (!adminHistory.length) {
    syncHistoryBulkBar("admin", []);
    syncHistoryPagination("admin");
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "История сотрудников пока пустая.";
    elements.adminHistoryList.append(empty);
    return;
  }

  const visibleRecords = getVisibleAdminHistoryRecords();
  if (!visibleRecords.length) {
    syncHistoryBulkBar("admin", []);
    syncHistoryPagination("admin");
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "По этому запросу ничего не найдено.";
    elements.adminHistoryList.append(empty);
    return;
  }

  syncHistoryBulkBar("admin", visibleRecords);
  syncHistoryPagination("admin");
  const userGroups = visibleRecords.reduce((groups, record) => {
    const key = record.userName?.trim() || "Без пользователя";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(record);
    return groups;
  }, new Map());

  userGroups.forEach((userRecords, userName) => {
    const userGroup = document.createElement("section");
    userGroup.className = "history-group admin-history-group";

    const userHead = document.createElement("div");
    userHead.className = "history-group-head";
    const userTitle = document.createElement("h4");
    userTitle.textContent = userName;
    const userCount = document.createElement("span");
    userCount.textContent = `${userRecords.length} коллажей`;
    userHead.append(userTitle, userCount);

    const nestedGroups = document.createElement("div");
    nestedGroups.className = "history-nested-groups";

    const brandGroups = userRecords.reduce((groups, record) => {
      const key = record.brandName?.trim() || "Без бренда";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(record);
      return groups;
    }, new Map());

    brandGroups.forEach((records, brandName) => {
      const brandGroup = document.createElement("section");
      brandGroup.className = "history-group history-subgroup";

      const head = document.createElement("div");
      head.className = "history-group-head";
      const title = document.createElement("h4");
      title.textContent = brandName;
      const count = document.createElement("span");
      count.textContent = `${records.length} шт.`;
      head.append(title, count);

      const list = createHistoryGrid(records, adminHistoryView, "admin");
      brandGroup.append(head, list);
      nestedGroups.append(brandGroup);
    });

    userGroup.append(userHead, nestedGroups);
    elements.adminHistoryList.append(userGroup);
  });
}

async function openHistoryRecord(record) {
  let sourceRecord = record;
  if (!sourceRecord?.state) {
    try {
      if (isFileMode()) {
        sourceRecord = await readLocalHistoryRecordDetail(record);
      } else {
        const params = new URLSearchParams({ id: record.id ?? "" });
        if (record.brandSlug) {
          params.set("brandSlug", record.brandSlug);
        }
        const currentUser = getCurrentEmployeeUser();
        if (currentMode !== "admin" && currentUser?.id) {
          params.set("userId", currentUser.id);
        }
        const response = await fetch(`${COLLAGES_API_URL}?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`History detail load failed: ${response.status}`);
        }
        const payload = await response.json();
        sourceRecord = payload.record ?? record;
      }
    } catch (error) {
      console.error("History detail load failed", error);
      alert("Не удалось открыть этот коллаж.");
      return;
    }
  }

  if (!sourceRecord?.state) {
    alert("Полное состояние коллажа не найдено.");
    return;
  }

  const currentUser = getCurrentEmployeeUser();
  employeeData = {
    ...defaultEmployeeData,
    ...sourceRecord.state,
    photos: sourceRecord.state.photos ?? defaultEmployeeData.photos.map(() => null),
    photoTransforms:
      sourceRecord.state.photoTransforms ??
      defaultEmployeeData.photoTransforms.map(() => ({ scale: 1, offsetX: 0, offsetY: 0 })),
  };
  if (currentUser && !((currentUser.brandIds ?? []).includes(employeeData.brandId))) {
    employeeData.brandId = currentUser.brandIds?.[0] ?? employeeData.brandId;
  }
  if (currentMode === "employee") {
    loadScene(employeeData.photoTemplateId);
  }
  activateEmployeeView("compose");
  activateEmployeeComposeStep("collage");
  syncEmployeeInputs();
  syncEmployeeAccess();
  scheduleRender();
}

async function saveCollageHistory(imageDataUrl) {
  const currentUser = getCurrentEmployeeUser();
  if (!currentUser) return null;
  const brandName = template.brands.find((brand) => brand.id === employeeData.brandId)?.name ?? "";
  const brandSlug = slugifyValue(brandName || employeeData.brandId || "unknown-brand", "unknown-brand");
  const productCode = getProductCodeFromState(employeeData);
  const productCodeSlug = slugifyValue(productCode, "collage");

  const payload = {
    userId: currentUser.id,
    userName: currentUser.name,
    brandId: employeeData.brandId,
    brandName,
    brandSlug,
    productCode,
    templateId: employeeData.photoTemplateId,
    templateName: getPhotoTemplateName(employeeData.photoTemplateId),
    createdAt: new Date().toISOString(),
    imageDataUrl,
    state: structuredClone(employeeData),
  };

  if (isFileMode()) {
    const recordId = `${payload.createdAt.replace(/[:.]/g, "-")}-${productCodeSlug}`;
    const imageFileName = `${recordId}.png`;
    const summaryRecord = {
      id: recordId,
      createdAt: payload.createdAt,
      userId: payload.userId,
      userName: payload.userName,
      brandId: payload.brandId,
      brandName,
      brandSlug,
      productCode,
      templateId: payload.templateId,
      templateName: payload.templateName,
      imagePath: `history/brands/${brandSlug}/images/${imageFileName}`,
      imageFileName,
      hasState: true,
    };
    const detailRecord = {
      ...payload,
      id: recordId,
      imagePath: summaryRecord.imagePath,
      imageDataUrl,
      imageFileName,
    };
    await writeLocalDataUrl(["history", "brands", brandSlug, "images", imageFileName], imageDataUrl);
    await writeLocalJson(["history", "brands", brandSlug, "records", `${recordId}.json`], summaryRecord);
    await writeLocalJson(["history", "brands", brandSlug, "details", `${recordId}.json`], detailRecord);
    loadEmployeeHistory().catch((error) => console.error("Employee history refresh failed", error));
    loadAdminHistory().catch((error) => console.error("Admin history refresh failed", error));
    return { ok: true, record: summaryRecord };
  }

  const response = await fetch(COLLAGES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let details = "";
    try {
      details = await response.text();
    } catch (error) {
      console.error("History save response read failed", error);
    }
    throw new Error(`History save failed: ${response.status}${details ? ` ${details}` : ""}`);
  }

  const result = await response.json();
  loadEmployeeHistory().catch((error) => console.error("Employee history refresh failed", error));
  loadAdminHistory().catch((error) => console.error("Admin history refresh failed", error));
  return result;
}

function renderUserAdminList() {
  if (!elements.userAdminList) return;
  elements.userAdminList.innerHTML = "";

  users.forEach((user) => {
    const row = document.createElement("div");
    row.className = "brand-row user-row";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = user.name;
    nameInput.placeholder = "Логин сотрудника";
    nameInput.addEventListener("input", () => {
      user.name = nameInput.value || "employee";
      populateEmployeeUserSelect();
      saveUsersToServer().catch((error) => {
        console.error("Users save failed", error);
      });
    });

    const pinInput = document.createElement("input");
    pinInput.type = "text";
    pinInput.value = user.pin;
    pinInput.placeholder = "PIN";
    pinInput.addEventListener("input", () => {
      user.pin = pinInput.value || "1111";
      saveUsersToServer().catch((error) => {
        console.error("Users save failed", error);
      });
    });

    const brandSelect = document.createElement("select");
    brandSelect.multiple = true;
    brandSelect.size = Math.min(4, Math.max(2, template.brands.length || 2));
    template.brands.forEach((brand) => {
      const option = document.createElement("option");
      option.value = brand.id;
      option.textContent = brand.name;
      option.selected = (user.brandIds ?? []).includes(brand.id);
      brandSelect.append(option);
    });
    brandSelect.addEventListener("change", () => {
      user.brandIds = Array.from(brandSelect.selectedOptions).map((option) => option.value);
      if (!user.brandIds.length && template.brands[0]?.id) {
        user.brandIds = [template.brands[0].id];
        Array.from(brandSelect.options).forEach((option) => {
          option.selected = user.brandIds.includes(option.value);
        });
      }
      if (currentEmployeeUserId === user.id) {
        employeeData.brandId = user.brandIds[0] ?? null;
        populateBrandSelect();
        syncEmployeeAccess();
        scheduleRender();
      }
      saveUsersToServer().catch((error) => {
        console.error("Users save failed", error);
      });
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Удалить";
    removeButton.addEventListener("click", () => {
      users = users.filter((item) => item.id !== user.id);
      if (currentEmployeeUserId === user.id) {
        setCurrentEmployeeUser(null);
        employeeHistory = [];
      }
      populateEmployeeUserSelect();
      renderUserAdminList();
      syncEmployeeAccess();
      saveUsersToServer().catch((error) => {
        console.error("Users save failed", error);
      });
    });

    row.append(nameInput, pinInput, brandSelect, removeButton);
    elements.userAdminList.append(row);
  });
}

function renderEmployeeFieldInputs() {
  elements.employeeCustomFields.innerHTML = "";
  const fields = getEffectiveEmployeeFields(employeeData.brandId);
  fields.forEach((field) => {
    const label = document.createElement("label");
    label.className = "field";

    const title = document.createElement("span");
    title.textContent = field.label;

    const input =
      field.inputType === "select"
        ? document.createElement("select")
        : document.createElement("input");

    if (field.inputType === "select") {
      field.options.forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        input.append(option);
      });
      if (!field.options.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Нет вариантов";
        input.append(option);
      }
    } else {
      input.type = "text";
      input.placeholder = field.label;
    }

    input.value = employeeData.values[field.id] ?? field.defaultValue ?? "";
    input.dataset.fieldId = field.id;

    label.append(title, input);
    elements.employeeCustomFields.append(label);
  });
}

function renderEmployeeFieldAdminList() {
  elements.employeeFieldAdminList.innerHTML = "";
  if (elements.brandFieldSettingsSelect) {
    elements.brandFieldSettingsSelect.innerHTML = "";
    template.brands.forEach((brand) => {
      const option = document.createElement("option");
      option.value = brand.id;
      option.textContent = brand.name;
      elements.brandFieldSettingsSelect.append(option);
    });
    activeBrandSettingsId =
      template.brands.find((brand) => brand.id === activeBrandSettingsId)?.id ??
      template.brands[0]?.id ??
      null;
    if (activeBrandSettingsId) {
      elements.brandFieldSettingsSelect.value = activeBrandSettingsId;
    }
  }

  const activeBrand = getBrandById(activeBrandSettingsId) ?? template.brands[0] ?? null;

  template.fields.forEach((field) => {
    activeBrand.fieldSettings ??= {};
    activeBrand.fieldSettings[field.id] ??= { defaultValue: "", hidden: false };
    const brandFieldSettings = activeBrand.fieldSettings[field.id];

    const row = document.createElement("div");
    row.className = "brand-row brand-row--field";

    const globalGrid = document.createElement("div");
    globalGrid.className = "brand-row-grid";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.value = field.label;
    labelInput.placeholder = "Название поля";
    labelInput.addEventListener("input", () => {
      field.label = labelInput.value || "Поле";
      renderEmployeeFieldInputs();
      syncSelectionInspector();
    });

    const defaultInput = document.createElement("input");
    defaultInput.type = "text";
    defaultInput.value = field.defaultValue ?? "";
    defaultInput.placeholder = "Глобальный дефолт";
    defaultInput.addEventListener("input", () => {
      field.defaultValue = defaultInput.value;
      if (!(field.id in employeeData.values) || employeeData.values[field.id] === "") {
        employeeData.values[field.id] = getFieldDefaultValue(field, employeeData.brandId);
        renderEmployeeFieldInputs();
      }
      scheduleRender();
    });

    const typeSelect = document.createElement("select");
    [
      { value: "text", label: "Текст" },
      { value: "select", label: "Список" },
    ].forEach((config) => {
      const option = document.createElement("option");
      option.value = config.value;
      option.textContent = config.label;
      typeSelect.append(option);
    });
    typeSelect.value = field.inputType ?? "text";
    typeSelect.addEventListener("change", () => {
      field.inputType = typeSelect.value;
      if (field.inputType === "select" && !field.options.length) {
        field.options = ["Вариант 1", "Вариант 2"];
      }
      if (field.inputType === "select" && !field.defaultValue) {
        field.defaultValue = field.options[0] ?? "";
      }
      if (field.inputType === "text") {
        field.options = [];
      }
      employeeData.values[field.id] = getFieldDefaultValue(field, employeeData.brandId);
      renderEmployeeFieldInputs();
      renderEmployeeFieldAdminList();
      scheduleRender();
    });

    const optionsInput = document.createElement("input");
    optionsInput.type = "text";
    optionsInput.placeholder = "Варианты через запятую";
    optionsInput.value = (field.options ?? []).join(", ");
    optionsInput.style.display = field.inputType === "select" ? "" : "none";
    optionsInput.addEventListener("input", () => {
      field.options = optionsInput.value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (field.inputType === "select") {
        if (!field.options.includes(field.defaultValue)) {
          field.defaultValue = field.options[0] ?? "";
          defaultInput.value = field.defaultValue;
        }
        if (!field.options.includes(brandFieldSettings.defaultValue)) {
          brandFieldSettings.defaultValue = "";
        }
        employeeData.values[field.id] = getFieldDefaultValue(field, employeeData.brandId);
        renderEmployeeFieldInputs();
        renderEmployeeFieldAdminList();
        scheduleRender();
      }
    });

    globalGrid.append(labelInput, typeSelect, defaultInput, optionsInput);

    const brandPanel = document.createElement("div");
    brandPanel.className = "brand-row-subpanel";

    const brandPanelTitle = document.createElement("p");
    brandPanelTitle.className = "brand-row-title";
    brandPanelTitle.textContent = activeBrand
      ? `Настройки бренда: ${activeBrand.name}`
      : "Настройки бренда";

    const brandGrid = document.createElement("div");
    brandGrid.className = "brand-row-grid brand-row-grid--compact";

    const brandDefaultInput = document.createElement("input");
    brandDefaultInput.type = "text";
    brandDefaultInput.value = brandFieldSettings.defaultValue ?? "";
    brandDefaultInput.placeholder = "Дефолт этого бренда";
    brandDefaultInput.addEventListener("input", () => {
      brandFieldSettings.defaultValue = brandDefaultInput.value;
      if (employeeData.brandId === activeBrand?.id) {
        employeeData.values[field.id] = getFieldDefaultValue(field, employeeData.brandId);
        renderEmployeeFieldInputs();
      }
      scheduleRender();
    });

    const hiddenLabel = document.createElement("label");
    hiddenLabel.className = "field checkbox-field field--inline";
    const hiddenText = document.createElement("span");
    hiddenText.textContent = "Скрыть у бренда";
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "checkbox";
    hiddenInput.checked = Boolean(brandFieldSettings.hidden);
    hiddenInput.addEventListener("change", () => {
      brandFieldSettings.hidden = hiddenInput.checked;
      if (employeeData.brandId === activeBrand?.id) {
        renderEmployeeFieldInputs();
      }
      scheduleRender();
    });
    hiddenLabel.append(hiddenText, hiddenInput);

    brandGrid.append(brandDefaultInput, hiddenLabel);
    brandPanel.append(brandPanelTitle, brandGrid);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Удалить";
    removeButton.addEventListener("click", () => {
      template.fields = template.fields.filter((item) => item.id !== field.id);
      delete employeeData.values[field.id];
      template.brands.forEach((brand) => {
        delete brand.fieldSettings?.[field.id];
      });
      Object.values(template.textBindings).forEach((binding) => {
        if (binding.primary === field.id) binding.primary = "";
        if (binding.secondary === field.id) binding.secondary = "";
      });
      renderEmployeeFieldInputs();
      renderEmployeeFieldAdminList();
      syncSelectionInspector();
      scheduleRender();
    });

    row.append(globalGrid, brandPanel, removeButton);
    elements.employeeFieldAdminList.append(row);
  });
}

function populateBrandSelect() {
  const currentUser = getCurrentEmployeeUser();
  const previous = employeeData.brandId;
  elements.brandSelect.innerHTML = "";

  const allowedBrands = currentUser
    ? template.brands.filter((brand) => (currentUser.brandIds ?? []).includes(brand.id))
    : template.brands;

  allowedBrands.forEach((brand) => {
    const option = document.createElement("option");
    option.value = brand.id;
    option.textContent = brand.name;
    elements.brandSelect.append(option);
  });

  employeeData.brandId =
    allowedBrands.find((brand) => brand.id === previous)?.id ??
    allowedBrands[0]?.id ??
    null;

  if (employeeData.brandId) {
    elements.brandSelect.value = employeeData.brandId;
  }

  syncEmployeeFieldVisibility();
}

function syncEmployeeFieldVisibility() {
  const brandBinding = template.textBindings.brandPlate ?? { primary: "", secondary: "" };
  const usesEmployeeBrandField = Boolean(brandBinding.primary);

  if (elements.brandSelectField) {
    elements.brandSelectField.style.display =
      usesEmployeeBrandField || Boolean(getCurrentEmployeeUser()) ? "none" : "";
  }
}

function updatePhotoInputState() {
  const enabledCount = getLayoutById(employeeData.photoTemplateId).length;
  const hasAccess = Boolean(getCurrentEmployeeUser());
  elements.photoInputs.forEach((input, index) => {
    const enabled = hasAccess && index < enabledCount;
    input.disabled = !enabled;
    const uploadCard = input.closest(".upload-card");
    if (uploadCard) {
      uploadCard.style.opacity = enabled ? "1" : "0.45";
    }
  });
}

function renderEmployeeOverlay(scaleX, scaleY) {
  const layout = getLayoutById(employeeData.photoTemplateId);
  layout.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "editor-item";
    div.dataset.kind = "photo-adjust";
    div.dataset.index = String(index);
    div.classList.toggle("is-active", photoAdjustSelection === index);
    div.style.left = `${item.x * scaleX}px`;
    div.style.top = `${item.y * scaleY}px`;
    div.style.width = `${item.width * scaleX}px`;
    div.style.height = `${item.height * scaleY}px`;
    elements.overlay.append(div);
  });
}

function clampItemsToCanvas() {
  Object.values(template.blocks).forEach(clampItem);
  template.photoTemplates.forEach((item) => {
    getLayoutById(item.id).forEach(clampItem);
  });
}

function clampItem(item) {
  item.width = Math.max(40, item.width);
  item.height = Math.max(40, item.height);
  item.x = clampNumber(item.x, "x");
  item.y = clampNumber(item.y, "y");
  item.width = Math.min(item.width, template.canvas.width - item.x);
  item.height = Math.min(item.height, template.canvas.height - item.y);
  item.radius = Math.max(0, item.radius ?? 0);
  item.borderWidth = Math.max(0, item.borderWidth ?? 0);
}

function clampNumber(value, key) {
  if (key === "x" || key === "y") {
    return Math.max(0, Math.round(value));
  }
  if (key === "width" || key === "height") {
    return Math.max(40, Math.round(value));
  }
  if (key === "radius" || key === "borderWidth") {
    return Math.max(0, Math.round(value));
  }
  return Math.round(value);
}

async function renderCollage() {
  clampItemsToCanvas();

  const { width, height } = template.canvas;
  elements.canvas.width = width;
  elements.canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = template.canvas.backgroundColor;
  ctx.fillRect(0, 0, width, height);

  if (isBlockVisible("header")) {
    drawShape(template.blocks.header, template.theme.headerBackground);
  }
  await drawHeaderAssets();
  await drawPhotoLayout(currentMode === "admin" ? activePhotoLayout : employeeData.photoTemplateId);
  if (isBlockVisible("footer")) {
    drawShape(template.blocks.footer, template.theme.footerBackground);
  }
  drawFooterText();
  await drawBrandPlate();
  await drawCustomBlocks();

  if (currentMode === "admin" && template.canvas.showGuides) {
    drawGuides();
  }

  renderOverlay();
}

async function drawCustomBlocks() {
  for (const key of template.blockOrder) {
    const block = template.blocks[key];
    if (!block || !block.kind?.startsWith("custom-")) continue;

    if (block.kind === "custom-shape") {
      drawShape(block, block.fill);
      continue;
    }

    if (block.kind === "custom-text") {
      const binding = template.textBindings[key] ?? { primary: "", secondary: "" };
      const style = template.textStyles[key] ?? { color: "#121212", align: "left" };
      const value = getFieldValue(binding.primary) || block.name || "";
      drawTextBlock(value, block, {
        size: Math.max(18, Math.round(block.height * 0.45)),
        weight: 600,
        align: style.align,
        color: style.color,
        paddingX: 10,
      });
      continue;
    }

    if (block.kind === "custom-image") {
      if (block.fill && block.fill !== "transparent") {
        drawShape(block, block.fill);
      }
      if (block.imageSrc) {
        await drawContainImage(block.imageSrc, block);
      }
    }
  }
}

function isBlockVisible(key) {
  return template.blocks[key] && !template.blocks[key].hidden;
}

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(async () => {
    renderScheduled = false;
    await renderCollage();
  });
}

async function drawHeaderAssets() {
  if (isBlockVisible("leftBadge")) {
    await drawImageOrBadge(template.store.leftBadge, template.blocks.leftBadge, "P");
  }
  if (isBlockVisible("rightBadge")) {
    await drawImageOrBadge(template.store.rightBadge, template.blocks.rightBadge, "P");
  }

  if (!isBlockVisible("headerLogo")) {
    return;
  }

  if (template.store.logo) {
    await drawContainImage(template.store.logo, template.blocks.headerLogo);
    return;
  }

  const block = template.blocks.headerLogo;
  ctx.fillStyle = template.theme.storeTextColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${template.store.titleSize}px Georgia`;
  ctx.fillText(
    template.store.title,
    block.x + block.width / 2,
    block.y + block.height / 2 - template.store.subtitleSize * 0.45
  );
  ctx.font = `${template.store.subtitleSize}px Georgia`;
  ctx.fillText(
    template.store.subtitle,
    block.x + block.width / 2,
    block.y + block.height / 2 + template.store.titleSize * 0.2
  );
}

async function drawPhotoLayout(templateId) {
  const layout = getLayoutById(templateId);
  const photos = employeeData.photos.slice(0, layout.length);

  for (let index = 0; index < layout.length; index += 1) {
    await drawPhotoCell(
      photos[index] ?? null,
      layout[index],
      employeeData.photoTransforms[index] ?? { scale: 1, offsetX: 0, offsetY: 0 }
    );
  }
}

async function drawPhotoCell(src, cell, transform) {
  drawShape(cell, cell.fill);

  if (!src) {
    return;
  }

  const image = await loadImage(src);
  ctx.save();
  roundRect(ctx, cell.x, cell.y, cell.width, cell.height, cell.radius);
  ctx.clip();
  drawCoverImage(image, cell, normalizePhotoTransform(image, cell, transform));
  ctx.restore();

  if (cell.borderWidth > 0) {
    ctx.lineWidth = cell.borderWidth;
    ctx.strokeStyle = cell.stroke;
    roundRect(ctx, cell.x, cell.y, cell.width, cell.height, cell.radius);
    ctx.stroke();
  }
}

async function drawBrandPlate() {
  const block = template.blocks.brandPlate;
  if (!isBlockVisible("brandPlate")) return;
  drawShape(block, block.fill);

  const brandBinding = template.textBindings.brandPlate ?? { primary: "", secondary: "" };
  const brandStyle = template.textStyles.brandPlate ?? { color: template.theme.brandTextColor, align: "center" };
  const boundBrandText = getFieldValue(brandBinding.primary)?.trim();
  if (boundBrandText) {
    drawTextBlock(boundBrandText, block, {
      size: Math.round(block.height * 0.32),
      weight: 600,
      align: brandStyle.align,
      color: brandStyle.color,
      paddingX: 26,
    });
    return;
  }

  const selectedBrand = template.brands.find((brand) => brand.id === employeeData.brandId);
  if (selectedBrand?.logo) {
    await drawContainImage(selectedBrand.logo, {
      x: block.x + 24,
      y: block.y + 18,
      width: Math.max(40, block.width - 48),
      height: Math.max(40, block.height - 36),
      radius: 0,
    });
    return;
  }

  drawTextBlock(selectedBrand?.name ?? "Brand", block, {
    size: Math.round(block.height * 0.32),
    weight: 600,
    align: brandStyle.align,
    color: brandStyle.color,
    paddingX: 26,
  });
}

function drawFooterText() {
  const left = template.blocks.textLeft;
  const centerTop = template.blocks.textCenterTop;
  const centerBottom = template.blocks.textCenterBottom;
  const priceBox = template.blocks.priceBox;
  const leftBinding = template.textBindings.textLeft ?? { primary: "", secondary: "" };
  const centerTopBinding = template.textBindings.textCenterTop ?? { primary: "", secondary: "" };
  const centerBottomBinding = template.textBindings.textCenterBottom ?? { primary: "", secondary: "" };
  const priceBinding = template.textBindings.priceBox ?? { primary: "", secondary: "" };
  const leftStyle = template.textStyles.textLeft ?? { color: template.theme.footerTextColor, align: "left" };
  const centerTopStyle = template.textStyles.textCenterTop ?? { color: template.theme.footerTextColor, align: "center" };
  const centerBottomStyle = template.textStyles.textCenterBottom ?? { color: template.theme.footerTextColor, align: "center" };
  const priceStyle = template.textStyles.priceBox ?? { color: template.theme.priceTextColor, align: "center" };

  if (isBlockVisible("textLeft")) {
    drawTextBlock(getFieldValue(leftBinding.primary), left, {
      size: Math.round(left.height * 0.34),
      weight: 600,
      align: leftStyle.align,
      color: leftStyle.color,
      paddingX: 10,
    });

    drawTextAt(
      getFieldValue(leftBinding.secondary),
      leftStyle.align === "center"
        ? left.x + left.width / 2
        : leftStyle.align === "right"
          ? left.x + left.width - 10
          : left.x + 10,
      left.y + left.height * 0.62,
      {
        size: Math.round(left.height * 0.22),
        weight: 500,
        align: leftStyle.align,
        color: leftStyle.color,
      }
    );
  }

  if (isBlockVisible("textCenterTop")) {
    drawTextBlock(getFieldValue(centerTopBinding.primary), centerTop, {
      size: Math.round(centerTop.height * 0.78),
      weight: 500,
      align: centerTopStyle.align,
      color: centerTopStyle.color,
      paddingX: 10,
    });
  }

  if (isBlockVisible("textCenterBottom")) {
    drawTextBlock(getFieldValue(centerBottomBinding.primary), centerBottom, {
      size: Math.round(centerBottom.height * 0.78),
      weight: 500,
      align: centerBottomStyle.align,
      color: centerBottomStyle.color,
      paddingX: 10,
    });
  }

  if (isBlockVisible("priceBox")) {
    drawShape(priceBox, priceBox.fill);
    drawTextBlock(getFieldValue(priceBinding.primary), priceBox, {
      size: Math.round(priceBox.height * 0.5),
      weight: 700,
      align: priceStyle.align,
      color: priceStyle.color,
      paddingX: 16,
    });
  }
}

function drawTextBlock(text, block, config) {
  const paddingX = config.paddingX ?? 0;
  const textX =
    config.align === "center"
      ? block.x + block.width / 2
      : config.align === "right"
        ? block.x + block.width - paddingX
        : block.x + paddingX;
  drawTextAt(text, textX, block.y + block.height / 2, config);
}

function drawTextAt(text, x, y, config) {
  ctx.fillStyle = config.color;
  ctx.textAlign = config.align;
  ctx.textBaseline = "middle";
  ctx.font = `${config.weight} ${config.size}px Segoe UI`;
  ctx.fillText(text, x, y);
}

function drawShape(block, fallbackFill) {
  ctx.save();
  roundRect(ctx, block.x, block.y, block.width, block.height, block.radius ?? 0);
  ctx.fillStyle = block.fill || fallbackFill;
  ctx.fill();
  if ((block.borderWidth ?? 0) > 0) {
    ctx.lineWidth = block.borderWidth;
    ctx.strokeStyle = block.stroke;
    ctx.stroke();
  }
  ctx.restore();
}

async function drawImageOrBadge(src, block, fallbackText) {
  if (src) {
    await drawContainImage(src, block);
    return;
  }

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(
    block.x + block.width / 2,
    block.y + block.height / 2,
    Math.min(block.width, block.height) * 0.42,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(block.height * 0.4)}px Georgia`;
  ctx.fillText(fallbackText, block.x + block.width / 2, block.y + block.height / 2 + 6);
}

async function drawContainImage(imageSource, block) {
  const image = await loadImage(imageSource);
  const scale = Math.min(block.width / image.width, block.height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = block.x + (block.width - drawWidth) / 2;
  const offsetY = block.y + (block.height - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function drawCoverImage(image, cell, transform) {
  const baseScale = Math.max(cell.width / image.width, cell.height / image.height);
  const scale = baseScale * transform.scale;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = cell.x + (cell.width - drawWidth) / 2 + transform.offsetX;
  const offsetY = cell.y + (cell.height - drawHeight) / 2 + transform.offsetY;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function normalizePhotoTransform(image, cell, transform) {
  const safe = {
    scale: Math.max(1, Math.min(transform?.scale ?? 1, 6)),
    offsetX: transform?.offsetX ?? 0,
    offsetY: transform?.offsetY ?? 0,
  };

  const baseScale = Math.max(cell.width / image.width, cell.height / image.height);
  const drawWidth = image.width * baseScale * safe.scale;
  const drawHeight = image.height * baseScale * safe.scale;
  const maxOffsetX = Math.max(0, (drawWidth - cell.width) / 2);
  const maxOffsetY = Math.max(0, (drawHeight - cell.height) / 2);
  safe.offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, safe.offsetX));
  safe.offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, safe.offsetY));
  return safe;
}

function handleEmployeePointerDown(event) {
  if (!getCurrentEmployeeUser()) return;
  const itemElement = event.target.closest(".editor-item");
  if (!itemElement) return;
  const index = Number(itemElement.dataset.index);
  photoAdjustSelection = index;
  const point = getOverlayPoint(event);

  if (!employeeTouchState || employeeTouchState.index !== index) {
    employeeTouchState = {
      index,
      pointers: new Map(),
      mode: "pan",
      moved: false,
      startTransform: {
        ...(employeeData.photoTransforms[index] ?? { scale: 1, offsetX: 0, offsetY: 0 }),
      },
      startDistance: 0,
      startCenter: point,
      startPoint: point,
    };
  }

  employeeTouchState.pointers.set(event.pointerId, point);
  if (employeeTouchState.pointers.size === 1) {
    employeeTouchState.mode = "pan";
    employeeTouchState.moved = false;
    employeeTouchState.startPoint = point;
    employeeTouchState.startTransform = {
      ...(employeeData.photoTransforms[index] ?? { scale: 1, offsetX: 0, offsetY: 0 }),
    };
  }

  if (employeeTouchState.pointers.size === 2) {
    const points = Array.from(employeeTouchState.pointers.values());
    employeeTouchState.mode = "pinch";
    employeeTouchState.moved = true;
    employeeTouchState.startDistance = distance(points[0], points[1]);
    employeeTouchState.startCenter = midpoint(points[0], points[1]);
    employeeTouchState.startTransform = {
      ...(employeeData.photoTransforms[index] ?? { scale: 1, offsetX: 0, offsetY: 0 }),
    };
  }

  elements.overlay.setPointerCapture(event.pointerId);
  renderOverlay();
}

function handleEmployeePointerMove(event) {
  if (!employeeTouchState || !employeeTouchState.pointers.has(event.pointerId)) return;
  const point = getOverlayPoint(event);
  employeeTouchState.pointers.set(event.pointerId, point);
  const index = employeeTouchState.index;
  const transform = { ...(employeeData.photoTransforms[index] ?? { scale: 1, offsetX: 0, offsetY: 0 }) };
  const cell = getLayoutById(employeeData.photoTemplateId)[index];
  if (!cell) return;

  if (employeeTouchState.mode === "pinch" && employeeTouchState.pointers.size >= 2) {
    const points = Array.from(employeeTouchState.pointers.values());
    const currentDistance = distance(points[0], points[1]);
    const currentCenter = midpoint(points[0], points[1]);
    const ratio = employeeTouchState.startDistance > 0 ? currentDistance / employeeTouchState.startDistance : 1;
    transform.scale = employeeTouchState.startTransform.scale * ratio;
    const cellCenterX = cell.x + cell.width / 2;
    const cellCenterY = cell.y + cell.height / 2;
    const anchorX =
      employeeTouchState.startCenter.x - cellCenterX - employeeTouchState.startTransform.offsetX;
    const anchorY =
      employeeTouchState.startCenter.y - cellCenterY - employeeTouchState.startTransform.offsetY;
    transform.offsetX =
      employeeTouchState.startTransform.offsetX +
      (currentCenter.x - employeeTouchState.startCenter.x) +
      anchorX * (1 - ratio);
    transform.offsetY =
      employeeTouchState.startTransform.offsetY +
      (currentCenter.y - employeeTouchState.startCenter.y) +
      anchorY * (1 - ratio);
  } else if (employeeTouchState.mode === "pan" && employeeTouchState.startPoint) {
    const moveDistance = distance(point, employeeTouchState.startPoint);
    if (moveDistance > 6) {
      employeeTouchState.moved = true;
    }
    transform.offsetX =
      employeeTouchState.startTransform.offsetX + (point.x - employeeTouchState.startPoint.x);
    transform.offsetY =
      employeeTouchState.startTransform.offsetY + (point.y - employeeTouchState.startPoint.y);
  }

  const imageSrc = employeeData.photos[index];
  if (!imageSrc || !cell) return;

  const cachedImage = imageCache.get(imageSrc);
  if (cachedImage) {
    employeeData.photoTransforms[index] = normalizePhotoTransform(cachedImage, cell, transform);
    scheduleRender();
    return;
  }

  loadImage(imageSrc).then((image) => {
    employeeData.photoTransforms[index] = normalizePhotoTransform(image, cell, transform);
    scheduleRender();
  });
}

function handleEmployeePointerUp(event) {
  if (!employeeTouchState || !employeeTouchState.pointers.has(event.pointerId)) return;
  const finishedIndex = employeeTouchState.index;
  const wasTap =
    employeeTouchState.pointers.size === 1 &&
    employeeTouchState.mode === "pan" &&
    employeeTouchState.moved === false;
  employeeTouchState.pointers.delete(event.pointerId);
  if (employeeTouchState.pointers.size === 1) {
    const [remainingPoint] = employeeTouchState.pointers.values();
    employeeTouchState.mode = "pan";
    employeeTouchState.startPoint = remainingPoint;
    employeeTouchState.startTransform = {
      ...(employeeData.photoTransforms[employeeTouchState.index] ?? {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      }),
    };
  } else if (employeeTouchState.pointers.size === 0) {
    employeeTouchState = null;
  }
  if (wasTap) {
    detectEmployeeDoubleTap(finishedIndex);
  } else if (!employeeTouchState) {
    employeeTapState.lastIndex = null;
    employeeTapState.lastTime = 0;
  }
  renderOverlay();
}

function detectEmployeeDoubleTap(index) {
  const now = Date.now();
  const isSameCell = employeeTapState.lastIndex === index;
  const isDoubleTap = isSameCell && now - employeeTapState.lastTime < 320;

  employeeTapState = {
    lastIndex: index,
    lastTime: now,
  };

  if (!isDoubleTap) return;

  openPhotoPickerForIndex(index);
  employeeTapState.lastIndex = null;
  employeeTapState.lastTime = 0;
}

function openPhotoPickerForIndex(index) {
  const input = elements.photoInputs[index];
  if (!input || input.disabled) return;

  try {
    input.value = "";
  } catch (error) {
    console.warn("Photo input reset failed", error);
  }

  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch (error) {
      console.warn("showPicker failed, fallback to click()", error);
    }
  }

  try {
    input.click();
    return;
  } catch (error) {
    console.warn("Photo input click() failed, fallback to temporary input", error);
  }

  const fallbackInput = document.createElement("input");
  fallbackInput.type = "file";
  fallbackInput.accept = "image/*";
  fallbackInput.style.position = "fixed";
  fallbackInput.style.left = "-9999px";
  fallbackInput.style.top = "0";
  fallbackInput.style.opacity = "0";
  fallbackInput.style.pointerEvents = "none";
  fallbackInput.addEventListener(
    "change",
    async (event) => {
      const file = event.target.files?.[0];
      employeeData.photos[index] = file ? await fileToDataUrl(file) : null;
      employeeData.photoTransforms[index] = { scale: 1, offsetX: 0, offsetY: 0 };
      photoAdjustSelection = index;
      if (employeeData.photos[index]) {
        await loadImage(employeeData.photos[index]);
      }
      fallbackInput.remove();
      scheduleRender();
    },
    { once: true }
  );
  document.body.appendChild(fallbackInput);
  fallbackInput.click();
}

function getOverlayPoint(event) {
  const rect = elements.overlay.getBoundingClientRect();
  const scale = template.canvas.width / rect.width;
  return {
    x: (event.clientX - rect.left) * scale,
    y: (event.clientY - rect.top) * scale,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function drawGuides() {
  ctx.save();
  ctx.strokeStyle = template.canvas.guideColor;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);

  Object.values(template.blocks).forEach((block) => {
    ctx.strokeRect(block.x, block.y, block.width, block.height);
  });

  if (editorLayer === "photos") {
    getLayoutById(activePhotoLayout).forEach((cell) => {
      ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
    });
  }

  ctx.restore();
}

function loadImage(source) {
  if (imageCache.has(source)) {
    return Promise.resolve(imageCache.get(source));
  }

  if (imagePromiseCache.has(source)) {
    return imagePromiseCache.get(source);
  }

  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      imageCache.set(source, image);
      imagePromiseCache.delete(source);
      resolve(image);
    };
    image.onerror = (error) => {
      imagePromiseCache.delete(source);
      reject(error);
    };
    image.src = source;
  });

  imagePromiseCache.set(source, promise);
  return promise;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function exportCanvasPng(canvas) {
  return new Promise((resolve, reject) => {
    if (!canvas) {
      reject(new Error("Canvas is not available."));
      return;
    }

    if (typeof canvas.toBlob === "function") {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas PNG blob is empty."));
          return;
        }
        resolve({ blob, dataUrl: null });
      }, "image/png");
      return;
    }

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const fallbackBlob = dataUrlToBlob(dataUrl);
      resolve({ blob: fallbackBlob, dataUrl });
    } catch (error) {
      reject(error);
    }
  });
}

function dataUrlToBlob(dataUrl) {
  const [meta, base64Data = ""] = String(dataUrl || "").split(",", 2);
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || "image/png";
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function triggerBlobDownload(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = objectUrl;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

function numberValue(element, fallback) {
  const value = Number(element.value);
  return Number.isFinite(value) ? value : fallback;
}

function normalizeColor(value) {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) return value;
  return "#ffffff";
}

function roundRect(context, x, y, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius ?? 0, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function getExistingBlockKey() {
  return template.blockOrder.find((key) => template.blocks[key]) ?? null;
}

function getAvailableBlockKeys() {
  return BLOCK_ORDER.filter((key) => !template.blocks[key]);
}

function renderAvailableBlocks() {
  const available = getAvailableBlockKeys();
  elements.availableBlockSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Выберите тип блока";
  elements.availableBlockSelect.append(placeholder);

  [
    { value: "new:text", label: "Новый текстовый блок" },
    { value: "new:shape", label: "Новая фигура" },
    { value: "new:image", label: "Новая картинка" },
  ].forEach((config) => {
    const option = document.createElement("option");
    option.value = config.value;
    option.textContent = config.label;
    elements.availableBlockSelect.append(option);
  });

  available.forEach((key) => {
    const option = document.createElement("option");
    option.value = `system:${key}`;
    option.textContent = `Системный блок: ${getBlockLabel(key)}`;
    elements.availableBlockSelect.append(option);
  });

  const canInsert = editorLayer === "blocks";
  elements.availableBlockSelect.disabled = !canInsert;
  elements.insertBlock.disabled = !canInsert;
}

function updateBindingControls() {
  const showBindings = selection.type === "block" && isBindableBlock(selection.key);
  const showImageControls =
    selection.type === "block" && template.blocks[selection.key]?.kind === "custom-image";
  elements.textBindingSection.classList.toggle("is-hidden", !showBindings);
  elements.imageBlockSection.classList.toggle("is-hidden", !showImageControls);
  if (showImageControls) {
    elements.customImageUpload.value = "";
  }
  if (!showBindings) return;

  const binding = template.textBindings[selection.key] ?? { primary: "", secondary: "" };
  fillBindingSelect(elements.bindingPrimary, binding.primary);
  fillBindingSelect(elements.bindingSecondary, binding.secondary, true);
  const style = template.textStyles[selection.key] ?? { color: "#121212", align: "center" };
  elements.textColor.value = normalizeColor(style.color);
  elements.textAlign.value = style.align ?? "center";
}

function fillBindingSelect(select, value, includeEmpty = false) {
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = includeEmpty ? "Не использовать" : "Выберите переменную";
  select.append(placeholder);

  template.fields.forEach((field) => {
    const option = document.createElement("option");
    option.value = field.id;
    option.textContent = field.label;
    select.append(option);
  });

  select.value = value ?? "";
}

function getFieldValue(fieldId) {
  if (!fieldId) return "";
  return employeeData.values[fieldId] ?? "";
}

function syncEditorLayerState() {
  elements.editBlocksBtn.classList.toggle("is-active", editorLayer === "blocks");
  elements.editPhotosBtn.classList.toggle("is-active", editorLayer === "photos");
  elements.photoLayoutTabs.forEach((tab) => {
    tab.classList.remove("is-active");
    tab.style.display = "none";
  });
  elements.addPhotoCell.disabled = editorLayer !== "photos";
  renderAvailableBlocks();
  elements.adminPhotoTemplateSelect.value = activePhotoLayout;
  elements.adminPhotoTemplateName.value = getPhotoTemplateName(activePhotoLayout);
  elements.removeSelected.disabled =
    !(
      (editorLayer === "photos" && selection.type === "photo") ||
      (editorLayer === "blocks" && selection.type === "block" && Boolean(getSelectedItem()))
    );
  updateBindingControls();
  updateRemoveButtonLabel();
}

function renderItemList() {
  syncEditorLayerState();
  elements.itemList.innerHTML = "";

  if (editorLayer === "blocks") {
    template.blockOrder.filter((key) => template.blocks[key]).forEach((key) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "item-chip";
      button.textContent = getBlockLabel(key);
      button.classList.toggle("is-active", selection.type === "block" && selection.key === key);
      button.addEventListener("click", () => {
        selection = { type: "block", key };
        syncSelectionInspector();
        renderItemList();
        renderOverlay();
      });
      elements.itemList.append(button);
    });
    return;
  }

  getLayoutById(activePhotoLayout).forEach((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "item-chip";
    button.textContent = `Фото-ячейка ${index + 1}`;
    button.classList.toggle(
      "is-active",
      selection.type === "photo" &&
        selection.layout === activePhotoLayout &&
        selection.index === index
    );
    button.addEventListener("click", () => {
      selection = { type: "photo", layout: activePhotoLayout, index };
      syncSelectionInspector();
      renderItemList();
      renderOverlay();
    });
    elements.itemList.append(button);
  });
}

function syncSelectionInspector() {
  ensureValidSelection();
  const item = getSelectedItem();
  if (!item) {
    elements.selectionTitle.textContent = "Ничего не выбрано";
    elements.selectionMeta.textContent =
      editorLayer === "photos"
        ? `Шаблон: ${getPhotoTemplateName(activePhotoLayout)}`
        : "Добавь блок или фото-ячейку";
    [
      elements.itemX,
      elements.itemY,
      elements.itemWidth,
      elements.itemHeight,
      elements.itemRadius,
      elements.itemBorderWidth,
    ].forEach((input) => {
      input.value = "";
    });
    return;
  }

  if (selection.type === "block") {
    const block = template.blocks[selection.key];
    elements.selectionTitle.textContent = getBlockLabel(selection.key);
    if (isBindableBlock(selection.key)) {
      elements.selectionMeta.textContent = "Текстовый блок. Можно привязать переменные сотрудника.";
    } else if (block?.kind === "custom-shape") {
      elements.selectionMeta.textContent = "Фигура. Ее сотрудник не меняет.";
    } else if (block?.kind === "custom-image") {
      elements.selectionMeta.textContent = "Картинка. Можно использовать как декоративный блок.";
    } else {
      elements.selectionMeta.textContent = "Блок шаблона";
    }
  } else {
    elements.selectionTitle.textContent = `Фото-ячейка ${selection.index + 1}`;
    elements.selectionMeta.textContent = `Шаблон: ${getPhotoTemplateName(selection.layout)}`;
  }

  elements.itemX.value = Math.round(item.x);
  elements.itemY.value = Math.round(item.y);
  elements.itemWidth.value = Math.round(item.width);
  elements.itemHeight.value = Math.round(item.height);
  elements.itemRadius.value = Math.round(item.radius ?? 0);
  elements.itemBorderWidth.value = Math.round(item.borderWidth ?? 0);
  elements.itemFill.value = normalizeColor(item.fill);
  elements.itemStroke.value = normalizeColor(item.stroke);
  updateBindingControls();
  updateRemoveButtonLabel();
}

function updateRemoveButtonLabel() {
  elements.removeSelected.textContent = "Удалить";
}

function ensureValidSelection() {
  if (selection.type === "block" && template.blocks[selection.key]) return;
  if (selection.type === "photo") {
    const layout = getLayoutById(selection.layout);
    if (layout && layout[selection.index]) return;
  }

  selection =
    editorLayer === "blocks"
      ? { type: "block", key: getExistingBlockKey() }
      : { type: "photo", layout: activePhotoLayout, index: 0 };
}

function getSelectedItem() {
  ensureValidSelection();
  if (selection.type === "block") {
    return template.blocks[selection.key];
  }
  return getLayoutById(selection.layout)?.[selection.index] ?? null;
}

function renderOverlay() {
  const stageRect = elements.canvas.getBoundingClientRect();
  const scaleX = stageRect.width / template.canvas.width;
  const scaleY = stageRect.height / template.canvas.height;
  elements.overlay.innerHTML = "";

  if (currentMode === "employee") {
    renderEmployeeOverlay(scaleX, scaleY);
    return;
  }

  if (currentMode !== "admin") {
    return;
  }

  const items =
    editorLayer === "blocks"
      ? template.blockOrder.filter((key) => template.blocks[key]).map((key) => ({
          type: "block",
          key,
          item: template.blocks[key],
        }))
      : getLayoutById(activePhotoLayout).map((item, index) => ({
          type: "photo",
          key: `photo-${activePhotoLayout}-${index}`,
          layout: activePhotoLayout,
          index,
          item,
        }));

  const orderedItems = [...items].sort((a, b) => {
    const aSelected =
      (a.type === "block" && selection.type === "block" && selection.key === a.key) ||
      (a.type === "photo" &&
        selection.type === "photo" &&
        selection.layout === a.layout &&
        selection.index === a.index);
    const bSelected =
      (b.type === "block" && selection.type === "block" && selection.key === b.key) ||
      (b.type === "photo" &&
        selection.type === "photo" &&
        selection.layout === b.layout &&
        selection.index === b.index);
    return Number(aSelected) - Number(bSelected);
  });

  orderedItems.forEach((entry) => {
    const div = document.createElement("div");
    div.className = "editor-item";
    div.dataset.kind = entry.type;
    if (entry.type === "block") {
      div.dataset.key = entry.key;
    } else {
      div.dataset.layout = String(entry.layout);
      div.dataset.index = String(entry.index);
    }

    const isSelected =
      (entry.type === "block" && selection.type === "block" && selection.key === entry.key) ||
      (entry.type === "photo" &&
        selection.type === "photo" &&
        selection.layout === entry.layout &&
        selection.index === entry.index);

    if (isSelected) {
      div.classList.add("is-active");
    }

    if (editorLayer === "photos" && entry.type === "photo" && selection.type === "photo" && !isSelected) {
      div.classList.add("is-locked");
    }

    div.style.left = `${entry.item.x * scaleX}px`;
    div.style.top = `${entry.item.y * scaleY}px`;
    div.style.width = `${entry.item.width * scaleX}px`;
    div.style.height = `${entry.item.height * scaleY}px`;

    const handle = document.createElement("div");
    handle.className = "resize-handle";
    div.append(handle);
    elements.overlay.append(div);
  });
}


