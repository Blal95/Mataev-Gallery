// eslint-config-next 16 ships native flat-config subpath exports.
import coreWebVitals from "eslint-config-next/core-web-vitals"
import typescript from "eslint-config-next/typescript"

const config = [
  { ignores: [".open-next/**", ".next/**", ".wrangler/**", "cloudflare-env.d.ts"] },
  ...coreWebVitals,
  ...typescript,
]
export default config
