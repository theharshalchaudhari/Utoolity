import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { TooltipProvider } from "@repo/ui/shadcn/tooltip";
import Sidebar from "@/components/shared/Sidebar";
import DeviceTheme from "@/components/shared/DeviceTheme";
import BrowserGuards from "@/components/shared/BrowserGuards";
import "./globals.css";

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
    <html
      lang="en"
      className={`${nunito.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background min-h-full font-sans overscroll-none">
        <DeviceTheme />
        <BrowserGuards />
        <TooltipProvider delayDuration={200}>
          <div className="flex min-h-screen">
            {/* <Sidebar /> */}

            <main className="min-w-0 flex-1">
              {children}
            </main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}