import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PUNTER AI",
  description: "Private football analytics and prediction dashboard"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}