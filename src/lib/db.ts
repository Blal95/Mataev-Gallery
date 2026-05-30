import { cf } from "./env"
import type { SqlDb } from "./sqldb"

export function db(): SqlDb {
  return cf().DB as unknown as SqlDb
}
