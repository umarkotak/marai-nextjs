import { isJWE } from "./lib/jweVerify"
import { NextResponse } from "next/server"

export async function middleware(request) {
  const pathname = request.nextUrl.pathname
  const token = request.cookies.get('MAIAT')?.value || ''
  const isValidToken = isJWE(token)
  const PROTECTED_PATHS = ['/dashboard', '/tasks', '/server_info']

  const isProtected = PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // tidak bisa akses page '/login' jika setelah login
  if (isValidToken && ['/login'].includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // bisa akses page 'protected paths' jika belum login
  if (!isValidToken && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
