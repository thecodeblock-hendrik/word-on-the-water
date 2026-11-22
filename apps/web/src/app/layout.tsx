import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Lora } from "next/font/google";
import { cookies } from "next/headers";

import { ChatHost } from "@/components/chat/chat-host";
import { UndoToast } from "@/components/chat/undo-toast";
import { CspNonce } from "@/components/csp-nonce";
import { LogoSprite } from "@/components/logo";
import { BottomNavHost } from "@/components/layout/bottom-nav-host";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SkipLink } from "@/components/layout/skip-link";
import { currentDevotionalHref, loadContent } from "@/lib/devotionals/load";
import { today } from "@/lib/devotionals/format";
import { isBibleEnabled } from "@/lib/bible/flag";
import { isChatEnabled } from "@/lib/chat/flag";
import { siteMetadata } from "@/lib/seo";
import { THEME_COOKIE, parseTheme, themeColor } from "@/lib/theme";

import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-barlow",
  display: "swap",
  preload: false,
});
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-barlow-condensed",
  display: "optional",
});
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });

export const metadata: Metadata = siteMetadata;

export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: themeColor(theme),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Reading cookies makes every page render per request, as the nonce CSP requires (ADR 0007).
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  // The phone bottom bar needs both the Bible reader and the chat to be on.
  const bottomNav = isBibleEnabled() && isChatEnabled();
  const devotionalHref = currentDevotionalHref(loadContent().devotionals, today());
  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${barlow.variable} ${barlowCondensed.variable} ${lora.variable}`}
    >
      <body className="flex min-h-dvh flex-col has-[[data-chapter-nav]]:pb-[calc(3.6rem+var(--chat-extra,0rem)+max(.5rem,env(safe-area-inset-bottom)))] has-[[data-chat-return]]:[--chat-extra:1.8rem] lg:has-[[data-chapter-nav]]:pb-0 [&:has([data-chapter-nav])>footer]:hidden has-[[data-bottom-nav]]:pb-[calc(3.6rem+max(.5rem,env(safe-area-inset-bottom)))] lg:has-[[data-bottom-nav]]:pb-0">
        <CspNonce />
        <LogoSprite />
        <SkipLink />
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        {bottomNav && <BottomNavHost devotionalHref={devotionalHref} />}
        {bottomNav && <UndoToast />}
        {isChatEnabled() && (
          <ChatHost
            bibleLinks={isBibleEnabled()}
            devotionalHref={bottomNav ? devotionalHref : undefined}
          />
        )}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
