import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Reporting",
  description: "Daily sales metrics tracking",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
