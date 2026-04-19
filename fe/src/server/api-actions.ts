"use server";

import { apiRequest } from "@/server/api-client";

export type CurrentUser = {
    id: number;
    email: string;
    username: string;
    is_active: boolean;
    is_superuser: boolean;
};

export type UpdateCurrentUserPayload = {
    email?: string;
    username?: string;
    password?: string;
    is_active?: boolean;
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
    user_id: number;
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