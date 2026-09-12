import type { Metadata, Viewport } from "next";
import fs from "fs";
import path from "path";
import Link from "next/link";
import "./globals.css";

const APP_VERSION = fs.readFileSync(path.join(process.cwd(), "VERSION"), "utf-8").trim();

export const metadata: Metadata = {
  title: "CySA+ Trainer",
  description: "Self-hosted CySA+ (CS0-004) spaced-repetition drills and mock exams",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-gray-100 min-h-screen antialiased">
        <div className="max-w-3xl mx-auto px-4 pb-16 pt-6">
          <nav className="flex items-center gap-1 mb-6 pb-2 border-b border-border overflow-x-auto">
            <Link href="/" className="nav-tab">Home</Link>
            <Link href="/drill" className="nav-tab">Drill</Link>
            <Link href="/cards" className="nav-tab">Cards</Link>
            <Link href="/exam" className="nav-tab">Exam</Link>
            <Link href="/books" className="nav-tab">Books</Link>
            <Link href="/analytics" className="nav-tab">Analytics</Link>
          </nav>
          {children}
        </div>
        <div className="fixed bottom-1.5 right-2 text-[10px] text-gray-600 select-none pointer-events-none z-50">
          v{APP_VERSION}
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
