"use client";

import { useEffect, useState } from "react";
import { isTokenValid } from "@/lib/auth";

export default function RefreshSessionClient() {
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    // Run once on mount: if access token missing/expired and refresh present,
    // call our server-side refresh endpoint to obtain new tokens.
    tryRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tryRefresh() {
    if (attempted) return;
    const cookies = Object.fromEntries(
      document.cookie
        .split("; ")
        .map((c) => c.split("=").map(decodeURIComponent)),
    );
    const access = cookies["access_token"];
    const refresh = cookies["refresh_token"];
    if (isTokenValid(access)) return;
    if (!refresh) return;

    setAttempted(true);
    try {
      await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      // We don't need to do anything else — cookies are set by the API route.
    } catch (err) {
      // swallow errors; user will be redirected to login on protected routes
      // by existing client logic.
    }
  }

  return null;
}
