import type { SqlDb } from "@/lib/sqldb"
import { newId } from "@/lib/ids"

export interface CommentRow {
  id: string
  photo_id: string
  author: string
  body: string
  created_at: number
}

export interface CommentDTO {
  id: string
  author: string
  body: string
  createdAt: number
}

export function rowToComment(row: CommentRow): CommentDTO {
  return { id: row.id, author: row.author, body: row.body, createdAt: row.created_at }
}

export async function listComments(db: SqlDb, photoId: string): Promise<CommentDTO[]> {
  const { results } = await db
    .prepare(
      `SELECT id, photo_id, author, body, created_at FROM comments
       WHERE photo_id = ? ORDER BY created_at ASC`,
    )
    .bind(photoId)
    .all<CommentRow>()
  return results.map(rowToComment)
}

export async function insertComment(
  db: SqlDb,
  photoId: string,
  author: string,
  body: string,
  ipHash: string,
): Promise<CommentDTO> {
  const id = newId()
  const created_at = Date.now()
  await db
    .prepare("INSERT INTO comments (id, photo_id, author, body, created_at, ip_hash) VALUES (?,?,?,?,?,?)")
    .bind(id, photoId, author, body, created_at, ipHash)
    .run()
  return { id, author, body, createdAt: created_at }
}

/** Max comments from one IP in the rolling window (spam guard). */
export async function countRecentByIp(db: SqlDb, ipHash: string, sinceMs: number): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM comments WHERE ip_hash = ? AND created_at > ?")
    .bind(ipHash, sinceMs)
    .first<{ n: number }>()
  return row?.n ?? 0
}
