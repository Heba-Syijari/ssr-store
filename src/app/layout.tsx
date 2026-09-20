import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SSR Store",
    template: "%s · SSR Store",
  },
  description:
    "A server-rendered product catalogue built with the Next.js App Router and FakeStoreAPI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Data by{" "}
          <a
            className="underline underline-offset-4 hover:text-slate-900 dark:hover:text-slate-100"
            href="https://fakestoreapi.com"
            rel="noreferrer"
            target="_blank"
          >
            FakeStoreAPI
          </a>{" "}
          · Rendered on the server
        </footer>
      </body>
    </html>
  );
}
