import { describe, it, expect } from "vitest"
import { computeRows, type Sized } from "./justified"

const items: Sized[] = [
  { id: "a", aspect: 1.5 }, { id: "b", aspect: 0.66 },
  { id: "c", aspect: 1.0 }, { id: "d", aspect: 1.78 },
  { id: "e", aspect: 1.2 },
]

describe("computeRows", () => {
  it("fills rows to ~container width and never exceeds it", () => {
    const rows = computeRows(items, { containerWidth: 1000, targetHeight: 240, gap: 12 })
    for (const row of rows.slice(0, -1)) {
      const total = row.boxes.reduce((s, b) => s + b.width, 0) + (row.boxes.length - 1) * 12
      expect(Math.abs(total - 1000)).toBeLessThan(2)
    }
  })
  it("preserves each box aspect ratio (no crop)", () => {
    const rows = computeRows(items, { containerWidth: 1000, targetHeight: 240, gap: 12 })
    for (const row of rows) for (const b of row.boxes) {
      expect(b.width / b.height).toBeCloseTo(b.aspect, 1)
    }
  })
  it("keeps the last row at natural (target) height, left-aligned", () => {
    const rows = computeRows(items, { containerWidth: 1000, targetHeight: 240, gap: 12 })
    const last = rows[rows.length - 1]
    expect(last.boxes.every((b) => Math.abs(b.height - 240) < 1 || rows.length === 1)).toBe(true)
  })
  it("returns [] for no items", () => expect(computeRows([], { containerWidth: 800, targetHeight: 200, gap: 8 })).toEqual([]))
})
