import { useEffect, useRef, useState } from "react";
import { parseLabel, recognizeLabel, type ParsedLabel } from "../lib/scanLabel";

interface Props {
  onResult: (parsed: ParsedLabel) => void;
  onClose: () => void;
}

type Worker = { recognize: (img: unknown) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };

function score(p: ParsedLabel): number {
  return [p.code, p.category, p.color, p.size, p.price].filter(Boolean).length;
}

export function LabelScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const runningRef = useRef(true);
  const busyRef = useRef(false);

  const [status, setStatus] = useState("Запуск камеры…");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    runningRef.current = true;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
      } catch {
        setError("Камера недоступна. Разреши доступ к камере в браузере или загрузи фото.");
        return;
      }

      setStatus("Загрузка распознавания…");
      try {
        const { createWorker } = await import("tesseract.js");
        workerRef.current = (await createWorker("tur+eng")) as unknown as Worker;
      } catch {
        setError("Не удалось загрузить распознавание. Попробуй позже или загрузи фото.");
        return;
      }
      setReady(true);
      setStatus("Наведите на наклейку…");
      loop();
    })();

    return () => {
      runningRef.current = false;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      workerRef.current?.terminate().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function grabFrame(): HTMLCanvasElement | null {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;
    // Берём центральную область кадра (где рамка-подсказка) — меньше фона, точнее.
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = Math.round(vw * 0.92);
    const ch = Math.round(vh * 0.62);
    const sx = Math.round((vw - cw) / 2);
    const sy = Math.round((vh - ch) / 2);
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, sx, sy, cw, ch, 0, 0, cw, ch);
    return canvas;
  }

  async function scanOnce(): Promise<boolean> {
    const worker = workerRef.current;
    const canvas = grabFrame();
    if (!worker || !canvas) return false;
    const { data } = await worker.recognize(canvas);
    const parsed = parseLabel(data.text || "");
    // Принимаем, когда уверенно: есть код + ещё минимум 2 поля.
    if (parsed.code && score(parsed) >= 3) {
      finish(parsed);
      return true;
    }
    return false;
  }

  async function loop() {
    while (runningRef.current) {
      if (!busyRef.current) {
        busyRef.current = true;
        try {
          const ok = await scanOnce();
          if (ok) return;
        } catch {
          /* keep scanning */
        } finally {
          busyRef.current = false;
        }
      }
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  function finish(parsed: ParsedLabel) {
    runningRef.current = false;
    onResult(parsed);
  }

  async function captureNow() {
    if (busyRef.current) return;
    setStatus("Распознаю…");
    busyRef.current = true;
    try {
      const worker = workerRef.current;
      const canvas = grabFrame();
      if (worker && canvas) {
        const { data } = await worker.recognize(canvas);
        const parsed = parseLabel(data.text || "");
        if (score(parsed) >= 1) {
          finish(parsed);
          return;
        }
      }
      setStatus("Не распозналось — наведи ближе и ровнее, без бликов.");
    } finally {
      busyRef.current = false;
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    runningRef.current = false;
    setStatus("Распознаю фото…");
    try {
      const parsed = parseLabel(await recognizeLabel(file));
      if (score(parsed) >= 1) finish(parsed);
      else setStatus("Не распозналось. Сфотографируй крупнее и без бликов.");
    } catch {
      setStatus("Ошибка распознавания.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="font-semibold">Сканер наклейки</span>
        <button className="rounded-full px-3 py-1 text-sm hover:bg-white/10" onClick={onClose}>
          Закрыть
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {!error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[40%] w-[88%] rounded-xl border-2 border-white/80 shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">
            <div>
              <p className="mb-4">{error}</p>
              <label className="btn-clay inline-block cursor-pointer">
                Загрузить фото
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {!error && (
        <div className="space-y-3 bg-black px-4 py-4 text-center text-white">
          <p className="text-sm text-white/80">{status}</p>
          <div className="flex justify-center gap-3">
            <button
              className="btn-clay"
              onClick={captureNow}
              disabled={!ready}
            >
              Снять сейчас
            </button>
            <label className="btn-ghost cursor-pointer bg-white">
              Из галереи
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
          </div>
          <p className="text-xs text-white/50">Держи ровно, наклейка в рамке, без бликов</p>
        </div>
      )}
    </div>
  );
}
