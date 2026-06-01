import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";
const ACCESS_TOKEN_MAX_AGE_SECONDS = 30 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  try {
    // Note: this endpoint runs on the server and will have access to the
    // cookies forwarded by the browser. Use the refresh_token cookie to
    // request a new session from the backend and set new cookies for the client.
    return await proxyRefresh(request);
  } catch {
    return NextResponse.json({ message: "Refresh failed" }, { status: 401 });
  }
}

async function proxyRefresh(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: "Refresh token missing" }, { status: 401 });
  }

  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      Cookie: `${REFRESH_TOKEN_COOKIE}=${encodeURIComponent(refreshToken)}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ message: "Refresh failed" }, { status: 401 });
  }

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
  };

  if (!payload.access_token) {
    return NextResponse.json({ message: "Invalid refresh payload" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_TOKEN_COOKIE, payload.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
  if (payload.refresh_token) {
    res.cookies.set(REFRESH_TOKEN_COOKIE, payload.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    });
  }

  return res;
}
