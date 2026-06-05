const imageCache = new Map<string, HTMLImageElement>();
const imagePromiseCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(source: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(source);
  if (cached) return Promise.resolve(cached);

  const pending = imagePromiseCache.get(source);
  if (pending) return pending;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      imageCache.set(source, image);
      imagePromiseCache.delete(source);
      resolve(image);
    };
    image.onerror = () => {
      imagePromiseCache.delete(source);
      reject(new Error(`Не удалось загрузить изображение: ${source.slice(0, 64)}`));
    };
    image.src = source;
  });

  imagePromiseCache.set(source, promise);
  return promise;
}

export function clearImageCache(): void {
  imageCache.clear();
  imagePromiseCache.clear();
}
