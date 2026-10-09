/**
 * Prepara un'immagine prima del caricamento (solo nel browser): controlla il
 * tipo, la riduce a una dimensione adatta e la comprime.
 *
 * Perché: le immagini della vetrina sono servite direttamente dallo storage,
 * senza passare dall'ottimizzatore di Next, quindi il cliente scarica il file
 * così com'è. Un banner da 6 MB scattato col telefono rallenta la pagina di un
 * ristorante per ogni cliente, ogni volta.
 */

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

export interface PrepareOptions {
  /** Lato massimo in pixel (il lato più lungo). */
  maxSize: number;
  /** Il logo può avere trasparenza: niente JPEG se il WebP non è disponibile. */
  keepAlpha: boolean;
  /** Dimensione obiettivo in byte: sopra, si abbassa la qualità. */
  targetBytes: number;
}

export class ImageError extends Error {}

const extFor = (type: string) => (type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg');

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function load(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      /* si prova con <img> */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageError('Il file non sembra un’immagine valida.'));
    };
    img.src = url;
  });
}

export async function prepareImage(file: File, opts: PrepareOptions): Promise<File> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new ImageError('Formato non supportato: usa un’immagine PNG, JPG o WebP.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageError('L’immagine è troppo pesante (massimo 12 MB).');
  }

  const bitmap = await load(file);
  const w = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width;
  const h = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height;
  if (!w || !h) throw new ImageError('Il file non sembra un’immagine valida.');

  const scale = Math.min(1, opts.maxSize / Math.max(w, h));
  const width = Math.max(1, Math.round(w * scale));
  const height = Math.max(1, Math.round(h * scale));

  // Già abbastanza piccola e leggera: si lascia com'è.
  if (scale === 1 && file.size <= opts.targetBytes) {
    if ('close' in bitmap) bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageError('Impossibile elaborare l’immagine su questo dispositivo.');
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
  if ('close' in bitmap) bitmap.close();

  // WebP se il browser lo sa produrre, altrimenti PNG (logo) o JPEG (banner).
  const fallback = opts.keepAlpha ? 'image/png' : 'image/jpeg';
  let best: Blob | null = null;
  for (const quality of [0.85, 0.75, 0.65, 0.55]) {
    let blob = await toBlob(canvas, 'image/webp', quality);
    if (!blob || blob.type !== 'image/webp') {
      blob = await toBlob(canvas, fallback, fallback === 'image/png' ? undefined : quality);
    }
    if (!blob) continue;
    best = blob;
    if (blob.size <= opts.targetBytes || blob.type === 'image/png') break;
  }
  if (!best) throw new ImageError('Impossibile elaborare l’immagine su questo dispositivo.');

  // Se non è migliorata, si tiene l'originale (se non troppo grande).
  if (best.size >= file.size && scale === 1) return file;

  const base = file.name.replace(/\.[^.]+$/, '') || 'immagine';
  return new File([best], `${base}.${extFor(best.type)}`, { type: best.type });
}

/** Misure e pesi consigliati per le due immagini del profilo. */
export const LOGO_OPTIONS: PrepareOptions = { maxSize: 512, keepAlpha: true, targetBytes: 120 * 1024 };
export const BANNER_OPTIONS: PrepareOptions = { maxSize: 1600, keepAlpha: false, targetBytes: 400 * 1024 };
