import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "llmg — Git for chats",
  description: "Branch, fork, and rollback AI conversations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} h-full`}>
      <body className="h-full bg-zinc-950 text-zinc-100 font-mono antialiased">{children}</body>
    </html>
  );
}
