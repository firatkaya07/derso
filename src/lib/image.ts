/** Kabul edilen logo dosya türleri. */
export const LOGO_ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

/** Ölçeklemeden önceki en büyük dosya boyu. */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Görsel okunamadı. Farklı bir dosya deneyin."));
    image.src = url;
  });
}

/** Dosya doğrulama ve kare tuvale çizim — her iki dışa-aktarım biçimi için ortak. */
async function prepareSquareCanvas(
  file: File,
  size: number
): Promise<{ canvas: HTMLCanvasElement; cleanup: () => void }> {
  if (!LOGO_ACCEPTED_TYPES.includes(file.type)) {
    throw new Error("Yalnızca PNG, JPEG, WEBP veya SVG dosyası yükleyebilirsiniz.");
  }
  if (file.size > LOGO_MAX_BYTES) {
    throw new Error("Dosya 2 MB'tan küçük olmalı.");
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(url);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) {
      throw new Error("Görselin boyutu okunamadı. PNG veya JPEG deneyin.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Tarayıcı görsel işlemeyi desteklemiyor.");

    const scale = Math.min(size / width, size / height);
    const targetWidth = width * scale;
    const targetHeight = height * scale;
    context.drawImage(
      image,
      (size - targetWidth) / 2,
      (size - targetHeight) / 2,
      targetWidth,
      targetHeight
    );

    return { canvas, cleanup: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/**
 * Görseli, en-boy oranını bozmadan kare bir tuvale ortalayarak ölçekler ve
 * data URL döndürür.
 *
 * Kare çıktı, logonun çıktılarda ve arayüzde her zaman aynı yeri kaplamasını
 * sağlar; oran korunduğu için görsel ezilmez, artan kenarlar saydam kalır.
 */
export async function resizeImageToSquareDataUrl(
  file: File,
  size: number
): Promise<string> {
  const { canvas, cleanup } = await prepareSquareCanvas(file, size);
  try {
    return canvas.toDataURL("image/png");
  } finally {
    cleanup();
  }
}

/**
 * Görseli kare tuvale ölçekleyip WEBP blob döndürür (depolama yüklemesi için).
 */
export async function resizeImageToSquareWebpBlob(
  file: File,
  size: number
): Promise<Blob> {
  const { canvas, cleanup } = await prepareSquareCanvas(file, size);
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Görsel WEBP olarak dönüştürülemedi."));
        },
        "image/webp",
        0.9
      );
    });
    return blob;
  } finally {
    cleanup();
  }
}
