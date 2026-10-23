import type { Point, Room } from '../types/geometry'

export type PlanRecognitionParams = {
  thresholdOffset: number
  minRoomArea: number
  simplifyTolerance: number
  gapBridgePercent: number
}

export type PlanRecognitionResult = {
  rooms: Room[]
  wallMaskDataUrl: string
  imageWidth: number
  imageHeight: number
  threshold: number
}

type Component = {
  pixels: number[]
  area: number
  minX: number
  minY: number
  maxX: number
  maxY: number
  touchesBoundary: boolean
}

type CanvasSource = OffscreenCanvas | HTMLCanvasElement
type Canvas2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

const MAX_RECOGNITION_SIDE = 1000
const MAX_STORAGE_IMAGE_SIDE = 1600
function createCanvas(width: number, height: number): CanvasSource {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function getCanvas2DContext(
  canvas: CanvasSource,
  options?: CanvasRenderingContext2DSettings,
) {
  return canvas.getContext('2d', options) as Canvas2DContext | null
}

function canvasToDataUrl(canvas: CanvasSource, type = 'image/png', quality?: number) {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type, quality }).then(blobToDataUrl)
  }

  return Promise.resolve(canvas.toDataURL(type, quality))
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Không đọc được ảnh'))
    reader.readAsDataURL(blob)
  })
}

async function loadBitmap(imageDataUrl: string) {
  const response = await fetch(imageDataUrl)
  const blob = await response.blob()
  return createImageBitmap(blob)
}

function getScaledSize(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function getGrayImage(imageData: ImageData) {
  const gray = new Uint8Array(imageData.width * imageData.height)
  const data = imageData.data

  for (let index = 0; index < gray.length; index += 1) {
    const offset = index * 4
    gray[index] = Math.round(
      data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114,
    )
  }

  return gray
}

function getOtsuThreshold(gray: Uint8Array) {
  const histogram = new Uint32Array(256)
  gray.forEach((value) => {
    histogram[value] += 1
  })

  const total = gray.length
  let sum = 0
  for (let value = 0; value < 256; value += 1) {
    sum += value * histogram[value]
  }

  let backgroundWeight = 0
  let backgroundSum = 0
  let maxVariance = 0
  let threshold = 128

  for (let value = 0; value < 256; value += 1) {
    backgroundWeight += histogram[value]
    if (backgroundWeight === 0) {
      continue
    }

    const foregroundWeight = total - backgroundWeight
    if (foregroundWeight === 0) {
      break
    }

    backgroundSum += value * histogram[value]
    const backgroundMean = backgroundSum / backgroundWeight
    const foregroundMean = (sum - backgroundSum) / foregroundWeight
    const variance =
      backgroundWeight *
      foregroundWeight *
      (backgroundMean - foregroundMean) *
      (backgroundMean - foregroundMean)

    if (variance > maxVariance) {
      maxVariance = variance
      threshold = value
    }
  }

  return threshold
}

function dilate(mask: Uint8Array, width: number, height: number, radius: number) {
  const output = new Uint8Array(mask.length)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let found = false
      for (let dy = -radius; dy <= radius && !found; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nextX = x + dx
          const nextY = y + dy
          if (
            nextX >= 0 &&
            nextX < width &&
            nextY >= 0 &&
            nextY < height &&
            mask[nextY * width + nextX] === 1
          ) {
            found = true
            break
          }
        }
      }
      output[y * width + x] = found ? 1 : 0
    }
  }

  return output
}

function erode(mask: Uint8Array, width: number, height: number, radius: number) {
  const output = new Uint8Array(mask.length)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let allFound = true
      for (let dy = -radius; dy <= radius && allFound; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nextX = x + dx
          const nextY = y + dy
          if (
            nextX < 0 ||
            nextX >= width ||
            nextY < 0 ||
            nextY >= height ||
            mask[nextY * width + nextX] === 0
          ) {
            allFound = false
            break
          }
        }
      }
      output[y * width + x] = allFound ? 1 : 0
    }
  }

  return output
}

function closeMask(
  mask: Uint8Array,
  width: number,
  height: number,
  radius = 1,
) {
  return erode(dilate(mask, width, height, radius), width, height, radius)
}

function bridgeWallGaps(
  mask: Uint8Array,
  width: number,
  height: number,
  maxGap: number,
) {
  const output = new Uint8Array(mask)

  for (let y = 0; y < height; y += 1) {
    let x = 0
    while (x < width) {
      const index = y * width + x
      if (mask[index] !== 1) {
        x += 1
        continue
      }

      let nextX = x + 1
      while (nextX < width && mask[y * width + nextX] === 0) {
        nextX += 1
      }

      const gap = nextX - x - 1
      if (gap > 0 && gap <= maxGap && nextX < width) {
        for (let fillX = x + 1; fillX < nextX; fillX += 1) {
          output[y * width + fillX] = 1
        }
      }

      x = Math.max(nextX, x + 1)
    }
  }

  for (let x = 0; x < width; x += 1) {
    let y = 0
    while (y < height) {
      const index = y * width + x
      if (output[index] !== 1) {
        y += 1
        continue
      }

      let nextY = y + 1
      while (nextY < height && output[nextY * width + x] === 0) {
        nextY += 1
      }

      const gap = nextY - y - 1
      if (gap > 0 && gap <= maxGap && nextY < height) {
        for (let fillY = y + 1; fillY < nextY; fillY += 1) {
          output[fillY * width + x] = 1
        }
      }

      y = Math.max(nextY, y + 1)
    }
  }

  return output
}

function prepareWallMaskForRooms(
  mask: Uint8Array,
  width: number,
  height: number,
  gapBridgePercent: number,
) {
  const normalizedGapPercent = Math.min(12, Math.max(0, gapBridgePercent))
  const maxGap = Math.max(
    8,
    Math.round(Math.max(width, height) * (normalizedGapPercent / 100)),
  )
  const lightlyClosed = closeMask(mask, width, height, 1)
  const bridged = bridgeWallGaps(lightlyClosed, width, height, maxGap)
  return closeMask(bridged, width, height, 1)
}

function labelComponents(mask: Uint8Array, width: number, height: number, target: 0 | 1) {
  const labels = new Int32Array(mask.length)
  const components: Component[] = []
  let label = 0

  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] !== target || labels[start] !== 0) {
      continue
    }

    label += 1
    const stack = [start]
    labels[start] = label
    const component: Component = {
      pixels: [],
      area: 0,
      minX: width,
      minY: height,
      maxX: 0,
      maxY: 0,
      touchesBoundary: false,
    }

    while (stack.length > 0) {
      const index = stack.pop()
      if (index === undefined) {
        continue
      }

      const x = index % width
      const y = Math.floor(index / width)
      component.pixels.push(index)
      component.area += 1
      component.minX = Math.min(component.minX, x)
      component.minY = Math.min(component.minY, y)
      component.maxX = Math.max(component.maxX, x)
      component.maxY = Math.max(component.maxY, y)
      component.touchesBoundary ||= x === 0 || y === 0 || x === width - 1 || y === height - 1

      const neighbors = [
        index - 1,
        index + 1,
        index - width,
        index + width,
      ]

      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= mask.length || labels[neighbor] !== 0) {
          continue
        }

        const neighborX = neighbor % width
        if (Math.abs(neighborX - x) > 1 || mask[neighbor] !== target) {
          continue
        }

        labels[neighbor] = label
        stack.push(neighbor)
      }
    }

    components.push(component)
  }

  return { labels, components }
}

function filterWallMask(mask: Uint8Array, width: number, height: number) {
  const { components } = labelComponents(mask, width, height, 1)
  const output = new Uint8Array(mask.length)
  const minWallArea = Math.max(24, Math.round(width * height * 0.00008))
  const minLongSide = Math.max(16, Math.round(Math.max(width, height) * 0.025))

  components.forEach((component) => {
    const componentWidth = component.maxX - component.minX + 1
    const componentHeight = component.maxY - component.minY + 1
    if (
      component.area < minWallArea ||
      Math.max(componentWidth, componentHeight) < minLongSide
    ) {
      return
    }

    component.pixels.forEach((pixel) => {
      output[pixel] = 1
    })
  })

  return output
}

function cross(origin: Point, left: Point, right: Point) {
  return (
    (left.x - origin.x) * (right.y - origin.y) -
    (left.y - origin.y) * (right.x - origin.x)
  )
}

function convexHull(points: Point[]) {
  const sortedPoints = [...points].sort((left, right) =>
    left.x === right.x ? left.y - right.y : left.x - right.x,
  )

  if (sortedPoints.length <= 3) {
    return sortedPoints
  }

  const lower: Point[] = []
  for (const point of sortedPoints) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop()
    }
    lower.push(point)
  }

  const upper: Point[] = []
  for (let index = sortedPoints.length - 1; index >= 0; index -= 1) {
    const point = sortedPoints[index]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop()
    }
    upper.push(point)
  }

  lower.pop()
  upper.pop()
  return [...lower, ...upper]
}

function pointLineDistance(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) /
    Math.hypot(dx, dy)
}

function simplifyOpen(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) {
    return points
  }

  let maxDistance = 0
  let splitIndex = 0
  const endIndex = points.length - 1

  for (let index = 1; index < endIndex; index += 1) {
    const distance = pointLineDistance(points[index], points[0], points[endIndex])
    if (distance > maxDistance) {
      maxDistance = distance
      splitIndex = index
    }
  }

  if (maxDistance <= tolerance) {
    return [points[0], points[endIndex]]
  }

  return [
    ...simplifyOpen(points.slice(0, splitIndex + 1), tolerance).slice(0, -1),
    ...simplifyOpen(points.slice(splitIndex), tolerance),
  ]
}

function simplifyPolygon(points: Point[], tolerance: number) {
  if (points.length <= 3) {
    return points
  }

  const simplified = simplifyOpen([...points, points[0]], tolerance).slice(0, -1)
  return simplified.length >= 3 ? simplified : points
}

function getBoundaryPoints(
  component: Component,
  labels: Int32Array,
  componentLabel: number,
  width: number,
  height: number,
) {
  const boundary: Point[] = []

  component.pixels.forEach((pixel) => {
    const x = pixel % width
    const y = Math.floor(pixel / width)
    const neighbors = [
      pixel - 1,
      pixel + 1,
      pixel - width,
      pixel + width,
    ]
    const isBoundary = neighbors.some((neighbor) => {
      if (neighbor < 0 || neighbor >= labels.length) {
        return true
      }

      const neighborX = neighbor % width
      return Math.abs(neighborX - x) > 1 || labels[neighbor] !== componentLabel
    })

    if (isBoundary) {
      boundary.push({
        x: (x / Math.max(1, width - 1)) * 100,
        y: (y / Math.max(1, height - 1)) * 100,
      })
    }
  })

  return boundary
}

function makeWallMaskDataUrl(mask: Uint8Array, width: number, height: number) {
  const canvas = createCanvas(width, height)
  const context = getCanvas2DContext(canvas)
  if (!context) {
    return Promise.resolve('')
  }

  const imageData = context.createImageData(width, height)
  for (let index = 0; index < mask.length; index += 1) {
    const offset = index * 4
    imageData.data[offset] = 37
    imageData.data[offset + 1] = 99
    imageData.data[offset + 2] = 235
    imageData.data[offset + 3] = mask[index] === 1 ? 150 : 0
  }
  context.putImageData(imageData, 0, 0)
  return canvasToDataUrl(canvas)
}

export function extractRoomsFromWallMask(
  wallMask: Uint8Array,
  width: number,
  height: number,
  floorId: string,
  params: Pick<PlanRecognitionParams, 'minRoomArea' | 'simplifyTolerance'>,
) {
  const { labels, components } = labelComponents(wallMask, width, height, 0)
  const rooms: Room[] = []

  components.forEach((component, index) => {
    if (component.touchesBoundary || component.area < params.minRoomArea) {
      return
    }

    const boundary = getBoundaryPoints(component, labels, index + 1, width, height)
    const polygon = simplifyPolygon(
      convexHull(boundary),
      params.simplifyTolerance,
    ).map((point) => ({
      x: Number(point.x.toFixed(2)),
      y: Number(point.y.toFixed(2)),
    }))

    if (polygon.length < 3) {
      return
    }

    rooms.push({
      id: `room-${floorId}-${rooms.length + 1}`,
      floorId,
      name: `Phòng ${rooms.length + 1}`,
      type: 'other',
      storeId: null,
      polygon,
    })
  })

  return rooms
}

export async function recognizePlanImage(
  imageDataUrl: string,
  floorId: string,
  params: PlanRecognitionParams,
): Promise<PlanRecognitionResult> {
  const bitmap = await loadBitmap(imageDataUrl)
  const size = getScaledSize(bitmap.width, bitmap.height, MAX_RECOGNITION_SIDE)
  const canvas = createCanvas(size.width, size.height)
  const context = getCanvas2DContext(canvas, { willReadFrequently: true })

  if (!context) {
    throw new Error('Trình duyệt không hỗ trợ xử lý ảnh bằng Canvas')
  }

  context.drawImage(bitmap, 0, 0, size.width, size.height)
  const imageData = context.getImageData(0, 0, size.width, size.height)
  const gray = getGrayImage(imageData)
  const otsuThreshold = getOtsuThreshold(gray)
  const threshold = Math.min(245, Math.max(10, otsuThreshold + params.thresholdOffset))
  const wallMask = new Uint8Array(gray.length)

  gray.forEach((value, index) => {
    wallMask[index] = value <= threshold ? 1 : 0
  })

  const cleanWallMask = prepareWallMaskForRooms(
    filterWallMask(wallMask, size.width, size.height),
    size.width,
    size.height,
    params.gapBridgePercent,
  )
  const rooms = extractRoomsFromWallMask(
    cleanWallMask,
    size.width,
    size.height,
    floorId,
    params,
  )
  const wallMaskDataUrl = await makeWallMaskDataUrl(
    cleanWallMask,
    size.width,
    size.height,
  )

  return {
    rooms,
    wallMaskDataUrl,
    imageWidth: bitmap.width,
    imageHeight: bitmap.height,
    threshold,
  }
}

export function recognizePlanInWorker(
  imageDataUrl: string,
  floorId: string,
  params: PlanRecognitionParams,
) {
  return new Promise<PlanRecognitionResult>((resolve, reject) => {
    const worker = new Worker(new URL('./planRecognition.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<
      | { type: 'success'; result: PlanRecognitionResult }
      | { type: 'error'; message: string }
    >) => {
      worker.terminate()
      if (event.data.type === 'success') {
        resolve(event.data.result)
        return
      }

      reject(new Error(event.data.message))
    }
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message))
    }
    worker.postMessage({ imageDataUrl, floorId, params })
  })
}

export async function compressPlanImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('File tải lên phải là ảnh')
  }

  const bitmap = await createImageBitmap(file)
  const size = getScaledSize(bitmap.width, bitmap.height, MAX_STORAGE_IMAGE_SIDE)
  const canvas = createCanvas(size.width, size.height)
  const context = getCanvas2DContext(canvas)

  if (!context) {
    throw new Error('Trình duyệt không hỗ trợ nén ảnh bằng Canvas')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, size.width, size.height)
  context.drawImage(bitmap, 0, 0, size.width, size.height)
  const type = 'image/webp'
  const dataUrl = await canvasToDataUrl(canvas, type, 0.8)

  return {
    dataUrl,
    width: size.width,
    height: size.height,
  }
}

export function calculateRealHeightM(
  realWidthM: number,
  imageWidth: number,
  imageHeight: number,
) {
  return Number(((realWidthM * imageHeight) / Math.max(1, imageWidth)).toFixed(2))
}

export function runSyntheticPlanRecognitionCheck() {
  if (!import.meta.env.DEV) {
    return
  }

  const width = 240
  const height = 180
  const wallMask = new Uint8Array(width * height)

  function drawWallRect(x: number, y: number, rectWidth: number, rectHeight: number) {
    for (let row = y; row < y + rectHeight; row += 1) {
      for (let column = x; column < x + rectWidth; column += 1) {
        wallMask[row * width + column] = 1
      }
    }
  }

  function eraseWallRect(x: number, y: number, rectWidth: number, rectHeight: number) {
    for (let row = y; row < y + rectHeight; row += 1) {
      for (let column = x; column < x + rectWidth; column += 1) {
        wallMask[row * width + column] = 0
      }
    }
  }

  drawWallRect(20, 20, 200, 6)
  drawWallRect(20, 20, 6, 140)
  drawWallRect(214, 20, 6, 140)
  drawWallRect(20, 154, 200, 6)
  drawWallRect(85, 20, 6, 140)
  drawWallRect(150, 20, 6, 140)
  eraseWallRect(85, 72, 6, 16)
  eraseWallRect(150, 92, 6, 16)

  const rooms = extractRoomsFromWallMask(
    prepareWallMaskForRooms(wallMask, width, height, 6),
    width,
    height,
    'synthetic',
    {
      minRoomArea: 600,
      simplifyTolerance: 1.2,
    },
  )
  console.info(`[planRecognition] Synthetic gap-bridge check: ${rooms.length} phòng`)
}
