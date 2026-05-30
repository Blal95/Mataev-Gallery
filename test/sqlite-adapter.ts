import Database from "better-sqlite3"
import { readFileSync } from "fs"
import { resolve } from "path"

export type { SqlStatement, SqlDb } from "@/lib/sqldb"
import type { SqlStatement, SqlDb } from "@/lib/sqldb"

class BetterStmt implements SqlStatement {
  constructor(private db: Database.Database, private sql: string, private params: unknown[] = []) {}
  bind(...values: unknown[]): SqlStatement {
    return new BetterStmt(this.db, this.sql, values)
  }
  async all<T>() {
    const stmt = this.db.prepare(this.sql)
    return { results: stmt.all(...(this.params as never[])) as T[] }
  }
  async first<T>() {
    const stmt = this.db.prepare(this.sql)
    return (stmt.get(...(this.params as never[])) as T) ?? null
  }
  async run() {
    this.db.prepare(this.sql).run(...(this.params as never[]))
    return { success: true as const }
  }
}

export function makeTestDb(): SqlDb {
  const db = new Database(":memory:")
  db.pragma("foreign_keys = ON")
  const sql = readFileSync(resolve(__dirname, "../migrations/0001_init.sql"), "utf8")
  db.exec(sql)
  return { prepare: (s: string) => new BetterStmt(db, s) }
}
