/**
 * Turns the photograph into a luminance matrix at grid resolution, so the
 * field can dither it into glyphs.
 *
 * No build step is involved. The image is decoded once, then re-sampled
 * whenever the grid changes size — which means the portrait is always
 * pixel-exact for the current viewport instead of being a fixed-resolution
 * asset that goes soft on a large screen.
 */

export interface PortraitData {
  lum: Float32Array;
  cols: number;
  rows: number;
}

let cached: HTMLImageElement | null = null;
let pending: Promise<HTMLImageElement> | null = null;

const decode = (src: string): Promise<HTMLImageElement> => {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;

  pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      cached = img;
      resolve(img);
    };
    img.onerror = () => reject(new Error(`portrait failed to load: ${src}`));
    img.src = src;
  });

  return pending;
};

/** Where the portrait sits within the grid, as fractions of the full width. */
export interface PortraitRegion {
  x: number;
  w: number;
}

/**
 * Sample the decoded image into a cols×rows luminance buffer.
 *
 * The whole photograph is fitted inside the region rather than cropped to
 * fill it. Cropping a portrait-orientation frame into a roughly square region
 * throws away the street, the billboards and the rain — which is to say
 * everything that makes the picture worth dithering in the first place.
 *
 * @param cellAspect height/width of one character cell. Cells are about twice
 *        as tall as they are wide, so fitting has to be done in screen units
 *        and only then converted back into cells; skip this and the image
 *        comes out stretched vertically by that same factor.
 * @param region horizontal slice of the grid the portrait may occupy. On wide
 *        screens it is confined to the right of the frame so the bio column
 *        never lands on top of the face; everything outside stays at zero and
 *        simply renders as the surrounding noise.
 */
export const samplePortrait = (
  img: HTMLImageElement,
  cols: number,
  rows: number,
  cellAspect: number,
  region: PortraitRegion = { x: 0, w: 1 },
): PortraitData => {
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const regionX = Math.round(cols * region.x);
  const regionW = Math.max(1, Math.round(cols * region.w));

  // Contain-fit, measured in screen units and converted back to cells.
  const srcAspect = img.width / img.height;
  let destH = rows;
  let destW = rows * cellAspect * srcAspect;
  if (destW > regionW) {
    destW = regionW;
    destH = destW / (cellAspect * srcAspect);
  }

  const dx = regionX + (regionW - destW) / 2;
  const dy = (rows - destH) / 2;

  ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, destW, destH);
  const { data } = ctx.getImageData(0, 0, cols, rows);

  const lum = new Float32Array(cols * rows);
  let min = 1;
  let max = 0;

  for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
    // Rec. 601 luma — closer to perceived brightness than a flat average,
    // which matters a lot when the whole image is dark reds and cyans.
    // Alpha gates it, so cells outside the drawn region stay at zero.
    const a = data[p + 3] / 255;
    const l = ((data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114) / 255) * a;
    lum[i] = l;
    if (a > 0.5) {
      if (l < min) min = l;
      if (l > max) max = l;
    }
  }

  /*
    Auto-levels, then invert, then a contrast curve.

    The inversion is the important part. In the source the artist is a dark
    silhouette against bright neon — and this field is additive glyphs on a
    black page, so mapping bright-to-dense would render the city and leave a
    person-shaped hole where the subject is. Inverted, the figure becomes the
    densest part of the grid and the neon behind him falls away to nothing.

    The exponent then pushes the mid-tones (wet road, middle distance) down
    so the silhouette is the only thing that really lights up, and the 0.9
    ceiling leaves headroom so large flat areas of the coat do not all clip
    to the same solid block.
  */
  const range = Math.max(0.0001, max - min);
  for (let i = 0, p = 3; i < lum.length; i++, p += 4) {
    if (data[p] < 128) {
      lum[i] = 0;
      continue;
    }
    const n = Math.max(0, Math.min(1, (lum[i] - min) / range));
    lum[i] = Math.pow(1 - n, 1.8);
  }

  // Feather the frame edges so the picture dissolves into the surrounding
  // static instead of ending at a hard rectangle. This is what sells the
  // image as something forming *out of* the field rather than pasted on it.
  const fx = Math.max(2, destW * 0.16);
  const fy = Math.max(2, destH * 0.16);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (lum[i] === 0) continue;
      const edgeX = Math.min(x - dx, dx + destW - 1 - x);
      const edgeY = Math.min(y - dy, dy + destH - 1 - y);
      const k = Math.min(1, Math.max(0, edgeX / fx)) * Math.min(1, Math.max(0, edgeY / fy));
      lum[i] *= k;
    }
  }

  return { lum, cols, rows };
};

/** Convenience: decode (cached) then sample. */
export const loadPortrait = async (
  src: string,
  cols: number,
  rows: number,
  cellAspect: number,
  region?: PortraitRegion,
): Promise<PortraitData> => samplePortrait(await decode(src), cols, rows, cellAspect, region);

/** True once the image has been decoded, so re-sampling is synchronous. */
export const portraitReady = (): HTMLImageElement | null => cached;
