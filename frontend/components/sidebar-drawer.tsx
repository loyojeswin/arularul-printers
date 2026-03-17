"use client";

import Link from "next/link";
import { Route } from "next";
import { useEffect } from "react";
import { ApiUser } from "@/lib/types";

export function SidebarDrawer({
  open,
  user,
  onClose
}: {
  open: boolean;
  user: ApiUser | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const mainLinks: Array<{ label: string; href: string }> = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    { label: "Get Quote", href: "/get-quote" },
    { label: "Cart", href: "/cart" },
    { label: "Checkout", href: "/checkout" },
    { label: "Services", href: "/services" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" }
  ];

  const adminLinks: Array<{ label: string; href: string }> = [
    { label: "Admin Dashboard", href: "/admin" },
    { label: "Admin Products", href: "/admin/products" },
    { label: "Admin Orders", href: "/admin/orders" },
    { label: "Admin Offers", href: "/admin/offers" }
  ];

  const userLinks: Array<{ label: string; href: string }> = [
    { label: "Dashboard", href: "/dashboard" }
  ];

  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`absolute left-0 top-0 h-full w-[290px] bg-white shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#2874f0] px-4 py-3 text-white">
          <div>
            <p className="text-sm font-semibold">arul printers</p>
            <p className="text-xs text-white/90">Thoothukudi</p>
          </div>
          <button type="button" onClick={onClose} className="rounded bg-white/15 px-2 py-1 text-sm">
            Close
          </button>
        </div>

        <nav className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Menu</p>
          <ul className="grid gap-1">
            {mainLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href as Route}
                  onClick={onClose}
                  className="block rounded px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-slate-200 pt-4">
            {!user ? (
              <ul className="grid gap-1">
                <li>
                  <Link href="/login" onClick={onClose} className="block rounded px-3 py-2 text-sm font-semibold hover:bg-slate-100">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/signup" onClick={onClose} className="block rounded px-3 py-2 text-sm font-semibold hover:bg-slate-100">
                    Signup
                  </Link>
                </li>
              </ul>
            ) : (
              <>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Account</p>
                <ul className="grid gap-1">
                  {userLinks.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href as Route}
                        onClick={onClose}
                        className="block rounded px-3 py-2 text-sm font-semibold hover:bg-slate-100"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                  {user.role === "ADMIN" ? (
                    adminLinks.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href as Route}
                          onClick={onClose}
                          className="block rounded px-3 py-2 text-sm font-semibold hover:bg-slate-100"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))
                  ) : null}
                </ul>
              </>
            )}
          </div>
        </nav>
      </aside>
    </div>
  );
}
