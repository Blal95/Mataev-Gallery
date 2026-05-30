export {}
declare global {
  interface CloudflareEnv {
    SESSION_SECRET: string
    ADMIN_ENROLL_CODE: string
    NEXT_PUBLIC_MAPTILER_KEY?: string
  }
}
