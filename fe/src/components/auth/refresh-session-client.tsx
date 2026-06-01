"use client";

import { useEffect } from "react";

export default function RefreshSessionClient() {
  useEffect(() => {
    void fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    }).catch(() => {
      // Protected routes and API calls handle expired sessions explicitly.
    });
  }, []);

  return null;
}
