import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import "./globals.css";
import { Tappable } from "@/components/ui/Tappable";

const onest = Onest({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-onest",
  display: "swap",
});

const DESCRIPTION =
  "DemAI — персональный прогноз риска от воздуха, пыльцы и погоды: одним числом, с напоминаниями в Telegram.";

export const metadata: Metadata = {
  metadataBase: new URL("https://demai.app"),
  title: "DemAI — персональный прогноз риска",
  description: DESCRIPTION,
  applicationName: "DemAI",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DemAI",
  },
  openGraph: {
    type: "website",
    locale: "ru_KZ",
    siteName: "DemAI",
    title: "DemAI — персональный прогноз риска",
    description: DESCRIPTION,
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "DemAI",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "DemAI — персональный прогноз риска",
    description: DESCRIPTION,
    images: ["/logo.png"],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "rgb(234, 252, 95)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${onest.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Tappable />
        {children}
      </body>
    </html>
  );
}
