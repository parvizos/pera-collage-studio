import type { Lang } from "./translations";

interface Entry {
  ru: string;
  en: string;
  tr: string;
  ar: string;
}

// Each row: source spellings (any language, lowercase) → meaning in 4 languages.
// Used to auto-translate product CATEGORY and COLOR values on the storefront.
// Unknown terms are shown unchanged. Translations are by meaning, not literal.
const RAW: (Entry & { keys: string[] })[] = [
  // ---- Categories ----
  { keys: ["takım", "takim", "комплект", "костюм", "suit", "set"], ru: "Костюм", en: "Suit", tr: "Takım", ar: "بدلة" },
  { keys: ["gömlek", "gomlek", "рубашка", "shirt"], ru: "Рубашка", en: "Shirt", tr: "Gömlek", ar: "قميص" },
  { keys: ["elbise", "платье", "dress"], ru: "Платье", en: "Dress", tr: "Elbise", ar: "فستان" },
  { keys: ["abiye", "вечернее платье", "evening dress"], ru: "Вечернее платье", en: "Evening dress", tr: "Abiye", ar: "فستان سهرة" },
  { keys: ["pantolon", "брюки", "trousers", "pants"], ru: "Брюки", en: "Trousers", tr: "Pantolon", ar: "بنطال" },
  { keys: ["etek", "юбка", "skirt"], ru: "Юбка", en: "Skirt", tr: "Etek", ar: "تنورة" },
  { keys: ["ceket", "жакет", "jacket", "blazer"], ru: "Жакет", en: "Jacket", tr: "Ceket", ar: "سترة" },
  { keys: ["mont", "куртка"], ru: "Куртка", en: "Coat", tr: "Mont", ar: "جاكيت" },
  { keys: ["kaban", "пальто", "overcoat", "coat"], ru: "Пальто", en: "Overcoat", tr: "Kaban", ar: "معطف" },
  { keys: ["bluz", "блузка", "blouse"], ru: "Блузка", en: "Blouse", tr: "Bluz", ar: "بلوزة" },
  { keys: ["tişört", "tisort", "tshirt", "t-shirt", "футболка"], ru: "Футболка", en: "T-shirt", tr: "Tişört", ar: "تيشيرت" },
  { keys: ["kazak", "свитер", "sweater"], ru: "Свитер", en: "Sweater", tr: "Kazak", ar: "كنزة" },
  { keys: ["hırka", "hirka", "кардиган", "cardigan"], ru: "Кардиган", en: "Cardigan", tr: "Hırka", ar: "كارديغان" },
  { keys: ["sweat", "sweatshirt", "свитшот"], ru: "Свитшот", en: "Sweatshirt", tr: "Sweatshirt", ar: "سويت شيرت" },
  { keys: ["şort", "sort", "шорты", "shorts"], ru: "Шорты", en: "Shorts", tr: "Şort", ar: "شورت" },
  { keys: ["tunik", "туника", "tunic"], ru: "Туника", en: "Tunic", tr: "Tunik", ar: "تونيك" },
  { keys: ["yelek", "жилет", "vest"], ru: "Жилет", en: "Vest", tr: "Yelek", ar: "صديري" },
  { keys: ["eşofman", "esofman", "спортивный костюм", "tracksuit"], ru: "Спортивный костюм", en: "Tracksuit", tr: "Eşofman", ar: "بدلة رياضية" },
  { keys: ["tulum", "комбинезон", "jumpsuit"], ru: "Комбинезон", en: "Jumpsuit", tr: "Tulum", ar: "أفرول" },
  { keys: ["tayt", "леггинсы", "leggings"], ru: "Леггинсы", en: "Leggings", tr: "Tayt", ar: "ليغنز" },
  { keys: ["pijama", "пижама", "pajamas", "pyjamas"], ru: "Пижама", en: "Pajamas", tr: "Pijama", ar: "بيجاما" },
  { keys: ["mayo", "купальник", "swimsuit"], ru: "Купальник", en: "Swimsuit", tr: "Mayo", ar: "مايوه" },
  { keys: ["bikini", "бикини"], ru: "Бикини", en: "Bikini", tr: "Bikini", ar: "بيكيني" },
  { keys: ["iç çamaşırı", "ic camasiri", "бельё", "белье", "underwear", "lingerie"], ru: "Бельё", en: "Underwear", tr: "İç çamaşırı", ar: "ملابس داخلية" },
  { keys: ["gecelik", "ночная сорочка", "nightgown"], ru: "Ночная сорочка", en: "Nightgown", tr: "Gecelik", ar: "قميص نوم" },
  { keys: ["sabahlık", "sabahlik", "халат", "robe"], ru: "Халат", en: "Robe", tr: "Sabahlık", ar: "روب" },
  { keys: ["çanta", "canta", "сумка", "bag"], ru: "Сумка", en: "Bag", tr: "Çanta", ar: "حقيبة" },
  { keys: ["ayakkabı", "ayakkabi", "обувь", "shoes"], ru: "Обувь", en: "Shoes", tr: "Ayakkabı", ar: "حذاء" },
  { keys: ["şal", "sal", "шаль", "shawl"], ru: "Шаль", en: "Shawl", tr: "Şal", ar: "شال" },
  { keys: ["atkı", "atki", "шарф", "scarf"], ru: "Шарф", en: "Scarf", tr: "Atkı", ar: "وشاح" },
  { keys: ["kemer", "ремень", "belt"], ru: "Ремень", en: "Belt", tr: "Kemer", ar: "حزام" },
  { keys: ["std", "standart", "standard", "стандарт"], ru: "Стандарт", en: "Standard", tr: "Standart", ar: "قياسي" },

  // ---- Colors ----
  { keys: ["siyah", "чёрный", "черный", "black"], ru: "Чёрный", en: "Black", tr: "Siyah", ar: "أسود" },
  { keys: ["beyaz", "белый", "white"], ru: "Белый", en: "White", tr: "Beyaz", ar: "أبيض" },
  { keys: ["kırmızı", "kirmizi", "красный", "red"], ru: "Красный", en: "Red", tr: "Kırmızı", ar: "أحمر" },
  { keys: ["mavi", "синий", "blue"], ru: "Синий", en: "Blue", tr: "Mavi", ar: "أزرق" },
  { keys: ["lacivert", "тёмно-синий", "темно-синий", "navy"], ru: "Тёмно-синий", en: "Navy", tr: "Lacivert", ar: "كحلي" },
  { keys: ["yeşil", "yesil", "зелёный", "зеленый", "green"], ru: "Зелёный", en: "Green", tr: "Yeşil", ar: "أخضر" },
  { keys: ["sarı", "sari", "жёлтый", "желтый", "yellow"], ru: "Жёлтый", en: "Yellow", tr: "Sarı", ar: "أصفر" },
  { keys: ["pembe", "розовый", "pink"], ru: "Розовый", en: "Pink", tr: "Pembe", ar: "وردي" },
  { keys: ["fuşya", "fusya", "фуксия", "fuchsia"], ru: "Фуксия", en: "Fuchsia", tr: "Fuşya", ar: "فوشيا" },
  { keys: ["mor", "фиолетовый", "purple"], ru: "Фиолетовый", en: "Purple", tr: "Mor", ar: "بنفسجي" },
  { keys: ["turuncu", "оранжевый", "orange"], ru: "Оранжевый", en: "Orange", tr: "Turuncu", ar: "برتقالي" },
  { keys: ["gri", "серый", "grey", "gray"], ru: "Серый", en: "Grey", tr: "Gri", ar: "رمادي" },
  { keys: ["kahve", "kahverengi", "коричневый", "brown"], ru: "Коричневый", en: "Brown", tr: "Kahverengi", ar: "بني" },
  { keys: ["acı kahve", "aci kahve", "тёмно-коричневый", "dark brown"], ru: "Тёмно-коричневый", en: "Dark brown", tr: "Acı Kahve", ar: "بني غامق" },
  { keys: ["bej", "бежевый", "beige"], ru: "Бежевый", en: "Beige", tr: "Bej", ar: "بيج" },
  { keys: ["bordo", "бордовый", "burgundy"], ru: "Бордовый", en: "Burgundy", tr: "Bordo", ar: "عنابي" },
  { keys: ["krem", "кремовый", "cream"], ru: "Кремовый", en: "Cream", tr: "Krem", ar: "كريمي" },
  { keys: ["ekru", "экрю", "ecru"], ru: "Экрю", en: "Ecru", tr: "Ekru", ar: "إيكرو" },
  { keys: ["kemik", "молочный", "off-white", "bone"], ru: "Молочный", en: "Off-white", tr: "Kemik", ar: "عاجي" },
  { keys: ["vizon", "норковый", "mink"], ru: "Норковый", en: "Mink", tr: "Vizon", ar: "فيزون" },
  { keys: ["haki", "хаки", "khaki"], ru: "Хаки", en: "Khaki", tr: "Haki", ar: "كاكي" },
  { keys: ["füme", "fume", "дымчатый", "smoke"], ru: "Дымчатый", en: "Smoke", tr: "Füme", ar: "دخاني" },
  { keys: ["antrasit", "антрацит", "anthracite"], ru: "Антрацит", en: "Anthracite", tr: "Antrasit", ar: "فحمي" },
  { keys: ["taş", "tas", "каменный", "stone"], ru: "Каменный", en: "Stone", tr: "Taş", ar: "حجري" },
  { keys: ["hardal", "горчичный", "mustard"], ru: "Горчичный", en: "Mustard", tr: "Hardal", ar: "خردلي" },
  { keys: ["somon", "лососёвый", "salmon"], ru: "Лососёвый", en: "Salmon", tr: "Somon", ar: "سلموني" },
  { keys: ["gümüş", "gumus", "серебряный", "silver"], ru: "Серебряный", en: "Silver", tr: "Gümüş", ar: "فضي" },
  { keys: ["altın", "altin", "золотой", "gold"], ru: "Золотой", en: "Gold", tr: "Altın", ar: "ذهبي" },
  { keys: ["indigo", "индиго"], ru: "Индиго", en: "Indigo", tr: "İndigo", ar: "نيلي" },

  // ---- Color modifiers (combine with a color, e.g. "Açık Mavi") ----
  { keys: ["açık", "acik", "светлый", "light"], ru: "Светлый", en: "Light", tr: "Açık", ar: "فاتح" },
  { keys: ["koyu", "тёмный", "темный", "dark"], ru: "Тёмный", en: "Dark", tr: "Koyu", ar: "غامق" },
];

const MAP = new Map<string, Entry>();
for (const e of RAW) {
  const entry: Entry = { ru: e.ru, en: e.en, tr: e.tr, ar: e.ar };
  for (const k of e.keys) MAP.set(k.toLowerCase(), entry);
  for (const k of [e.ru, e.en, e.tr, e.ar]) MAP.set(k.toLowerCase(), entry);
}

function normKey(s: string): string {
  return s.trim().toLowerCase().replace(/[\s\-_/]+/g, " ").trim();
}

/** Translate a category/color value by meaning. Unknown → returned unchanged. */
export function translateTerm(value: string | undefined, lang: Lang): string {
  if (!value) return value || "";
  const v = value.trim();
  const exact = MAP.get(normKey(v));
  if (exact) return exact[lang] || v;
  // Compound (e.g. "Açık Mavi", "Acı-Kahve"): translate known tokens, keep the rest.
  const rawToks = v.split(/[\s\-_/]+/).filter(Boolean);
  if (rawToks.length > 1) {
    let any = false;
    const out = rawToks.map((rt) => {
      const e = MAP.get(rt.toLowerCase());
      if (e) {
        any = true;
        return e[lang];
      }
      return rt;
    });
    if (any) return out.join(" ");
  }
  return v;
}
