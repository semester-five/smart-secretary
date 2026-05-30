import { cache } from "react";

import type {
  ActionItem,
  MeetingDetail,
  MeetingSearchQuery,
  MeetingSearchResponse,
  MeetingStatus,
  MeetingSummary,
  MeetingVersion,
  Speaker,
  Transcript,
} from "@/server/api-actions";
import { apiRequest } from "@/server/api-client";

/**
 * Cached query to get a single meeting with its files.
 * React cache() deduplicates calls between layout and page within the
 * same server request (e.g., meeting layout + overview page).
 */
export const getMeetingById = cache(async (meetingId: string): Promise<MeetingDetail> => {
  return apiRequest<MeetingDetail>(`/api/v1/meetings/${meetingId}`, {
    revalidate: 15,
  });
});

/**
 * Cached query for meeting processing status.
 * No revalidation — status is real-time and should always be fresh on SSR.
 */
export const getMeetingStatus = cache(async (meetingId: string): Promise<MeetingStatus> => {
  return apiRequest<MeetingStatus>(`/api/v1/meetings/${meetingId}/status`);
});

/**
 * Cached query for meeting transcript.
 */
export const getTranscript = cache(async (meetingId: string, version = "latest"): Promise<Transcript> => {
  return apiRequest<Transcript>(`/api/v1/meetings/${meetingId}/transcript?version=${encodeURIComponent(version)}`, {
    revalidate: 10,
  });
});

/**
 * Cached query for meeting summary.
 */
export const getMeetingSummary = cache(
  async (meetingId: string, version = "latest"): Promise<MeetingSummary | null> => {
    return apiRequest<MeetingSummary | null>(
      `/api/v1/meetings/${meetingId}/summary?version=${encodeURIComponent(version)}`,
      { revalidate: 10 },
    );
  },
);

/**
 * Cached query for meeting action items.
 */
export const listActionItems = cache(async (meetingId: string, version = "latest"): Promise<ActionItem[]> => {
  return apiRequest<ActionItem[]>(`/api/v1/meetings/${meetingId}/action-items?version=${encodeURIComponent(version)}`, {
    revalidate: 10,
  });
});

/**
 * Cached query for meeting speakers.
 */
export const listSpeakers = cache(async (meetingId: string): Promise<Speaker[]> => {
  return apiRequest<Speaker[]>(`/api/v1/meetings/${meetingId}/speakers`, {
    revalidate: 10,
  });
});

/**
 * Cached query for meeting versions.
 */
export const getMeetingVersions = cache(async (meetingId: string): Promise<MeetingVersion[]> => {
  return apiRequest<MeetingVersion[]>(`/api/v1/meetings/${meetingId}/versions`, {
    revalidate: 10,
  });
});

/**
 * Cached query to search meetings.
 */
export const searchMeetings = cache(async (query: MeetingSearchQuery): Promise<MeetingSearchResponse> => {
  const params = new URLSearchParams();
  if (query.projectId) params.set("projectId", query.projectId);
  if (query.fromDate) params.set("fromDate", query.fromDate);
  if (query.toDate) params.set("toDate", query.toDate);
  if (query.keyword) params.set("keyword", query.keyword);
  if (query.status) params.set("status", query.status);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));

  const queryString = params.toString();
  const path = queryString ? `/api/v1/meetings/search?${queryString}` : "/api/v1/meetings/search";

  return apiRequest<MeetingSearchResponse>(path);
});

/**
 * Cached health check query.
 */
export const healthCheck = cache(async (): Promise<{ status: string }> => {
  return apiRequest<{ status: string }>("/health", { revalidate: 60 });
});
