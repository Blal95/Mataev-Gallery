export interface Sized { id: string; aspect: number }
export interface Box extends Sized { width: number; height: number }
export interface Row { boxes: Box[] }
export interface LayoutOpts { containerWidth: number; targetHeight: number; gap: number }

/**
 * Flickr-style justified rows. Greedily fill a row at targetHeight until the
 * summed widths exceed the container, then scale that row's height down so the
 * boxes (minus gaps) fit edge-to-edge. Aspect ratios are preserved (no crop).
 * The final, unfilled row is left at targetHeight.
 */
export function computeRows(items: Sized[], opts: LayoutOpts): Row[] {
  const { containerWidth, targetHeight, gap } = opts
  if (items.length === 0 || containerWidth <= 0) return []
  const rows: Row[] = []
  let current: Sized[] = []

  const widthAt = (it: Sized, h: number) => it.aspect * h

  const flush = (isLast: boolean) => {
    if (current.length === 0) return
    const totalGap = (current.length - 1) * gap
    const naturalWidth = current.reduce((s, it) => s + widthAt(it, targetHeight), 0)
    const avail = containerWidth - totalGap
    const height = isLast ? targetHeight : (avail / naturalWidth) * targetHeight
    const boxes: Box[] = current.map((it) => ({
      ...it,
      height,
      width: widthAt(it, height),
    }))
    rows.push({ boxes })
    current = []
  }

  for (const it of items) {
    current.push(it)
    const totalGap = (current.length - 1) * gap
    const rowWidth = current.reduce((s, x) => s + widthAt(x, targetHeight), 0) + totalGap
    if (rowWidth >= containerWidth) flush(false)
  }
  flush(true)
  return rows
}
