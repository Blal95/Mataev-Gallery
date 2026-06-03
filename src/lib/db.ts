import { cf } from "./env"
import type { SqlDb } from "./sqldb"

export async function db(): Promise<SqlDb> {
  return (await cf()).DB as unknown as SqlDb
}
