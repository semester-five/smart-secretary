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
  user_id: string;
  member_role?: "owner" | "editor" | "viewer";
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

export async function listProjectMeetingsAction(projectId: string): Promise<Meeting[]> {
  return apiRequest<Meeting[]>(`/api/v1/projects/${projectId}/meetings`);
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

export async function addProjectMemberAction(
  projectId: string,
  payload: ProjectMemberCreatePayload,
): Promise<ProjectMember> {
  return apiRequest<ProjectMember>(`/api/v1/projects/${projectId}/members`, {
    method: "POST",
    body: payload,
  });
}

export async function removeProjectMemberAction(projectId: string, userId: string): Promise<void> {
  await apiRequest<void>(`/api/v1/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}
