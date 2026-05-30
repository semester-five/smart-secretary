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

// Map of client proxy path prefixes to backend path prefixes.
// /api/client/meetings/:id/status → /api/v1/meetings/:id/status
const PROXY_PATH_PREFIX = "/api/client";
const BACKEND_PATH_PREFIX = "/api/v1";

function buildBackendUrl(proxyPath: string): string {
  // proxyPath is the portion after /api/client, e.g. /meetings/abc/status
  return `${API_URL}${BACKEND_PATH_PREFIX}${proxyPath}`;
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

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  // Forward request body for mutations
  const isBodyMethod = ["POST", "PATCH", "PUT", "DELETE"].includes(request.method);
  let body: BodyInit | undefined;

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

  try {
    const response = await fetch(backendUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

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
  } catch (error) {
    console.error("[api/client proxy] Failed to reach backend:", error);
    return NextResponse.json(
      { detail: "Failed to connect to backend service." },
      { status: 502 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
