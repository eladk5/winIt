/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import "sweetalert2/dist/sweetalert2.min.css";
import { Navbar } from "@/components/navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WinIt",
  description: "WinIt Auction & Win App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossOrigin="" href="https://fonts.gstatic.com" rel="preconnect" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}

