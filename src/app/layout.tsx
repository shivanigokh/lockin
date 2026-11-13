import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

// Apple devices use San Francisco; everyone else gets Inter (OFL, bundled so builds never fetch fonts).
const body = localFont({ src: "./fonts/inter.woff2", weight: "100 900", variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: "nudge", template: "%s · nudge" },
  description: "A tiny accountability club for you and your friends. Less talk. More action.",
  appleWebApp: { capable: true, title: "nudge", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#121015",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={body.variable}>
      <body className="min-h-dvh">
        <div className="ambient" aria-hidden />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
