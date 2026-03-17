"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiUser } from "@/lib/types";
import { fetchProfile } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const profile = await fetchProfile();
        if (profile.role !== "ADMIN") {
          router.replace("/dashboard");
          return;
        }
        setUser(profile);
      } catch {
        router.replace("/login");
      }
    }

    void init();
  }, [router]);

  if (!user) {
    return <div className="p-6">Loading admin...</div>;
  }

  return <>{children}</>;
}
