import { useEffect, useRef, useState } from "react";

interface DitherImageProps {
  src: string;
  alt: string;
  /** Internal dither grid resolution (pixels per side). */
  resolution?: number;
  /** Color quantization levels per RGB channel (lower = stronger dither). */
  levels?: number;
  isDark?: boolean;
  className?: string;
}

/**
 * Applies per-channel RGB Atkinson dithering to preserve original image colors
 * with a crisp, retro pixel-dither texture.
 */
function renderColorAtkinsonDither(
  rgbSrc: Float32Array,
  width: number,
  height: number,
  levels: number,
  out: Uint8ClampedArray
): void {
  const buf = new Float32Array(rgbSrc);
  const maxLevel = Math.max(1, levels - 1);
  const step = 255 / maxLevel;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const idx = row + x;
      const base = idx * 3;
      const outBase = idx * 4;

      for (let c = 0; c < 3; c++) {
        const oldVal = buf[base + c] ?? 0;
        const clamped = oldVal < 0 ? 0 : oldVal > 255 ? 255 : oldVal;
        const newVal = Math.round(clamped / step) * step;
        const err = (oldVal - newVal) / 8;

        if (x + 1 < width) buf[(idx + 1) * 3 + c] = (buf[(idx + 1) * 3 + c] ?? 0) + err;
        if (x + 2 < width) buf[(idx + 2) * 3 + c] = (buf[(idx + 2) * 3 + c] ?? 0) + err;
        if (y + 1 < height) {
          const nextRow = idx + width;
          if (x - 1 >= 0) buf[(nextRow - 1) * 3 + c] = (buf[(nextRow - 1) * 3 + c] ?? 0) + err;
          buf[nextRow * 3 + c] = (buf[nextRow * 3 + c] ?? 0) + err;
          if (x + 1 < width) buf[(nextRow + 1) * 3 + c] = (buf[(nextRow + 1) * 3 + c] ?? 0) + err;
        }
        if (y + 2 < height) {
          buf[(idx + width * 2) * 3 + c] = (buf[(idx + width * 2) * 3 + c] ?? 0) + err;
        }

        out[outBase + c] = Math.round(newVal);
      }
      out[outBase + 3] = 255;
    }
  }
}

export function DitherImage({
  src,
  alt,
  resolution = 68,
  levels = 5,
  isDark = true,
  className = "",
}: DitherImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);

    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = "high";

    img.onload = () => {
      if (cancelled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const offscreen = document.createElement("canvas");
      offscreen.width = resolution;
      offscreen.height = resolution;
      const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return;

      // Center-crop square cover
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      offCtx.drawImage(img, sx, sy, side, side, 0, 0, resolution, resolution);

      const { data } = offCtx.getImageData(0, 0, resolution, resolution);
      const pixelCount = resolution * resolution;
      const rgb = new Float32Array(pixelCount * 3);

      for (let i = 0; i < pixelCount; i++) {
        const srcIdx = i * 4;
        const dstIdx = i * 3;
        rgb[dstIdx] = data[srcIdx] ?? 0;
        rgb[dstIdx + 1] = data[srcIdx + 1] ?? 0;
        rgb[dstIdx + 2] = data[srcIdx + 2] ?? 0;
      }

      const imageData = ctx.createImageData(resolution, resolution);
      renderColorAtkinsonDither(rgb, resolution, resolution, levels, imageData.data);
      ctx.putImageData(imageData, 0, 0);
      setLoaded(true);
    };

    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, resolution, levels]);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl border transition-colors duration-300 ${
        isDark
          ? "border-white/15 bg-white/[0.03] shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
          : "border-neutral-900/15 bg-neutral-900/[0.03] shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
      } ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={resolution}
        height={resolution}
        role="img"
        aria-label={alt}
        style={{ imageRendering: "pixelated" }}
        className={`block w-full h-full transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
      {!loaded && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 animate-pulse ${
            isDark ? "bg-white/5" : "bg-neutral-900/5"
          }`}
        />
      )}
    </div>
  );
}

export default DitherImage;
