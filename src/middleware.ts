import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/jwt";
import { roleAtLeast } from "@/lib/rbac";

const COOKIE = process.env.AUTH_COOKIE_NAME ?? "nm_session";

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/terms",
  "/privacy",
]);
const PUBLIC_PREFIXES = [
  "/api/auth/",
  "/_next/",
  "/favicon",
  "/robots",
  "/sitemap",
  "/icon",
  "/apple-icon",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Static & public passthrough
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const session = await verifySession(token);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    const res = NextResponse.redirect(url);
    res.cookies.delete(COOKIE);
    return res;
  }

  // Admin-area guard
  if (pathname.startsWith("/admin")) {
    if (!roleAtLeast(session.role, "REVIEWER")) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
