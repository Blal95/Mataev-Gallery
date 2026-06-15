export interface MasonryItem { id: string; aspect: number }
export interface MasonryBox extends MasonryItem { width: number; height: number }
export interface MasonryColumn { boxes: MasonryBox[] }
export interface MasonryOpts { containerWidth: number; columns: number; gap: number }

/**
 * Balanced masonry (VSCO-style). Every photo keeps its full aspect ratio — no
 * crop — so size variety comes naturally from portrait vs landscape. Columns
 * share a fixed width; each item is placed in the currently-shortest column so
 * column heights stay balanced while global order is roughly preserved.
 */
export function computeColumns(items: MasonryItem[], opts: MasonryOpts): MasonryColumn[] {
  const { containerWidth, columns, gap } = opts
  if (items.length === 0 || containerWidth <= 0 || columns < 1) return []

  const colWidth = (containerWidth - gap * (columns - 1)) / columns
  const cols: MasonryColumn[] = Array.from({ length: columns }, () => ({ boxes: [] }))
  const heights = new Array(columns).fill(0)

  for (const it of items) {
    const aspect = it.aspect > 0 ? it.aspect : 1
    const height = colWidth / aspect

    let min = 0
    for (let i = 1; i < columns; i++) if (heights[i] < heights[min]) min = i

    cols[min].boxes.push({ ...it, width: colWidth, height })
    heights[min] += height + gap
  }

  return cols
}

/** Responsive column count tuned for a photo gallery. */
export function columnsForWidth(w: number): number {
  if (w < 640) return 1   // single column on mobile — full-width photos, no bleed
  if (w < 1024) return 3
  if (w < 1440) return 4
  return 5
}
