// Client-side product photo background replacement.
// 1) cutout(): removes the original background in the browser (ONNX model).
// 2) compose(): places the cutout on one of the Gol-e Khan brand backgrounds with
//    soft edges, a contact shadow and a gentle drop shadow, then exports a JPEG.

export interface PhotoBackground {
  id: string;
  label: string;
  src: string;
  thumb: string;
}

export const PHOTO_BACKGROUNDS: PhotoBackground[] = [
  { id: '01-cream', label: 'کرمی' },
  { id: '02-beige', label: 'بژ' },
  { id: '03-sage', label: 'سیج' },
  { id: '04-light-gray', label: 'طوسی روشن' },
  { id: '05-blush', label: 'گلبهی' },
  { id: '06-dusty-blue', label: 'آبی غبارآلود' },
].map((b) => ({ ...b, src: `/backgrounds/${b.id}.jpg`, thumb: `/backgrounds/${b.id}-thumb.jpg` }));

const OUT = 1600; // final square size in px
const MAX_BYTES = 2.8 * 1024 * 1024; // backend limit is 3 MB
const MAX_INPUT_SIDE = 1800; // downscale big phone photos before segmentation

export type CutoutProgress = (percent: number) => void;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('خواندن تصویر ممکن نشد.'));
    img.src = src;
  });
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toBlob(c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('ساخت تصویر ممکن نشد.'))), type, quality),
  );
}

/** Remove the background; returns a transparent PNG blob. */
export async function cutout(file: Blob, onProgress?: CutoutProgress): Promise<Blob> {
  const url = URL.createObjectURL(file);
  let prepared: Blob;
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_INPUT_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const c = canvas(Math.round(img.naturalWidth * scale), Math.round(img.naturalHeight * scale));
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    prepared = await toBlob(c, 'image/png');
  } finally {
    URL.revokeObjectURL(url);
  }

  const { removeBackground } = await import('@imgly/background-removal');
  const publicPath = process.env.NEXT_PUBLIC_BG_MODEL_URL || undefined; // optional self-hosted model files
  return removeBackground(prepared, {
    ...(publicPath ? { publicPath } : {}),
    model: 'medium',
    output: { format: 'image/png', quality: 1 },
    progress: (_key: string, current: number, total: number) => {
      if (onProgress && total > 0) onProgress(Math.min(100, Math.round((current / total) * 100)));
    },
  });
}

/** Soften the matte: 1px blur + levels, which removes halos without eating thin petals. */
function refineAlpha(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const { width: w, height: h } = c;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const a = new Float32Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255;
  const t = new Float32Array(w * h);
  // separable 3-tap blur
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      t[i] = (a[x > 0 ? i - 1 : i] + 2 * a[i] + a[x < w - 1 ? i + 1 : i]) / 4;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const v = (t[y > 0 ? i - w : i] + 2 * t[i] + t[y < h - 1 ? i + w : i]) / 4;
      // levels: kills the faint fringe and makes semi-transparent interior solid, keeps a smooth edge falloff
      const s = Math.min(1, Math.max(0, (v - 0.15) / 0.45));
      d[i * 4 + 3] = Math.round(s * s * (3 - 2 * s) * 255);
    }
  ctx.putImageData(img, 0, 0);
}

interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  baseX0: number;
  baseX1: number;
}

function subjectBounds(c: HTMLCanvasElement): Bounds | null {
  const { width: w, height: h } = c;
  const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return null;
  // horizontal extent of the lowest ~6% of the subject = where it touches the surface
  const band = Math.max(2, Math.round((y1 - y0) * 0.06));
  let bx0 = x1,
    bx1 = x0;
  for (let y = y1 - band; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (d[(y * w + x) * 4 + 3] > 40) {
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
      }
  return { x0, y0, x1, y1, baseX0: bx0, baseX1: Math.max(bx1, bx0 + 1) };
}

function averageColor(img: HTMLImageElement) {
  const c = canvas(16, 16);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, 16, 16);
  const d = ctx.getImageData(0, 0, 16, 16).data;
  let r = 0,
    g = 0,
    b = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
  }
  const n = d.length / 4;
  return { r: r / n, g: g / n, b: b / n };
}

/** Place a transparent cutout on a brand background and return a JPEG data URL (<= 2.8 MB). */
export async function compose(cutoutBlob: Blob, bg: PhotoBackground): Promise<string> {
  const objUrl = URL.createObjectURL(cutoutBlob);
  let subjImg: HTMLImageElement;
  try {
    subjImg = await loadImage(objUrl);
  } finally {
    URL.revokeObjectURL(objUrl);
  }
  const bgImg = await loadImage(bg.src);

  const src = canvas(subjImg.naturalWidth, subjImg.naturalHeight);
  src.getContext('2d')!.drawImage(subjImg, 0, 0);
  refineAlpha(src);
  const b = subjectBounds(src);
  if (!b) throw new Error('موضوع اصلی عکس پیدا نشد. عکسی با گل یا گیاه واضح‌تر انتخاب کنید.');

  const sw = b.x1 - b.x0 + 1;
  const sh = b.y1 - b.y0 + 1;
  // fit inside the safe area (leaves the debossed logo corner free)
  const scale = Math.min((OUT * 0.74) / sw, (OUT * 0.7) / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (OUT - dw) / 2;
  const baseY = OUT * 0.86; // surface line
  const dy = baseY - dh;

  const out = canvas(OUT, OUT);
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bgImg, 0, 0, OUT, OUT);

  const avg = averageColor(bgImg);
  const shade = (k: number, alpha: number) =>
    `rgba(${Math.round(avg.r * k)},${Math.round(avg.g * k)},${Math.round(avg.b * k)},${alpha})`;

  // 1) contact shadow: tight, dark ellipse under the base
  const baseCx = dx + ((b.baseX0 + b.baseX1) / 2 - b.x0) * scale;
  const baseW = Math.max((b.baseX1 - b.baseX0) * scale, dw * 0.25);
  ctx.save();
  ctx.translate(baseCx, baseY);
  ctx.scale(1, 0.13);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, baseW * 0.62);
  g.addColorStop(0, shade(0.28, 0.55));
  g.addColorStop(0.5, shade(0.35, 0.25));
  g.addColorStop(1, shade(0.4, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, baseW * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2) soft ambient drop shadow from the silhouette (canvas shadowBlur, works in every browser)
  ctx.save();
  ctx.shadowColor = shade(0.3, 0.3);
  ctx.shadowBlur = OUT * 0.03;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = OUT * 0.012;
  ctx.drawImage(src, b.x0, b.y0, sw, sh, dx, dy, dw, dh);
  ctx.restore();

  // 3) the subject itself, lightly tinted by the background colour so it sits in the scene
  const sub = canvas(Math.ceil(dw), Math.ceil(dh));
  const sctx = sub.getContext('2d')!;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(src, b.x0, b.y0, sw, sh, 0, 0, sub.width, sub.height);
  sctx.globalCompositeOperation = 'source-atop';
  sctx.fillStyle = `rgba(${Math.round(avg.r)},${Math.round(avg.g)},${Math.round(avg.b)},0.07)`;
  sctx.fillRect(0, 0, sub.width, sub.height);
  ctx.drawImage(sub, dx, dy);

  // export, lowering quality until it fits the upload limit
  for (const q of [0.92, 0.88, 0.84, 0.8, 0.74, 0.68]) {
    const blob = await toBlob(out, 'image/jpeg', q);
    if (blob.size <= MAX_BYTES || q === 0.68) {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error('خواندن تصویر نهایی ممکن نشد.'));
        r.readAsDataURL(blob);
      });
    }
  }
  throw new Error('ساخت تصویر نهایی ممکن نشد.');
}

/** Re-encode a large photo as JPEG so it fits the upload limit (used when a photo is > 3 MB). */
export async function shrinkToLimit(file: Blob): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    let side = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
    for (let attempt = 0; attempt < 5; attempt++) {
      const c = canvas(Math.round(img.naturalWidth * side), Math.round(img.naturalHeight * side));
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const blob = await toBlob(c, 'image/jpeg', 0.88);
      if (blob.size <= MAX_BYTES) {
        return await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => reject(new Error('خواندن تصویر ممکن نشد.'));
          r.readAsDataURL(blob);
        });
      }
      side *= 0.75;
    }
    throw new Error('حجم عکس بیش از حد است.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
