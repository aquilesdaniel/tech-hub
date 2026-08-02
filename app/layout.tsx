import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import type React from "react";
import "./globals.css";
import { Providers } from "./providers";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
});

export const metadata: Metadata = {
  title: "Sistema de Controle - Salgados e Biblioteca",
  description:
    "Sistema para controle de dívidas de salgados e gerenciamento de biblioteca",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={publicSans.variable} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
