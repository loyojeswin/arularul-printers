"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiUser } from "@/lib/types";
import { fetchProfile, logout } from "@/lib/auth";
import { Route } from "next";
import { SidebarDrawer } from "@/components/sidebar-drawer";

const quickLinks = [
  ["Home", "/"],
  ["Products", "/products"],
  ["Get Quote", "/get-quote"],
  ["Services", "/services"],
  ["Contact", "/contact"]
] as const;

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<ApiUser | null>(null);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const syncUser = async () => {
      try {
        const profile = await fetchProfile();
        setUser(profile);
      } catch {
        setUser(null);
      }
    };

    void syncUser();
    window.addEventListener("auth-changed", syncUser);
    return () => window.removeEventListener("auth-changed", syncUser);
  }, []);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  async function handleLogout() {
    await logout();
    setUser(null);
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
      <SidebarDrawer open={drawerOpen} user={user} onClose={() => setDrawerOpen(false)} />
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-3 py-3 md:px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((value) => !value)}
            className="rounded bg-white/15 px-3 py-2 text-sm font-semibold text-white"
          >
            Menu
          </button>
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

          {!user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" className="rounded bg-white px-3 py-1 text-sm font-semibold text-[#2874f0]">
                Login
              </Link>
              <Link href="/signup" className="rounded border border-white px-3 py-1 text-sm text-white">
                Signup
              </Link>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"} className="rounded bg-white px-3 py-1 text-sm font-semibold text-[#2874f0]">
                {user.role === "ADMIN" ? "Admin" : "Dashboard"}
              </Link>
              <button onClick={() => void handleLogout()} className="rounded border border-white px-3 py-1 text-sm text-white">
                Logout
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap text-xs font-medium text-white/95 md:text-sm">
          {quickLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href as Route}
              className={`rounded px-2 py-1 ${pathname === href ? "bg-white text-[#2874f0]" : "hover:bg-white/15"}`}
            >
              {label}
            </Link>
          ))}

          <Link href="/about" className="rounded px-2 py-1 hover:bg-white/15">
            About
          </Link>

          {!user ? (
            <div className="ml-auto flex items-center gap-2 md:hidden">
              <Link href="/login" className="rounded bg-white px-2 py-1 text-[#2874f0]">
                Login
              </Link>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-2 md:hidden">
              <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"} className="rounded bg-white px-2 py-1 text-[#2874f0]">
                {user.role === "ADMIN" ? "Admin" : "Dashboard"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
