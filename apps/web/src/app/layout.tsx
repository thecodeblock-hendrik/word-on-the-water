import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Lora } from "next/font/google";
import { connection } from "next/server";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SkipLink } from "@/components/layout/skip-link";

import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-barlow",
  display: "swap",
});
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Word on the Water", template: "%s | Word on the Water" },
  description: "Devotionals and Bible teaching for men and surfers.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Nonces are per request, so every page must render at request time (ADR 0007).
  await connection();
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable} ${lora.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <SkipLink />
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
