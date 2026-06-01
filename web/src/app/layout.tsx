import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Argos Wallet — All-Seeing Web3 Infrastructure",
  description:
    "Self-hosted, multi-tenant wallet infrastructure for Web3 applications. Argos watches so you can build.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="grain" />
        {children}
      </body>
    </html>
  );
}
