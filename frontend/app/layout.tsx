import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wanderly",
  description: "LangGraph session streaming and Supabase-backed auth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
