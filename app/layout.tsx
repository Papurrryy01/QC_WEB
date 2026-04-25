import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ThemeInitScript from "@/app/components/ThemeInitScript";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qcapp.co";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "QC",
    template: "%s | QC",
  },
  description:
    "QC lets you create and schedule meaningful moments with messages, photos, voice, and cinematic reveals.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "QC",
    description: "Scheduled emotional moments, beautifully delivered.",
    siteName: "QC",
    url: "/",
    type: "website",
    images: [
      {
        url: "/qc-logo.png",
        width: 1024,
        height: 1024,
        alt: "QC logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QC",
    description: "Scheduled emotional moments, beautifully delivered.",
    images: ["/qc-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body className="antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
