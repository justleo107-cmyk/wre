import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "vantahq.pro",
    template: "vantahq.pro",
  },
  description: "The premium collaboration and gamified CRM progression system for real estate wholesalers. Post listings, analyze deals with AI, calculate MAO, and progress through interactive lesson guides.",
  icons: {
    icon: "/vanta_logo_icon.jpg",
  },
  openGraph: {
    title: "vantahq.pro",
    description: "The premium collaboration and gamified CRM progression system for real estate wholesalers. Post listings, analyze deals with AI, calculate MAO, and progress through interactive lesson guides.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "vantahq.pro",
    description: "The premium collaboration and gamified CRM progression system for real estate wholesalers. Post listings, analyze deals with AI, calculate MAO, and progress through interactive lesson guides.",
  },
  other: {
    title: "vantahq.pro",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
