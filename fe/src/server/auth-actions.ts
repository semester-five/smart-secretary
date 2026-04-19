"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  apiRequest,
  clearAuthCookies,
  refreshAccessTokenIfPossible,
  setAuthCookies,
  type TokenResponse,
} from "@/server/api-client";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

export type AuthResult = { success: true } | { success: false; error: string };

export async function loginAction(email: string, password: string): Promise<AuthResult> {
  try {
    const data = await apiRequest<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: { username: email, password },
    });
    await setAuthCookies(data);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to connect to the server. Please try again.";
    return { success: false, error: message };
  }
}

export async function registerAction(email: string, username: string, password: string): Promise<AuthResult> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, error: body.detail ?? "Registration failed." };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Unable to connect to the server. Please try again." };
  }
}

export async function logoutAction(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

    if (refreshToken) {
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Cookie: `refresh_token=${refreshToken}` },
      });
    }
  } catch {
    // ignore logout errors
  }

  await clearAuthCookies();
  redirect("/auth/v1/login");
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (existing) return existing;
  return refreshAccessTokenIfPossible();
}

export async function refreshSessionAction(): Promise<AuthResult> {
  try {
    const accessToken = await refreshAccessTokenIfPossible();
    if (!accessToken) {
      return { success: false, error: "Session expired. Please login again." };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Unable to refresh session." };
  }
}
