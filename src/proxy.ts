import { NextResponse, type NextRequest } from "next/server"

export async function proxy(req: NextRequest) {
  const isAdminPage = req.nextUrl.pathname === "/admin"
  if (!isAdminPage) return NextResponse.next()
  // Page itself renders login when unauthenticated; middleware only enforces
  // origin for mutations (handled in route handlers). Allow through.
  return NextResponse.next()
}

export const config = { matcher: ["/admin", "/api/admin/:path*"] }
