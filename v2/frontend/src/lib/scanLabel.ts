// Распознавание текста с фото наклейки и разбор на поля товара.
// OCR работает в браузере (tesseract.js, турецкий + английский), грузится лениво.

export interface ParsedLabel {
  code?: string;
  category?: string;
  color?: string;
  size?: string;
  price?: string;
}

export async function recognizeLabel(
  file: File | Blob,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const { data } = await Tesseract.recognize(file, "tur+eng", {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
    },
  });
  return data.text || "";
}

/**
 * Разбирает распознанный текст наклейки в поля товара.
 * Эвристики заточены под наклейки PERA: код (POL-426151047), категория (MONT),
 * цвет (Kemik), размер (36-40), цена (35.0000 / SET...).
 */
const LOW = "a-zçğıöşüâîûä";
const UP = "A-ZÇĞİÖŞÜ";
// Слова, которые точно не цвет (бренд/тип/служебное).
const NOT_COLOR = new Set(
  [
    "PERA", "İSTANBUL", "ISTANBUL", "POLIN", "POLİN", "SETRE", "SET", "MONT", "TAKIM",
    "BLUZ", "GÖMLEK", "GOMLEK", "ELBISE", "ETEK", "PANTOLON", "CEKET", "KABAN", "KAZAK",
    "TUNIK", "TUNİK", "STORE",
  ].map((s) => s.toUpperCase()),
);

export function parseLabel(raw: string): ParsedLabel {
  const out: ParsedLabel = {};
  const text = raw.replace(/\r/g, "");
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  // КОД: PREFIX-XXXX, где после дефиса буквы/цифры (POL-426151047, SET-BL1634, EXPO-533-B)
  const codeRe = new RegExp(`([${UP}]{2,5}-[A-Z0-9İ]{2,}(?:-[A-Z0-9İ]+)*)`);
  let codeLineIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const up = lines[i].toUpperCase();
    const m = up.match(codeRe);
    if (m && m[1] !== "İSTANBUL") {
      out.code = m[1];
      codeLineIdx = i;
      // КАТЕГОРИЯ: слово сразу после кода (MONT, BLUZ, GÖMLEK...)
      const rest = up.slice(up.indexOf(m[1]) + m[1].length).trim();
      const cat = rest.match(new RegExp(`^([${UP}]{2,15})`));
      if (cat) out.category = cat[1];
      break;
    }
  }

  // ЦВЕТ: строка сразу под кодом, ведущее слово (можно через дефис): Kemik, Acı-Kahve
  const colorRe = new RegExp(`([${UP}][${LOW}]+(?:[-\\s][${UP}]?[${LOW}]+)*)`);
  if (codeLineIdx >= 0 && codeLineIdx + 1 < lines.length) {
    const cl = lines[codeLineIdx + 1];
    const cm = cl.match(new RegExp(`^\\s*(${colorRe.source})`));
    if (cm) {
      const cand = cm[1].trim();
      // отрезаем хвост-бренд (SETRE/POLİN), если прилип
      const cleaned = cand.replace(new RegExp(`\\s+[${UP}]{3,}$`), "").trim();
      if (cleaned && !NOT_COLOR.has(cleaned.toUpperCase())) out.color = cleaned;
    }
  }
  if (!out.color) {
    for (const l of lines) {
      if (/store|www|http|insta|\+?\d[\d\s]{6,}/i.test(l)) continue;
      const m = l.match(colorRe);
      if (m && !NOT_COLOR.has(m[1].toUpperCase())) {
        out.color = m[1].trim();
        break;
      }
    }
  }

  // РАЗМЕР: 36-40  ИЛИ буквенные S-M-L-XL / S/M/L
  const numSize = text.match(/\b(\d{2})\s*[-‐–]\s*(\d{2})\b/);
  if (numSize) {
    out.size = `${numSize[1]}-${numSize[2]}`;
  } else {
    const letterSize = text.match(
      /\b((?:XS|S|M|L|XL|XXL|XXXL)(?:\s*[-/]\s*(?:XS|S|M|L|XL|XXL|XXXL)){1,6})\b/i,
    );
    if (letterSize) out.size = letterSize[1].toUpperCase().replace(/\s/g, "");
  }

  // ЦЕНА: 35.0000 / 44,00 SET / 42 TL
  let priceM = text.match(/(\d{1,6})[.,]0{3,}/);
  if (!priceM) priceM = text.match(/(\d{2,6})[.,]\d{2}\s*(?:SET|TL|₺)/i);
  if (!priceM) priceM = text.match(/(\d{2,6})\s*(?:TL|₺)/i);
  if (priceM) out.price = priceM[1];

  return out;
}
