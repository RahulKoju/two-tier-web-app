import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Two-Tier Web App",
    template: "%s | Two-Tier Web App",
  },
  applicationName: "Two-Tier Web App",
  description:
    "Production-style two-tier web application deployed on AWS EC2 with Next.js, Prisma, PostgreSQL, Docker Compose, Jenkins CI/CD, Nginx, Certbot SSL, and systemd auto-start.",
  keywords: [
    "Next.js",
    "Prisma",
    "PostgreSQL",
    "Docker Compose",
    "Jenkins",
    "Nginx",
    "Certbot",
    "AWS EC2",
    "systemd",
  ],
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
