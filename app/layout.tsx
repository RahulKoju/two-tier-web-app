import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Task Tracker",
    template: "%s | Task Tracker",
  },
  description: "Minimal task tracker built with Next.js, Prisma, PostgreSQL, and Zod.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-slate-50 text-slate-950">{children}</body>
    </html>
  );
}
