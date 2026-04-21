"use server";

import { apiRequest } from "@/server/api-client";

export type CurrentUser = {
  id: string;
  email: string;
  username: string;
  full_name: string;
  status: "active" | "inactive" | "suspended";
  last_login_at: string | null;
  avatar_media_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
};

export type UpdateCurrentUserPayload = {
  email?: string;
  username?: string;
  full_name?: string;
  status?: "active" | "inactive" | "suspended";
  password?: string;
  is_active?: boolean;
  avatar_media_id?: string | null;
};

export type UserListResponse = {
  data?: CurrentUser[];
  total_count?: number;
  page?: number;
  items_per_page?: number;
};

export type PresignedUrlPayload = {
  file_name: string;
  mime_type: string;
  file_size: number;
};

export type PresignedUrlResponse = {
  signed_url: string;
  token: string;
  path: string;
};

export type ConfirmMediaPayload = {
  path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
};

export type Media = {
  id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  media_type: string;
  mime_type: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  owner_id: string;
  status: "active" | "archived";
  cover_image_media_id: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectCreatePayload = {
  code: string;
  name: string;
  description?: string;
  status?: "active" | "archived";
};

export type ProjectUpdatePayload = {
  name?: string;
  description?: string;
  status?: "active" | "archived";
  cover_image_media_id?: string | null;
};

export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  member_role: "owner" | "editor" | "viewer";
  created_at: string;
  updated_at: string;
};

export type ProjectMemberCreatePayload = {
  email: string;
  member_role?: "editor" | "viewer";
};

export type ProjectMemberListItem = ProjectMember & {
  user_email: string;
  user_full_name: string;
  user_avatar_url?: string | null;
};

export type ProjectMemberListResponse = {
  data: ProjectMemberListItem[];
  total: number;
  page: number;
  items_per_page: number;
  total_pages: number;
};

export type ProjectMemberListQuery = {
  page?: number;
  items_per_page?: number;
  search?: string;
  role?: "owner" | "editor" | "viewer";
  sort_by?: "created_at" | "full_name" | "email" | "member_role";
  sort_order?: "asc" | "desc";
};

export type Meeting = {
  id: string;
  project_id: string;
  title: string;
  meeting_date: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type MeetingCreatePayload = {
  project_id: string;
  title: string;
  meeting_date: string;
};

export type MeetingFile = {
  id: string;
  meeting_id: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  storage_key: string;
  file_url?: string | null;
  duration_sec?: number | null;
  checksum_sha256?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProcessingJob = {
  id: string;
  meeting_id: string;
  job_type: string;
  provider: string | null;
  status: string;
  progress: number;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type MeetingDetail = Meeting & {
  files: MeetingFile[];
};

export type MeetingStatus = {
  meeting_id: string;
  meeting_status: string;
  latest_job: ProcessingJob | null;
  file_count: number;
  updated_at: string;
};

export type Speaker = {
  id: string;
  meeting_id: string;
  speaker_label: string;
  display_name: string | null;
  is_confirmed: boolean;
  created_at: string;
  updated_at: string;
};

export type TranscriptSegment = {
  id: string;
  meeting_id: string;
  version_no: number;
  speaker_id: string | null;
  speaker_label: string;
  start_ms: number;
  end_ms: number;
  text: string;
  confidence: number | null;
  source: "ai" | "manual";
  created_at: string;
  updated_at: string;
};

export type Transcript = {
  meeting_id: string;
  version_no: number;
  speakers: Speaker[];
  segments: TranscriptSegment[];
};

export type MeetingVersion = {
  id: string;
  meeting_id: string;
  version_no: number;
  change_note: string | null;
  is_final: boolean;
  created_at: string;
  updated_at: string;
};

export type MeetingSummary = {
  id: string;
  meeting_id: string;
  version_no: number;
  summary_text: string;
  key_points_json: Record<string, unknown> | null;
  decisions_json: Record<string, unknown> | null;
  source: "ai" | "manual";
  created_at: string;
  updated_at: string;
};

export type ActionItem = {
  id: string;
  meeting_id: string;
  version_no: number;
  title: string;
  description: string | null;
  assignee_user_id: string | null;
  assignee_text: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "done";
  source: "ai" | "manual";
  created_at: string;
  updated_at: string;
};

export type ActionItemCreatePayload = {
  title: string;
  description?: string | null;
  assignee_user_id?: string | null;
  assignee_text?: string | null;
  due_date?: string | null;
  priority?: "low" | "medium" | "high";
  status?: "open" | "in_progress" | "done";
};

export type ActionItemUpdatePayload = Partial<ActionItemCreatePayload>;

export type MeetingSearchQuery = {
  projectId?: string;
  fromDate?: string;
  toDate?: string;
  keyword?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type MeetingSearchResponse = {
  data: Meeting[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export async function getCurrentUserAction(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/api/v1/users/me");
}

export async function updateCurrentUserAction(payload: UpdateCurrentUserPayload): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/api/v1/users/me", {
    method: "PATCH",
    body: payload,
  });
}

export async function listUsersAction(page = 1, itemsPerPage = 20): Promise<UserListResponse> {
  return apiRequest<UserListResponse>(`/api/v1/users?page=${page}&items_per_page=${itemsPerPage}`);
}

export async function createPresignedUrlAction(payload: PresignedUrlPayload): Promise<PresignedUrlResponse> {
  return apiRequest<PresignedUrlResponse>("/api/v1/media/presigned-url", {
    method: "POST",
    body: payload,
  });
}

export async function confirmMediaUploadAction(payload: ConfirmMediaPayload): Promise<Media> {
  return apiRequest<Media>("/api/v1/media", {
    method: "POST",
    body: payload,
  });
}

export async function getMediaByIdAction(mediaId: string): Promise<Media> {
  return apiRequest<Media>(`/api/v1/media/${mediaId}`);
}

export async function healthCheckAction(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>("/health");
}

export async function listProjectsAction(): Promise<Project[]> {
  return apiRequest<Project[]>("/api/v1/projects");
}

export async function createProjectAction(payload: ProjectCreatePayload): Promise<Project> {
  return apiRequest<Project>("/api/v1/projects", {
    method: "POST",
    body: payload,
  });
}

export async function getProjectByIdAction(projectId: string): Promise<Project> {
  return apiRequest<Project>(`/api/v1/projects/${projectId}`);
}

export async function updateProjectAction(projectId: string, payload: ProjectUpdatePayload): Promise<Project> {
  return apiRequest<Project>(`/api/v1/projects/${projectId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function listProjectMeetingsAction(projectId: string, sort = "meeting_date.desc"): Promise<Meeting[]> {
  return apiRequest<Meeting[]>(`/api/v1/projects/${projectId}/meetings?sort=${encodeURIComponent(sort)}`);
}

export async function createMeetingAction(payload: MeetingCreatePayload): Promise<Meeting> {
  return apiRequest<Meeting>("/api/v1/meetings", {
    method: "POST",
    body: payload,
  });
}

export async function getMeetingByIdAction(meetingId: string): Promise<MeetingDetail> {
  return apiRequest<MeetingDetail>(`/api/v1/meetings/${meetingId}`);
}

export async function uploadMeetingFileAction(meetingId: string, file: File): Promise<MeetingFile> {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<MeetingFile>(`/api/v1/meetings/${meetingId}/files:upload`, {
    method: "POST",
    body: formData,
  });
}

export async function processMeetingAction(meetingId: string): Promise<MeetingStatus> {
  return apiRequest<MeetingStatus>(`/api/v1/meetings/${meetingId}/process`, {
    method: "POST",
  });
}

export async function getMeetingStatusAction(meetingId: string): Promise<MeetingStatus> {
  return apiRequest<MeetingStatus>(`/api/v1/meetings/${meetingId}/status`);
}

export async function searchMeetingsAction(query: MeetingSearchQuery): Promise<MeetingSearchResponse> {
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
}

export async function getTranscriptAction(meetingId: string, version = "latest"): Promise<Transcript> {
  return apiRequest<Transcript>(`/api/v1/meetings/${meetingId}/transcript?version=${encodeURIComponent(version)}`);
}

export async function updateTranscriptSegmentAction(
  meetingId: string,
  segmentId: string,
  text: string,
): Promise<TranscriptSegment> {
  return apiRequest<TranscriptSegment>(`/api/v1/meetings/${meetingId}/transcript/segments/${segmentId}`, {
    method: "PATCH",
    body: { text },
  });
}

export async function renameSpeakerAction(meetingId: string, speakerId: string, displayName: string): Promise<Speaker> {
  return apiRequest<Speaker>(`/api/v1/meetings/${meetingId}/speakers/${speakerId}/rename`, {
    method: "POST",
    body: { display_name: displayName },
  });
}

export async function createMeetingVersionAction(
  meetingId: string,
  payload: { from_version?: number | "latest"; change_note?: string },
): Promise<MeetingVersion> {
  return apiRequest<MeetingVersion>(`/api/v1/meetings/${meetingId}/versions`, {
    method: "POST",
    body: payload,
  });
}

export async function generateSummaryAction(meetingId: string): Promise<ProcessingJob> {
  return apiRequest<ProcessingJob>(`/api/v1/meetings/${meetingId}/summary:generate`, {
    method: "POST",
  });
}

export async function getMeetingSummaryAction(meetingId: string, version = "latest"): Promise<MeetingSummary | null> {
  return apiRequest<MeetingSummary | null>(
    `/api/v1/meetings/${meetingId}/summary?version=${encodeURIComponent(version)}`,
  );
}

export async function updateMeetingSummaryAction(
  meetingId: string,
  payload: {
    summary_text: string;
    key_points_json?: Record<string, unknown> | null;
    decisions_json?: Record<string, unknown> | null;
  },
  version = "latest",
): Promise<MeetingSummary> {
  return apiRequest<MeetingSummary>(`/api/v1/meetings/${meetingId}/summary?version=${encodeURIComponent(version)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function listActionItemsAction(meetingId: string, version = "latest"): Promise<ActionItem[]> {
  return apiRequest<ActionItem[]>(`/api/v1/meetings/${meetingId}/action-items?version=${encodeURIComponent(version)}`);
}

export async function createActionItemAction(
  meetingId: string,
  payload: ActionItemCreatePayload,
  version = "latest",
): Promise<ActionItem> {
  return apiRequest<ActionItem>(`/api/v1/meetings/${meetingId}/action-items?version=${encodeURIComponent(version)}`, {
    method: "POST",
    body: payload,
  });
}

export async function updateActionItemAction(
  meetingId: string,
  actionItemId: string,
  payload: ActionItemUpdatePayload,
): Promise<ActionItem> {
  return apiRequest<ActionItem>(`/api/v1/meetings/${meetingId}/action-items/${actionItemId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteActionItemAction(meetingId: string, actionItemId: string): Promise<void> {
  await apiRequest<void>(`/api/v1/meetings/${meetingId}/action-items/${actionItemId}`, {
    method: "DELETE",
  });
}

export async function addProjectMemberAction(
  projectId: string,
  payload: ProjectMemberCreatePayload,
): Promise<ProjectMember> {
  return apiRequest<ProjectMember>(`/api/v1/projects/${projectId}/members`, {
    method: "POST",
    body: payload,
  });
}

export async function listProjectMembersAction(
  projectId: string,
  query: ProjectMemberListQuery = {},
): Promise<ProjectMemberListResponse> {
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

  return apiRequest<ProjectMemberListResponse>(path);
}

export async function removeProjectMemberAction(projectId: string, userId: string): Promise<void> {
  await apiRequest<void>(`/api/v1/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}
