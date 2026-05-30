export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement
  all<T = unknown>(): Promise<{ results: T[] }>
  first<T = unknown>(): Promise<T | null>
  run(): Promise<{ success: true }>
}
export interface SqlDb { prepare(sql: string): SqlStatement }
