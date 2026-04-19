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