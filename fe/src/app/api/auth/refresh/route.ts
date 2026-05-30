import { NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function POST() {
  try {
    // Note: this endpoint runs on the server and will have access to the
    // cookies forwarded by the browser. Use the refresh_token cookie to
    // request a new session from the backend and set new cookies for the client.
    return await proxyRefresh();
  } catch (err) {
    return NextResponse.json({ message: "Refresh failed" }, { status: 401 });
  }
}

async function proxyRefresh() {
  // Read refresh cookie from incoming request headers via global Request? In
  // the App Router, use cookies() from next/headers, but NextResponse does not
  // expose the request here; instead the browser should send the request
  // with credentials so we can forward headers. Simpler: call backend refresh
  // and propagate cookies based on its JSON payload.

  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      // Browser should include cookies; ensure credentials are forwarded
      // by using same-site settings. Here we call backend without client cookie
      // and expect the backend to return tokens in JSON.
      "Content-Type": "application/json",
    },
    cache: "no-store",
    credentials: "include",
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
  // Set cookies for client
  res.cookies.set("access_token", payload.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
  });
  if (payload.refresh_token) {
    res.cookies.set("refresh_token", payload.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  return res;
}
