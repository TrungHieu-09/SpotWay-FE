export type PixelCoordinate = {
  pixelX: number
  pixelY: number
}

export type PercentCoordinate = {
  /** 0-100, percentage on the floor plan width. Not a pixel value. */
  x: number
  /** 0-100, percentage on the floor plan height. Not a pixel value. */
  y: number
}

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Number(value.toFixed(2))))
}

export function pixelToPercent(
  pixelX: number,
  pixelY: number,
  width: number,
  height: number,
): PercentCoordinate {
  return {
    x: clampPercent((pixelX / width) * 100),
    y: clampPercent((pixelY / height) * 100),
  }
}

export function percentToPixel(
  x: number,
  y: number,
  width: number,
  height: number,
): PixelCoordinate {
  return {
    pixelX: (x / 100) * width,
    pixelY: (y / 100) * height,
  }
}
