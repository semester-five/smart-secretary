import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_PREFIXES = ["/auth"];
const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";
const API_URL = process.env.API_URL ?? "http://localhost:8000";

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Pad base64url to standard base64 and decode as UTF-8
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const binary = atob(padded);
    // Decode as UTF-8 to handle any Unicode characters in the payload
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

const CLOCK_SKEW_MS = 60_000; // 60-second grace period for clock skew

function isTokenValid(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  return payload.exp * 1000 > Date.now() - CLOCK_SKEW_MS;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthPage = AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const authenticated = accessToken ? isTokenValid(accessToken) : false;
  const canRefreshSession = Boolean(refreshToken);

  if (isProtected && !authenticated && !canRefreshSession) {
    const loginUrl = new URL("/auth/v1/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isProtected && !authenticated && refreshToken) {
    return refreshSessionAndContinue(request, refreshToken);
  }

  if (isAuthPage && authenticated) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

async function refreshSessionAndContinue(request: NextRequest, refreshToken: string) {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: `refresh_token=${encodeURIComponent(refreshToken)}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const loginUrl = new URL("/auth/v1/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const payload = (await response.json()) as { access_token?: string; refresh_token?: string };
    if (!payload.access_token || !payload.refresh_token) {
      const loginUrl = new URL("/auth/v1/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const nextResponse = NextResponse.next();
    nextResponse.cookies.set(ACCESS_TOKEN_COOKIE, payload.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 60,
    });
    nextResponse.cookies.set(REFRESH_TOKEN_COOKIE, payload.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return nextResponse;
  } catch {
    const loginUrl = new URL("/auth/v1/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"],
};
