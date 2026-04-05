import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Manrope } from "next/font/google";
import { Suspense } from "react";
import Script from "next/script";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope"
});

export const metadata = {
  title: "arul printers",
  description: "Digital print ordering platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={manrope.variable}>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
        <Suspense fallback={<div className="h-[92px] bg-[#2874f0]" />}>
          <Navbar />
        </Suspense>
        <main className="mx-auto w-full max-w-[1400px] px-3 py-4 pb-20 md:px-5 md:py-6 md:pb-6">{children}</main>
        <MobileBottomNav />
        <Footer />
      </body>
    </html>
  );
}
