"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { notifyAuthChange } from "@/lib/auth";
import { AuthResponse } from "@/lib/types";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    city: "Thoothukudi"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiFetch<AuthResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      notifyAuthChange();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-md space-y-3">
      <h1 className="text-3xl font-bold">Signup</h1>
      <form onSubmit={onSubmit} className="grid gap-3 rounded bg-white p-4 shadow-sm">
        <input
          className="rounded border p-2"
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          required
        />
        <input
          className="rounded border p-2"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
          required
        />
        <input
          className="rounded border p-2"
          type="text"
          placeholder="Phone"
          value={formData.phone}
          onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
        />
        <input
          className="rounded border p-2"
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
          minLength={8}
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="rounded bg-brand px-3 py-2 text-white disabled:opacity-60" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </section>
  );
}
