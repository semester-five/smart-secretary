import { cache } from "react";

import type { CurrentUser, UserListResponse } from "@/server/api-actions";
import { apiRequest } from "@/server/api-client";

/**
 * Cached query to get the currently authenticated user.
 * Using React cache() ensures this is deduplicated across layout + page
 * within the same server request — avoids duplicate /users/me calls.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  return apiRequest<CurrentUser>("/api/v1/users/me");
});

/**
 * Cached query to list all users (superuser only).
 */
export const listUsers = cache(async (page = 1, itemsPerPage = 20): Promise<UserListResponse> => {
  return apiRequest<UserListResponse>(`/api/v1/users?page=${page}&items_per_page=${itemsPerPage}`, { revalidate: 30 });
});
