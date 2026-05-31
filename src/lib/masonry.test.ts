import { describe, it, expect } from "vitest"
import { computeColumns, columnsForWidth } from "./masonry"

const items = (aspects: number[]) =>
  aspects.map((aspect, i) => ({ id: `p${i}`, aspect }))

describe("computeColumns", () => {
  it("returns empty for no items or zero width", () => {
    expect(computeColumns([], { containerWidth: 800, columns: 3, gap: 10 })).toEqual([])
    expect(computeColumns(items([1]), { containerWidth: 0, columns: 3, gap: 10 })).toEqual([])
  })

  it("gives every box the same column width", () => {
    const cols = computeColumns(items([1, 1.5, 0.7, 2]), { containerWidth: 612, columns: 3, gap: 6 })
    const widths = cols.flatMap((c) => c.boxes.map((b) => b.width))
    // (612 - 2*6) / 3 = 200
    for (const w of widths) expect(w).toBeCloseTo(200)
  })

  it("preserves aspect ratio (no crop)", () => {
    const cols = computeColumns(items([1.5]), { containerWidth: 300, columns: 1, gap: 0 })
    const box = cols[0].boxes[0]
    expect(box.width / box.height).toBeCloseTo(1.5)
  })

  it("places items in the shortest column to balance heights", () => {
    // two tall portraits then two wide landscapes across 2 columns
    const cols = computeColumns(items([0.5, 0.5, 2, 2]), { containerWidth: 210, columns: 2, gap: 10 })
    expect(cols).toHaveLength(2)
    // each column should receive 2 items (balanced)
    expect(cols[0].boxes).toHaveLength(2)
    expect(cols[1].boxes).toHaveLength(2)
  })

  it("keeps all items", () => {
    const cols = computeColumns(items([1, 1, 1, 1, 1, 1, 1]), { containerWidth: 800, columns: 4, gap: 12 })
    const count = cols.reduce((s, c) => s + c.boxes.length, 0)
    expect(count).toBe(7)
  })

  it("treats non-positive aspect as square", () => {
    const cols = computeColumns(items([0]), { containerWidth: 200, columns: 1, gap: 0 })
    expect(cols[0].boxes[0].height).toBeCloseTo(200)
  })
})

describe("columnsForWidth", () => {
  it("scales column count with viewport", () => {
    expect(columnsForWidth(375)).toBe(2)
    expect(columnsForWidth(800)).toBe(3)
    expect(columnsForWidth(1280)).toBe(4)
    expect(columnsForWidth(1920)).toBe(5)
  })
})
