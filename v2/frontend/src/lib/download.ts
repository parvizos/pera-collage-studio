/**
 * Downloads a file (URL or data URL) to the user's device with a given name.
 * Fetches the blob first so the download works reliably and keeps the filename.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Не удалось загрузить файл");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

function extFromPath(path: string): string {
  const m = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(path);
  return m ? m[1] : "png";
}

/** Downloads all original source photos of a record sequentially. */
export async function downloadOriginals(
  baseName: string,
  originals: { index: number; imagePath: string; fileName?: string }[],
): Promise<void> {
  for (const photo of originals) {
    const ext = extFromPath(photo.fileName || photo.imagePath);
    // eslint-disable-next-line no-await-in-loop
    await downloadFile(photo.imagePath, `${baseName}_исходник-${photo.index + 1}.${ext}`);
  }
}
