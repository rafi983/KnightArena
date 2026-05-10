import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ChallengeNotification from "./components/ChallengeNotification";
import SessionProvider from "./components/SessionProvider";
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
  title: "KnightArena - Play Online & vs AI",
  description: "KnightArena is a fully responsive chess platform. Play against AI or challenge friends online with timers, analysis, and more.",
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
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <ChallengeNotification />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
