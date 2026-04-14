"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

export type AuthResult = { success: true } | { success: false; error: string };

export async function loginAction(email: string, password: string): Promise<AuthResult> {
  try {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, error: body.detail ?? "Invalid email or password." };
    }

    const data = await res.json();
    const cookieStore = await cookies();

    cookieStore.set(ACCESS_TOKEN_COOKIE, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 60, // 30 minutes
    });

    // Forward the refresh_token cookie set by the backend
    const setCookieHeader = res.headers.get("set-cookie");
    if (setCookieHeader) {
      const refreshTokenMatch = setCookieHeader.match(/refresh_token=([^;]+)/);
      if (refreshTokenMatch) {
        const rawValue = refreshTokenMatch[1];
        const refreshTokenValue = rawValue.includes("%") ? decodeURIComponent(rawValue) : rawValue;
        cookieStore.set(REFRESH_TOKEN_COOKIE, refreshTokenValue, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: "Unable to connect to the server. Please try again." };
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

  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  redirect("/auth/v1/login");
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}
