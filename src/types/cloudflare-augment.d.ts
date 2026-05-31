export {}
declare global {
  interface CloudflareEnv {
    SESSION_SECRET: string
    ADMIN_ENROLL_CODE: string
  }
}
