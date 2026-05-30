/**
 * Client-side API fetchers for use with React Query (useQuery, useMutation).
 *
 * These functions run in the browser and communicate through Next.js API routes
 * (or directly to the backend via `/api/` proxy routes if configured).
 * They are NOT Server Actions — no "use server" directive.
 *
 * Pattern: used as `queryFn` / `mutationFn` in useQuery / useMutation hooks,
 * with server-fetched initialData hydrating the cache on first render.
 */

import type {
  ActionItem,
  ActionItemCreatePayload,
  ActionItemUpdatePayload,
  MeetingStatus,
  Speaker,
} from "@/server/api-actions";

const API_BASE = "/api/client";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = typeof body?.detail === "string" ? body.detail : `Request failed (${res.status})`;
    throw new Error(detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Meeting Status ──────────────────────────────────────────────────────────

export async function clientGetMeetingStatus(meetingId: string): Promise<MeetingStatus> {
  return fetchJson<MeetingStatus>(`${API_BASE}/meetings/${meetingId}/status`);
}

export async function clientProcessMeeting(meetingId: string): Promise<MeetingStatus> {
  return fetchJson<MeetingStatus>(`${API_BASE}/meetings/${meetingId}/process`, {
    method: "POST",
  });
}

export async function clientUploadMeetingFile(meetingId: string, file: File): Promise<unknown> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/meetings/${meetingId}/files`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body?.detail === "string" ? body.detail : "Upload failed");
  }
  return res.json();
}

// ─── Speakers ────────────────────────────────────────────────────────────────

export async function clientListSpeakers(meetingId: string): Promise<Speaker[]> {
  return fetchJson<Speaker[]>(`${API_BASE}/meetings/${meetingId}/speakers`);
}

export async function clientCreateSpeaker(
  meetingId: string,
  payload: { display_name: string; color_label: string },
): Promise<Speaker> {
  return fetchJson<Speaker>(`${API_BASE}/meetings/${meetingId}/speakers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function clientUpdateSpeaker(
  meetingId: string,
  speakerId: string,
  payload: { display_name?: string; color_label?: string },
): Promise<Speaker> {
  return fetchJson<Speaker>(`${API_BASE}/meetings/${meetingId}/speakers/${speakerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function clientDeleteSpeaker(meetingId: string, speakerId: string): Promise<void> {
  await fetchJson<void>(`${API_BASE}/meetings/${meetingId}/speakers/${speakerId}`, {
    method: "DELETE",
  });
}

// ─── Action Items ────────────────────────────────────────────────────────────

export async function clientListActionItems(meetingId: string): Promise<ActionItem[]> {
  return fetchJson<ActionItem[]>(`${API_BASE}/meetings/${meetingId}/action-items`);
}

export async function clientCreateActionItem(
  meetingId: string,
  payload: ActionItemCreatePayload,
): Promise<ActionItem> {
  return fetchJson<ActionItem>(`${API_BASE}/meetings/${meetingId}/action-items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function clientUpdateActionItem(
  meetingId: string,
  actionItemId: string,
  payload: ActionItemUpdatePayload,
): Promise<ActionItem> {
  return fetchJson<ActionItem>(`${API_BASE}/meetings/${meetingId}/action-items/${actionItemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function clientDeleteActionItem(meetingId: string, actionItemId: string): Promise<void> {
  await fetchJson<void>(`${API_BASE}/meetings/${meetingId}/action-items/${actionItemId}`, {
    method: "DELETE",
  });
}
