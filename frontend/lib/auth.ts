import { apiFetch } from "@/lib/api";
import { ApiUser } from "@/lib/types";

export async function fetchProfile(): Promise<ApiUser> {
  return apiFetch<ApiUser>("/me/profile");
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-changed"));
  }
}

export function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-changed"));
  }
}
