import { apiFetch } from "@/lib/api";
import { CartItem } from "@/lib/types";

export async function fetchLikes(): Promise<string[]> {
  return apiFetch<string[]>("/me/likes");
}

export async function addLike(productId: string): Promise<void> {
  await apiFetch("/me/likes", {
    method: "POST",
    body: JSON.stringify({ productId })
  });
}

export async function removeLike(productId: string): Promise<void> {
  await apiFetch(`/me/likes/${productId}`, { method: "DELETE" });
}

export async function fetchCart(): Promise<CartItem[]> {
  return apiFetch<CartItem[]>("/me/cart");
}

export async function upsertCartItem(productId: string, quantity: number): Promise<CartItem> {
  return apiFetch<CartItem>("/me/cart", {
    method: "POST",
    body: JSON.stringify({ productId, quantity })
  });
}

export async function removeCartItem(productId: string): Promise<void> {
  await apiFetch(`/me/cart/${productId}`, { method: "DELETE" });
}

export async function clearCart(): Promise<void> {
  await apiFetch("/me/cart", { method: "DELETE" });
}
