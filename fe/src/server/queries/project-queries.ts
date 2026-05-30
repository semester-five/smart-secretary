import { cache } from "react";

import type { Meeting, Project, ProjectMemberListQuery, ProjectMemberListResponse } from "@/server/api-actions";
import { apiRequest } from "@/server/api-client";

/**
 * Cached query to list all projects the current user can access.
 * Revalidates every 30 seconds — project list changes infrequently.
 */
export const listProjects = cache(async (): Promise<Project[]> => {
  return apiRequest<Project[]>("/api/v1/projects", { revalidate: 30 });
});

/**
 * Cached query to get a single project by ID.
 * Using React cache() deduplicates calls between generateMetadata and page
 * component within the same server request.
 */
export const getProjectById = cache(async (projectId: string): Promise<Project> => {
  return apiRequest<Project>(`/api/v1/projects/${projectId}`, { revalidate: 30 });
});

/**
 * Cached query to list meetings for a given project.
 */
export const listProjectMeetings = cache(async (projectId: string, sort = "meeting_date.desc"): Promise<Meeting[]> => {
  return apiRequest<Meeting[]>(`/api/v1/projects/${projectId}/meetings?sort=${encodeURIComponent(sort)}`, {
    revalidate: 15,
  });
});

/**
 * Cached query to list project members with optional filters.
 */
export const listProjectMembers = cache(
  async (projectId: string, query: ProjectMemberListQuery = {}): Promise<ProjectMemberListResponse> => {
    const params = new URLSearchParams();
    if (query.page !== undefined) params.set("page", String(query.page));
    if (query.items_per_page !== undefined) params.set("items_per_page", String(query.items_per_page));
    if (query.search) params.set("search", query.search);
    if (query.role) params.set("role", query.role);
    if (query.sort_by) params.set("sort_by", query.sort_by);
    if (query.sort_order) params.set("sort_order", query.sort_order);

    const queryString = params.toString();
    const path = queryString
      ? `/api/v1/projects/${projectId}/members?${queryString}`
      : `/api/v1/projects/${projectId}/members`;

    return apiRequest<ProjectMemberListResponse>(path, { revalidate: 15 });
  },
);
