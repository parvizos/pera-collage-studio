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
export function parseLabel(raw: string): ParsedLabel {
  const out: ParsedLabel = {};
  const text = raw.replace(/\r/g, "");
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  // КОД: POL-426151047, EXPO-533-B, ABC-1234B...
  const codeRe = /\b([A-ZÇĞİÖŞÜ]{2,6}[-‐–]\d{2,}[A-Z0-9-]*)\b/;
  for (const l of lines) {
    const up = l.toUpperCase();
    const m = up.match(codeRe);
    if (m) {
      out.code = m[1].replace(/[‐–]/g, "-");
      // КАТЕГОРИЯ: слово сразу после кода на той же строке (MONT, TAKIM...)
      const rest = up.slice(up.indexOf(m[1]) + m[1].length).trim();
      const cat = rest.match(/^([A-ZÇĞİÖŞÜ]{2,15})/);
      if (cat) out.category = cat[1];
      break;
    }
  }

  // РАЗМЕР: 36-40, 36 - 42
  const sizeM = text.match(/\b(\d{2})\s*[-‐–]\s*(\d{2})\b/);
  if (sizeM) out.size = `${sizeM[1]}-${sizeM[2]}`;

  // ЦЕНА: 35.0000 / 35,00 SET / 35 TL
  let priceM = text.match(/(\d{1,6})[.,]0{3,}/);
  if (!priceM) priceM = text.match(/(\d{2,6})[.,]\d{2}\s*(?:SET|TL|₺)/i);
  if (!priceM) priceM = text.match(/(\d{2,6})\s*(?:TL|₺)/i);
  if (priceM) out.price = priceM[1];

  // ЦВЕТ: одиночное слово с заглавной (не аббревиатура, не бренд/соцсети)
  const blacklist = new Set(
    ["PERA", "İSTANBUL", "ISTANBUL", "POLIN", "POLİN", "MONT", "TAKIM", "SET", out.category, out.code]
      .filter(Boolean)
      .map((s) => (s as string).toUpperCase()),
  );
  for (const l of lines) {
    if (/store|www|http|insta|\+?\d[\d\s]{6,}/i.test(l)) continue; // соцсети/телефон
    const m = l.match(/\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,14})\b/);
    if (m && !blacklist.has(m[1].toUpperCase())) {
      out.color = m[1];
      break;
    }
  }

  return out;
}
