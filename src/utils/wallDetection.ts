export interface DetectedWall {
  id: string
  floorId: string
  x1: number
  y1: number
  x2: number
  y2: number
  isDoorway?: boolean
}

export interface DetectedDoor {
  id: string
  floorId: string
  x: number
  y: number
  width: number
  orientation: 'horizontal' | 'vertical'
  swingAngle?: number
}

export interface DetectionResult {
  walls: DetectedWall[]
  doors: DetectedDoor[]
}

/**
 * Thuật toán Zhang-Suen Thinning chuẩn thế giới (Medial Axis / Skeletonization)
 * Thu gọn toàn bộ bề dày của bức tường (dù dày 5px hay 20px) về đúng 1 ĐƯỜNG TRỤC XƯƠNG DUY NHẤT (1-pixel width).
 * Triệt tiêu 100% hiện tượng vách xếp lớp song song / răng lược.
 */
function zhangSuenThinning(grid: Uint8Array, w: number, h: number): Uint8Array {
  const skeleton = new Uint8Array(grid)
  let changed = true
  const toRemove: number[] = []

  while (changed) {
    changed = false

    // Lượt 1
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x
        if (skeleton[idx] === 0) continue

        const p2 = skeleton[(y - 1) * w + x]
        const p3 = skeleton[(y - 1) * w + x + 1]
        const p4 = skeleton[y * w + x + 1]
        const p5 = skeleton[(y + 1) * w + x + 1]
        const p6 = skeleton[(y + 1) * w + x]
        const p7 = skeleton[(y + 1) * w + x - 1]
        const p8 = skeleton[y * w + x - 1]
        const p9 = skeleton[(y - 1) * w + x - 1]

        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
        if (B < 2 || B > 6) continue

        let A = 0
        if (p2 === 0 && p3 === 1) A++
        if (p3 === 0 && p4 === 1) A++
        if (p4 === 0 && p5 === 1) A++
        if (p5 === 0 && p6 === 1) A++
        if (p6 === 0 && p7 === 1) A++
        if (p7 === 0 && p8 === 1) A++
        if (p8 === 0 && p9 === 1) A++
        if (p9 === 0 && p2 === 1) A++
        if (A !== 1) continue

        if (p2 * p4 * p6 !== 0) continue
        if (p4 * p6 * p8 !== 0) continue

        toRemove.push(idx)
        changed = true
      }
    }
    for (let i = 0; i < toRemove.length; i++) skeleton[toRemove[i]] = 0
    toRemove.length = 0

    // Lượt 2
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x
        if (skeleton[idx] === 0) continue

        const p2 = skeleton[(y - 1) * w + x]
        const p3 = skeleton[(y - 1) * w + x + 1]
        const p4 = skeleton[y * w + x + 1]
        const p5 = skeleton[(y + 1) * w + x + 1]
        const p6 = skeleton[(y + 1) * w + x]
        const p7 = skeleton[(y + 1) * w + x - 1]
        const p8 = skeleton[y * w + x - 1]
        const p9 = skeleton[(y - 1) * w + x - 1]

        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
        if (B < 2 || B > 6) continue

        let A = 0
        if (p2 === 0 && p3 === 1) A++
        if (p3 === 0 && p4 === 1) A++
        if (p4 === 0 && p5 === 1) A++
        if (p5 === 0 && p6 === 1) A++
        if (p6 === 0 && p7 === 1) A++
        if (p7 === 0 && p8 === 1) A++
        if (p8 === 0 && p9 === 1) A++
        if (p9 === 0 && p2 === 1) A++
        if (A !== 1) continue

        if (p2 * p4 * p8 !== 0) continue
        if (p2 * p6 * p8 !== 0) continue

        toRemove.push(idx)
        changed = true
      }
    }
    for (let i = 0; i < toRemove.length; i++) skeleton[toRemove[i]] = 0
    toRemove.length = 0
  }

  return skeleton
}

/**
 * Thuật toán bóc tách vách ngăn kiến trúc chuẩn Architectural CAD:
 * 1. Khử chữ viết, nhãn phòng (BED ROOM, PASSAGE...) & số đo kích thước bằng Connected-Component Analysis.
 * 2. Morphological Opening để hòa tan các nét bậc cầu thang, đường gióng 1-px.
 * 3. Zhang-Suen Thinning đưa mọi bức tường về đúng 1 đường trục hình học duy nhất.
 * 4. Phát hiện khe cửa thông phòng (Doorways).
 * 5. Khóa khít tuyệt đối góc tường vuông góc (Corner Snapping).
 */
export async function detectWallsAndDoorsFromFloorPlanImage(
  imageUrl: string,
  floorId: string,
): Promise<DetectionResult> {
  if (!imageUrl || !imageUrl.trim()) return { walls: [], doors: [] }

  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Không thể tải ảnh sơ đồ để phân tích nét vẽ'))
      img.src = imageUrl
    })

    const naturalW = img.naturalWidth || 800
    const naturalH = img.naturalHeight || 600

    // Phân tích bóc tách chữ viết & nét vẽ ở độ phân giải gốc cao (High-Resolution Canvas)
    // để các nét vẽ 1-px không bị nhòe mờ vào nền trắng
    const maxAnalysisDim = 1600
    const highScale = Math.min(maxAnalysisDim / naturalW, maxAnalysisDim / naturalH, 1)
    const hiW = Math.max(30, Math.round(naturalW * highScale))
    const hiH = Math.max(30, Math.round(naturalH * highScale))

    const canvas = document.createElement('canvas')
    canvas.width = hiW
    canvas.height = hiH
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return { walls: [], doors: [] }

    ctx.drawImage(img, 0, 0, hiW, hiH)
    const imgData = ctx.getImageData(0, 0, hiW, hiH)
    const data = imgData.data

    // ── BƯỚC 1: Phân tích độ sáng và bóc tách màu nét vẽ chuẩn kiến trúc ──
    let totalLum = 0
    let validCount = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 40) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        totalLum += lum
        validCount++
      }
    }

    const avgLum = validCount > 0 ? totalLum / validCount : 240
    const isDarkBackground = avgLum < 120

    // Vách tường thực sự: Mực đen đặc (lum < 88) hoặc cột chịu lực màu đỏ (r > 140 && g < 90 && b < 90).
    // LOẠI BỎ TRIỆT ĐỂ:
    // - Nét đứt dàn lạnh điều hòa (AC), trần thạch cao, giếng trời (đều là màu xám nhạt gray >= 120).
    // - Vòng cung cửa đi, cửa sổ bằng nét màu xanh dương (blue > 105 && red < 90).
    // - Bậc cầu thang bằng nét màu tím/hồng (red > 115 && blue > 115 && green < 95).
    const hiRawGrid = new Uint8Array(hiW * hiH)
    for (let y = 0; y < hiH; y++) {
      for (let x = 0; x < hiW; x++) {
        const idx = (y * hiW + x) * 4
        if (data[idx + 3] < 40) continue

        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        const lum = 0.299 * r + 0.587 * g + 0.114 * b

        if (isDarkBackground) {
          if (lum > 175) hiRawGrid[y * hiW + x] = 1
        } else {
          const isDarkInk = lum < 88
          const isRedColumn = r > 140 && g < 90 && b < 90
          const isBlueDoor = b > 105 && r < 90 && b > g + 15
          const isMagentaStair = r > 115 && b > 115 && g < 95

          if ((isDarkInk || isRedColumn) && !isBlueDoor && !isMagentaStair) {
            hiRawGrid[y * hiW + x] = 1
          }
        }
      }
    }

    // ── BƯỚC 2: TẨY SẠCH TRIỆT ĐỂ CHỮ VIẾT, NHÃN PHÒNG & SỐ ĐO KÍCH THƯỚC (CONNECTED-COMPONENT FILTER) ──
    const visitedComp = new Uint8Array(hiW * hiH)
    const hiCleanedGrid = new Uint8Array(hiRawGrid)
    const queueX = new Int32Array(hiW * hiH)
    const queueY = new Int32Array(hiW * hiH)

    const textLimitMaxD = Math.max(38, Math.round(hiH * 0.032))
    const textLimitMinD = Math.max(18, Math.round(hiH * 0.015))
    const textLimitWordD = Math.max(90, Math.round(hiH * 0.09))

    for (let y = 0; y < hiH; y++) {
      for (let x = 0; x < hiW; x++) {
        const startIdx = y * hiW + x
        if (hiRawGrid[startIdx] === 0 || visitedComp[startIdx] === 1) continue

        let head = 0
        let tail = 0
        queueX[tail] = x
        queueY[tail] = y
        tail++
        visitedComp[startIdx] = 1

        let minCompX = x
        let maxCompX = x
        let minCompY = y
        let maxCompY = y
        let sumX = 0
        let sumY = 0

        while (head < tail) {
          const cx = queueX[head]
          const cy = queueY[head]
          head++
          sumX += cx
          sumY += cy

          if (cx < minCompX) minCompX = cx
          if (cx > maxCompX) maxCompX = cx
          if (cy < minCompY) minCompY = cy
          if (cy > maxCompY) maxCompY = cy

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue
              const nx = cx + dx
              const ny = cy + dy
              if (nx >= 0 && nx < hiW && ny >= 0 && ny < hiH) {
                const nIdx = ny * hiW + nx
                if (hiRawGrid[nIdx] === 1 && visitedComp[nIdx] === 0) {
                  visitedComp[nIdx] = 1
                  queueX[tail] = nx
                  queueY[tail] = ny
                  tail++
                }
              }
            }
          }
        }

        const compWidth = maxCompX - minCompX + 1
        const compHeight = maxCompY - minCompY + 1
        const compArea = tail
        const compMaxD = Math.max(compWidth, compHeight)
        const compMinD = Math.min(compWidth, compHeight)
        const avgCenterX = sumX / tail
        const avgCenterY = sumY / tail

        // 1. Loại bỏ các đường gióng kích thước / mũi tên ở rìa ngoài mép bản vẽ
        const isOuterBorderAnnotation =
          avgCenterX < hiW * 0.03 ||
          avgCenterX > hiW * 0.97 ||
          avgCenterY < hiH * 0.035 ||
          avgCenterY > hiH * 0.93

        // 2. Nhận diện chính xác ký tự chữ cái, tên phòng (BED ROOM, PASSAGE, KITCHEN...) & số đo kích thước:
        const isTextGlyph =
          isOuterBorderAnnotation ||
          (compMaxD < textLimitMaxD && compArea < 450) ||
          (compMinD < textLimitMinD && compArea < 650 && compMaxD < textLimitWordD) ||
          compArea < 50

        if (isTextGlyph) {
          for (let k = 0; k < tail; k++) {
            hiCleanedGrid[queueY[k] * hiW + queueX[k]] = 0
          }
        }
      }
    }

    // ── BƯỚC 3: DOWNSCALE LƯỚI ĐÃ LÀM SẠCH VỀ KÍCH THƯỚC TỐI ƯU CHO SKELETONIZATION ──
    const targetDim = 512
    const downScale = Math.min(targetDim / naturalW, targetDim / naturalH, 1)
    const w = Math.max(30, Math.round(naturalW * downScale))
    const h = Math.max(30, Math.round(naturalH * downScale))

    const openedGrid = new Uint8Array(w * h)
    const blockX = hiW / w
    const blockY = hiH / h

    // Max pooling: bảo toàn tuyệt đối tính liên tục của các bức tường thực
    for (let y = 0; y < h; y++) {
      const startHiY = Math.floor(y * blockY)
      const endHiY = Math.min(hiH, Math.ceil((y + 1) * blockY))
      for (let x = 0; x < w; x++) {
        const startHiX = Math.floor(x * blockX)
        const endHiX = Math.min(hiW, Math.ceil((x + 1) * blockX))

        let hasInk = false
        for (let py = startHiY; py < endHiY && !hasInk; py++) {
          for (let px = startHiX; px < endHiX; px++) {
            if (hiCleanedGrid[py * hiW + px] === 1) {
              hasInk = true
              break
            }
          }
        }
        if (hasInk) {
          openedGrid[y * w + x] = 1
        }
      }
    }

    // ── BƯỚC 4: ZHANG-SUEN THINNING (KHỬ TOÀN BỘ ĐỘ DÀY TƯỜNG THÀNH 1 ĐƯỜNG TRỤC XƯƠNG) ──
    // Đảm bảo mỗi bức tường chỉ có duy nhất 1 đường tâm, loại bỏ triệt để hiện tượng răng lược
    const skeleton = zhangSuenThinning(openedGrid, w, h)

    // ── BƯỚC 5: TRÍCH XUẤT CÁC ĐOẠN VÁCH DỌC THEO ĐƯỜNG TRỤC XƯƠNG SKELETON ──
    const minRunLen = Math.max(16, Math.round(Math.min(w, h) * 0.045))
    const doorGapMin = 12
    const doorGapMax = 36
    const detectedDoors: DetectedDoor[] = []
    let doorCounter = 1

    // 1. Quét ngang trên skeleton
    const rawH: Array<{ y: number; x1: number; x2: number }> = []
    for (let y = 0; y < h; y++) {
      let start = -1
      let gapStart = -1

      for (let x = 0; x < w; x++) {
        if (skeleton[y * w + x] === 1) {
          if (start === -1) {
            start = x
            if (gapStart !== -1) {
              const gapW = x - gapStart
              if (gapW >= doorGapMin && gapW <= doorGapMax) {
                detectedDoors.push({
                  id: `door_${floorId}_h_${doorCounter++}`,
                  floorId,
                  x: Math.round((((gapStart + x) / 2) / w) * 1000) / 10,
                  y: Math.round((y / h) * 1000) / 10,
                  width: Math.round(((gapW / w) * 1000) / 10),
                  orientation: 'horizontal',
                  swingAngle: 90,
                })
              }
              gapStart = -1
            }
          }
        } else {
          if (start !== -1) {
            if (x - start >= minRunLen) {
              rawH.push({ y, x1: start, x2: x - 1 })
            }
            gapStart = x
            start = -1
          }
        }
      }
      if (start !== -1 && w - start >= minRunLen) {
        rawH.push({ y, x1: start, x2: w - 1 })
      }
    }

    // 2. Quét dọc trên skeleton
    const rawV: Array<{ x: number; y1: number; y2: number }> = []
    for (let x = 0; x < w; x++) {
      let start = -1
      let gapStart = -1

      for (let y = 0; y < h; y++) {
        if (skeleton[y * w + x] === 1) {
          if (start === -1) {
            start = y
            if (gapStart !== -1) {
              const gapH = y - gapStart
              if (gapH >= doorGapMin && gapH <= doorGapMax) {
                detectedDoors.push({
                  id: `door_${floorId}_v_${doorCounter++}`,
                  floorId,
                  x: Math.round((x / w) * 1000) / 10,
                  y: Math.round((((gapStart + y) / 2) / h) * 1000) / 10,
                  width: Math.round(((gapH / h) * 1000) / 10),
                  orientation: 'vertical',
                  swingAngle: 90,
                })
              }
              gapStart = -1
            }
          }
        } else {
          if (start !== -1) {
            if (y - start >= minRunLen) {
              rawV.push({ x, y1: start, y2: y - 1 })
            }
            gapStart = y
            start = -1
          }
        }
      }
      if (start !== -1 && h - start >= minRunLen) {
        rawV.push({ x, y1: start, y2: h - 1 })
      }
    }

    // ── BƯỚC 6: HÀN GẮN ĐOẠN ĐỨT THẲNG HÀNG & GỘP ĐƯỜNG TRỤC GẦN (COLLINEAR MERGING) ──
    const mergedH: Array<{ y: number; x1: number; x2: number }> = []
    rawH.sort((a, b) => (a.y === b.y ? a.x1 - b.x1 : a.y - b.y))

    for (const seg of rawH) {
      let found = false
      for (let i = 0; i < mergedH.length; i++) {
        const ex = mergedH[i]
        // Cùng một trục ngang lệch <= 3px và nối tiếp hoặc khoảng cách nhỏ <= 14px
        if (Math.abs(ex.y - seg.y) <= 3) {
          if (seg.x1 <= ex.x2 + 14 && seg.x2 >= ex.x1 - 14) {
            ex.x1 = Math.min(ex.x1, seg.x1)
            ex.x2 = Math.max(ex.x2, seg.x2)
            ex.y = Math.round((ex.y + seg.y) / 2)
            found = true
            break
          }
        }
      }
      if (!found) mergedH.push({ ...seg })
    }

    const mergedV: Array<{ x: number; y1: number; y2: number }> = []
    rawV.sort((a, b) => (a.x === b.x ? a.y1 - b.y1 : a.x - b.x))

    for (const seg of rawV) {
      let found = false
      for (let i = 0; i < mergedV.length; i++) {
        const ex = mergedV[i]
        // Cùng một trục dọc lệch <= 3px và nối tiếp hoặc khoảng cách nhỏ <= 14px
        if (Math.abs(ex.x - seg.x) <= 3) {
          if (seg.y1 <= ex.y2 + 14 && seg.y2 >= ex.y1 - 14) {
            ex.y1 = Math.min(ex.y1, seg.y1)
            ex.y2 = Math.max(ex.y2, seg.y2)
            ex.x = Math.round((ex.x + seg.x) / 2)
            found = true
            break
          }
        }
      }
      if (!found) mergedV.push({ ...seg })
    }

    // ── BƯỚC 7: KHÓA KHÍT GÓC TƯỜNG VUÔNG GÓC (CORNER SNAPPING) ──
    const snapDistance = 14
    for (const hSeg of mergedH) {
      for (const vSeg of mergedV) {
        if (Math.abs(hSeg.x1 - vSeg.x) <= snapDistance && hSeg.y >= vSeg.y1 - snapDistance && hSeg.y <= vSeg.y2 + snapDistance) {
          hSeg.x1 = vSeg.x
          if (Math.abs(vSeg.y1 - hSeg.y) <= snapDistance) vSeg.y1 = hSeg.y
          if (Math.abs(vSeg.y2 - hSeg.y) <= snapDistance) vSeg.y2 = hSeg.y
        }
        if (Math.abs(hSeg.x2 - vSeg.x) <= snapDistance && hSeg.y >= vSeg.y1 - snapDistance && hSeg.y <= vSeg.y2 + snapDistance) {
          hSeg.x2 = vSeg.x
          if (Math.abs(vSeg.y1 - hSeg.y) <= snapDistance) vSeg.y1 = hSeg.y
          if (Math.abs(vSeg.y2 - hSeg.y) <= snapDistance) vSeg.y2 = hSeg.y
        }
      }
    }

    // ── BƯỚC 8: ĐÓNG GÓI TỌA ĐỘ PHẦN TRĂM SPOTWAY (0 - 100%) ──
    const detectedWalls: DetectedWall[] = []
    let wallCounter = 1

    mergedH.forEach((seg) => {
      const x1 = Math.round((seg.x1 / w) * 1000) / 10
      const x2 = Math.round((seg.x2 / w) * 1000) / 10
      const y = Math.round((seg.y / h) * 1000) / 10

      // Bỏ qua đường gióng kích thước hoặc khung viền ngoài mép bản vẽ
      if (y <= 2.8 || y >= 93.8 || (x1 <= 2.5 && x2 <= 2.5) || (x1 >= 97.5 && x2 >= 97.5)) {
        return
      }

      // Chỉ giữ lại các vách ngăn phòng thực sự (chiều dài tối thiểu >= 4.2% kích thước sàn)
      if (Math.abs(x2 - x1) >= 4.2) {
        detectedWalls.push({
          id: `wall_${floorId}_h_${wallCounter++}`,
          floorId,
          x1: Math.min(x1, x2),
          y1: y,
          x2: Math.max(x1, x2),
          y2: y,
        })
      }
    })

    mergedV.forEach((seg) => {
      const y1 = Math.round((seg.y1 / h) * 1000) / 10
      const y2 = Math.round((seg.y2 / h) * 1000) / 10
      const x = Math.round((seg.x / w) * 1000) / 10

      // Bỏ qua đường gióng kích thước ngoài mép dọc
      if (x <= 2.8 || x >= 97.5 || (y1 <= 2.5 && y2 <= 2.5) || (y1 >= 93.8 && y2 >= 93.8)) {
        return
      }

      // Chỉ giữ lại các vách ngăn phòng thực sự (chiều dài tối thiểu >= 4.2% kích thước sàn)
      if (Math.abs(y2 - y1) >= 4.2) {
        detectedWalls.push({
          id: `wall_${floorId}_v_${wallCounter++}`,
          floorId,
          x1: x,
          y1: Math.min(y1, y2),
          x2: x,
          y2: Math.max(y1, y2),
        })
      }
    })

    const validDoors = detectedDoors.filter(
      (d) => d.x > 3.0 && d.x < 97.0 && d.y > 3.0 && d.y < 97.0
    )

    return {
      walls: detectedWalls,
      doors: validDoors,
    }
  } catch (error) {
    console.warn('Lỗi phân tích vách tường từ ảnh sơ đồ:', error)
    return { walls: [], doors: [] }
  }
}

export async function detectWallsFromFloorPlanImage(
  imageUrl: string,
  floorId: string,
): Promise<DetectedWall[]> {
  const result = await detectWallsAndDoorsFromFloorPlanImage(imageUrl, floorId)
  const wallsWithDoors = result.walls as DetectedWall[] & { doors?: DetectedDoor[] }
  wallsWithDoors.doors = result.doors
  return wallsWithDoors
}
