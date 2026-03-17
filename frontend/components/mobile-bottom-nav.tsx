"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiUser } from "@/lib/types";
import { fetchProfile } from "@/lib/auth";
import { fetchCart } from "@/lib/user-data";
import { Route } from "next";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    const sync = async () => {
      try {
        const profile = await fetchProfile();
        setUser(profile);
      } catch {
        setUser(null);
        setCartCount(0);
        return;
      }

      try {
        const items = await fetchCart();
        setCartCount(items.reduce((sum, item) => sum + (item.quantity || 1), 0));
      } catch {
        setCartCount(0);
      }
    };

    void sync();
    window.addEventListener("auth-changed", sync);
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener("auth-changed", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const items: { label: string; href: Route | string; badge?: number }[] = [
    { label: "Home", href: "/" },
    { label: "Categories", href: "/products" },
    { label: "Cart", href: "/cart", badge: cartCount },
    { label: "Profile", href: user ? "/dashboard" : "/login" }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white md:hidden">
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="relative">
              <Link
                href={item.href as Route}
                className={`flex flex-col items-center justify-center py-2 text-[11px] font-semibold ${
                  active ? "text-[#2874f0]" : "text-slate-700"
                }`}
              >
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="mt-0.5 rounded-full bg-[#fb641b] px-1.5 text-[10px] text-white">
                    {item.badge}
                  </span>
                ) : (
                  <span className="mt-0.5 h-[14px]" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
