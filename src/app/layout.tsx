import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

// Fonts are bundled with the app (OFL-licensed, from Fontsource) so builds never depend on Google Fonts being reachable.
const display = localFont({ src: "./fonts/archivo.woff2", weight: "100 900", variable: "--font-display-face" });
const body = localFont({ src: "./fonts/space-grotesk.woff2", weight: "300 700", variable: "--font-body" });
const mono = localFont({ src: "./fonts/jetbrains-mono.woff2", weight: "100 800", variable: "--font-mono-face" });

export const metadata: Metadata = {
  title: { default: "LOCK IN", template: "%s · LOCK IN" },
  description: "A chaotic little accountability club for you and your friends. Less talk. More action.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
