import { getToken } from "./auth";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function resolveApiBaseUrl(): string {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  // On server, keep existing behavior so SSR can use localhost by default.
  if (typeof window === "undefined") {
    return normalizeBaseUrl(envBaseUrl || "http://localhost:4000/api");
  }

  const browserFallback = `${window.location.protocol}//${window.location.hostname}:4000/api`;

  if (!envBaseUrl) {
    return normalizeBaseUrl(browserFallback);
  }

  try {
    const parsed = new URL(envBaseUrl);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      parsed.hostname = window.location.hostname;
      return normalizeBaseUrl(parsed.toString());
    }
  } catch {
    // Keep raw env value if it is not a full URL.
  }

  return normalizeBaseUrl(envBaseUrl);
}

export const API_BASE_URL = resolveApiBaseUrl();

function buildHeaders(initHeaders?: HeadersInit, withJson = true): Headers {
  const headers = new Headers(initHeaders);
  const token = getToken();

  if (withJson && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: buildHeaders(init?.headers, true),
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body: formData,
    headers: buildHeaders(undefined, false),
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Upload failed");
  }

  return response.json() as Promise<T>;
}

export async function apiDownload(path: string, fileName: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: buildHeaders(undefined, false),
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Download failed");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
