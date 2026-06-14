export {}
declare global {
  interface CloudflareEnv {
    SESSION_SECRET: string
    ADMIN_ENROLL_CODE: string
    // R2 S3 credentials for presigned direct-to-R2 uploads. Optional: when
    // unset, uploads fall back to streaming the original through the Worker.
    R2_ACCOUNT_ID?: string
    R2_ACCESS_KEY_ID?: string
    R2_SECRET_ACCESS_KEY?: string
  }
}
