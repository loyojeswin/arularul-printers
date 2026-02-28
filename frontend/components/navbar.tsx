"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiUser } from "@/lib/types";
import { clearAuthSession, getStoredUser } from "@/lib/auth";

const quickLinks = [
  ["Home", "/"],
  ["Products", "/products"]
] as const;

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [user, setUser] = useState<ApiUser | null>(null);
  const [search, setSearch] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const syncUser = () => setUser(getStoredUser<ApiUser>());
    syncUser();
    window.addEventListener("auth-changed", syncUser);
    return () => window.removeEventListener("auth-changed", syncUser);
  }, []);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setIsMenuOpen(false);
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", onClickOutside);
    }

    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isMenuOpen]);

  function handleLogout() {
    clearAuthSession();
    setUser(null);
    setIsMenuOpen(false);
    router.push("/login");
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const query = search.trim();
    if (!query) {
      router.push("/products");
      return;
    }
    router.push(`/products?search=${encodeURIComponent(query)}`);
  }

  return (
    <header className="sticky top-0 z-40 bg-[#2874f0] shadow-sm">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-3 py-3 md:px-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="min-w-fit text-xl font-extrabold tracking-tight text-white">
            arul printers
          </Link>

          <form onSubmit={onSearch} className="flex flex-1 items-center rounded bg-white px-3 py-2">
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search products, services and print jobs"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="submit" className="text-xs font-semibold text-[#2874f0]">
              Search
            </button>
          </form>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded border border-white/70 bg-white/10 text-white"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Open menu"
            >
              <span className="sr-only">Open menu</span>
              <div className="space-y-1">
                <span className="block h-0.5 w-4 bg-white" />
                <span className="block h-0.5 w-4 bg-white" />
                <span className="block h-0.5 w-4 bg-white" />
              </div>
            </button>

            {isMenuOpen ? (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-xl">
                <div className="mb-2 rounded-lg bg-slate-50 p-3">
                  {user ? (
                    <>
                      <p className="text-sm font-semibold">Hi, {user.name}</p>
                      <p className="text-xs text-slate-600">{user.email}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">Hello, Sign in</p>
                      <Link href="/login" className="mt-2 inline-block rounded bg-[#2874f0] px-3 py-1 text-xs font-semibold text-white">
                        Login
                      </Link>
                    </>
                  )}
                </div>

                <div className="grid gap-1 text-sm">
                  <Link href="/dashboard" className="rounded px-2 py-1.5 hover:bg-slate-100">
                    Help & Support
                  </Link>
                  <Link href="/dashboard" className="rounded px-2 py-1.5 hover:bg-slate-100">
                    Wallet
                  </Link>
                  <Link href="/products?search=offer" className="rounded px-2 py-1.5 hover:bg-slate-100">
                    Coupons
                  </Link>
                  <Link href={user?.role === "ADMIN" ? "/admin" : "/dashboard"} className="rounded px-2 py-1.5 hover:bg-slate-100">
                    {user?.role === "ADMIN" ? "Admin Panel" : "My Account"}
                  </Link>
                  <Link href="/dashboard" className="rounded px-2 py-1.5 hover:bg-slate-100">
                    My Orders
                  </Link>
                </div>

                <div className="mt-3 border-t pt-2">
                  {user ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700"
                    >
                      Logout
                    </button>
                  ) : (
                    <Link href="/signup" className="block w-full rounded border border-[#2874f0] px-3 py-1.5 text-center text-sm font-semibold text-[#2874f0]">
                      New user? Signup
                    </Link>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap text-xs font-medium text-white/95 md:text-sm">
          {quickLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={`rounded px-2 py-1 ${pathname === href ? "bg-white text-[#2874f0]" : "hover:bg-white/15"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
