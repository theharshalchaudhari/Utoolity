import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

import { THEME_BOOTSTRAP } from "@/components/shared/ThemeToggle";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Utoolity",
  description: "Your utility application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/*
          Applies the saved theme before the first paint, so the page never
          flashes the light palette on its way to dark.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className=" bg-background min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
