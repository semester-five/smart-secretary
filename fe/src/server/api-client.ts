import { cookies } from "next/headers";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";
const ACCESS_TOKEN_MAX_AGE_SECONDS = 30 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const detail = (payload as { detail?: unknown }).detail;
  return typeof detail === "string" ? detail : fallback;
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function setAuthCookies(tokenResponse: TokenResponse): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, tokenResponse.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, tokenResponse.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function refreshAccessTokenIfPossible(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return undefined;

  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      Cookie: `refresh_token=${encodeURIComponent(refreshToken)}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    await clearAuthCookies();
    return undefined;
  }

  const tokenResponse = await parseJson<TokenResponse>(response);
  await setAuthCookies(tokenResponse);
  return tokenResponse.access_token;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };
  const isFormData = options.body instanceof FormData;
  if (options.body !== undefined && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const body = isFormData ? options.body : options.body !== undefined ? JSON.stringify(options.body) : undefined;

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    cache: "no-store",
  });

  if (response.status === 401 && retry) {
    const newAccessToken = await refreshAccessTokenIfPossible();
    if (newAccessToken) {
      return apiRequest<T>(path, options, false);
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(getErrorMessage(payload, `Request failed with status ${response.status}`));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return parseJson<T>(response);
}
