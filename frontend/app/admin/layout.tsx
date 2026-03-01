"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiUser } from "@/lib/types";
import { getStoredUser, getToken } from "@/lib/auth";

const adminMenu = [
  { label: "Dashboard", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Offers", href: "/admin/offers" },
  { label: "Orders", href: "/admin/orders" }
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    const token = getToken();
    const storedUser = getStoredUser<ApiUser>();

    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }
    if (storedUser.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }

    setUser(storedUser);
  }, [router]);

  if (!user) {
    return <p className="rounded bg-white p-4 text-sm text-slate-600 shadow-sm">Loading admin workspace...</p>;
  }

  return (
    <section className="space-y-4">
      <nav className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {adminMenu.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {children}
    </section>
  );
}
