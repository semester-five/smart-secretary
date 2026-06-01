/**
 * /api/client/[...path] — Client-side API proxy route.
 *
 * Relays browser requests to the backend API, automatically
 * attaching the access_token from HttpOnly cookies (which the
 * browser cannot read directly).
 *
 * This enables React Query to work in client components without
 * exposing the token to JavaScript or duplicating auth logic.
 *
 * Usage: fetch("/api/client/meetings/:id/status") → GET /api/v1/meetings/:id/status
 */
import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";
const ACCESS_TOKEN_MAX_AGE_SECONDS = 30 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

// Map /api/client/meetings/:id/status to /api/v1/meetings/:id/status.
const BACKEND_PATH_PREFIX = "/api/v1";

function buildBackendUrl(proxyPath: string): string {
  // proxyPath is the portion after /api/client, e.g. /meetings/abc/status
  return `${API_URL}${BACKEND_PATH_PREFIX}${proxyPath}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
};

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      Cookie: `${REFRESH_TOKEN_COOKIE}=${encodeURIComponent(refreshToken)}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as TokenResponse | null;
  if (!payload?.access_token) return null;
  return payload;
}

function setAuthCookies(response: NextResponse, tokenResponse: TokenResponse): void {
  if (!tokenResponse.access_token) return;

  response.cookies.set(ACCESS_TOKEN_COOKIE, tokenResponse.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });

  if (tokenResponse.refresh_token) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokenResponse.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    });
  }
}

async function toNextResponse(response: Response): Promise<NextResponse> {
  const responseBody = await response.arrayBuffer();

  const responseHeaders = new Headers();
  const contentType = response.headers.get("Content-Type");
  const contentDisposition = response.headers.get("Content-Disposition");
  if (contentType) {
    responseHeaders.set("Content-Type", contentType);
  }
  if (contentDisposition) {
    responseHeaders.set("Content-Disposition", contentDisposition);
  }

  return new NextResponse(responseBody.byteLength > 0 ? responseBody : null, {
    status: response.status,
    headers: responseHeaders,
  });
}

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await params;
  const proxyPath = `/${path.join("/")}`;

  // Preserve query string from the incoming request
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const backendUrl = buildBackendUrl(proxyPath) + (queryString ? `?${queryString}` : "");

  // Forward the access token from the HttpOnly cookie
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  // Forward request body for mutations
  const isBodyMethod = ["POST", "PATCH", "PUT", "DELETE"].includes(request.method);
  let body: BodyInit | undefined;
  const headers: Record<string, string> = {};

  if (isBodyMethod) {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      // Forward FormData as-is (file uploads)
      body = await request.formData();
    } else {
      // Forward JSON body
      const text = await request.text();
      if (text) {
        body = text;
        headers["Content-Type"] = "application/json";
      }
    }
  }

  const fetchBackend = (token: string | undefined) => {
    const backendHeaders = { ...headers };
    if (token) {
      backendHeaders.Authorization = `Bearer ${token}`;
    }

    return fetch(backendUrl, {
      method: request.method,
      headers: backendHeaders,
      body,
      cache: "no-store",
    });
  };

  try {
    const response = await fetchBackend(accessToken);

    if (response.status !== 401) {
      return toNextResponse(response);
    }

    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    if (!refreshToken) {
      return toNextResponse(response);
    }

    const tokenResponse = await refreshAccessToken(refreshToken);
    if (!tokenResponse?.access_token) {
      return toNextResponse(response);
    }

    const retryResponse = await fetchBackend(tokenResponse.access_token);
    const nextResponse = await toNextResponse(retryResponse);
    setAuthCookies(nextResponse, tokenResponse);
    return nextResponse;
  } catch (error) {
    console.error("[api/client proxy] Failed to reach backend:", error);
    return NextResponse.json({ detail: "Failed to connect to backend service." }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
