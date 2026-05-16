import type { Metadata } from "next";
import { ScrollRestoration } from "@/components/scroll-restoration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hardware POS",
  description: "Cloud POS for hardware and construction material shops",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <ScrollRestoration />
        {children}
      </body>
    </html>
  );
}
