"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiUser } from "@/lib/types";
import { getStoredUser } from "@/lib/auth";
import { Route } from "next";

const CART_KEY = "arul_cart_products";

function readCartCount(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    const sync = () => {
      setCartCount(readCartCount());
      setUser(getStoredUser<ApiUser>());
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("auth-changed", sync);
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth-changed", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const items = [
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
