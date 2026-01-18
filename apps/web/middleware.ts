import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Internationalization middleware configuration
const intlMiddleware = createIntlMiddleware(routing);

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/callback",
  "/auth/logout",
  "/auth/error",
  "/public",
];

// API and static paths to skip entirely
const SKIP_PATHS = [
  "/api",
  "/_next",
  "/_vercel",
  "/favicon.ico",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
];

/**
 * Check if the path should skip middleware entirely
 */
function shouldSkipMiddleware(pathname: string): boolean {
  return (
    SKIP_PATHS.some((path) => pathname.startsWith(path)) ||
    pathname.includes(".") // Static files
  );
}

/**
 * Check if the path is public (no authentication required)
 */
function isPublicPath(pathname: string): boolean {
  // Remove locale prefix if present
  const pathWithoutLocale = pathname.replace(/^\/(vi|en)/, "") || "/";
  return PUBLIC_PATHS.some((path) => pathWithoutLocale.startsWith(path));
}

/**
 * Check if the request has a valid auth token
 * Note: This is a basic check. Full validation happens on the server.
 */
function hasAuthToken(request: NextRequest): boolean {
  // Check for access token in cookies or local storage is not available in middleware
  // We rely on a session cookie that is set by the auth callback
  const sessionCookie = request.cookies.get("physioflow_session");
  return !!sessionCookie?.value;
}

/**
 * Get the login URL with redirect
 */
function getLoginUrl(request: NextRequest, locale: string): string {
  const redirectPath = request.nextUrl.pathname + request.nextUrl.search;
  const loginUrl = new URL(`/${locale}/auth/login`, request.url);
  loginUrl.searchParams.set("redirect", redirectPath);
  return loginUrl.toString();
}

/**
 * Main middleware function
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes and static files
  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next();
  }

  // Apply internationalization middleware first
  const intlResponse = intlMiddleware(request);

  // If intl middleware returned a redirect, return it
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  // Check if the path is public
  if (isPublicPath(pathname)) {
    return intlResponse;
  }

  // For protected routes, check authentication
  // Note: Since localStorage is not available in middleware, we use a session cookie
  // The client-side auth context handles the actual token management
  const hasSession = hasAuthToken(request);

  if (!hasSession) {
    // Get the locale from the pathname or use default
    const localeMatch = pathname.match(/^\/(vi|en)/);
    const locale = localeMatch?.[1] ?? "vi";

    // Redirect to login
    return NextResponse.redirect(getLoginUrl(request, locale));
  }

  return intlResponse;
}

export const config = {
  // Match all pathnames except for specific patterns
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
