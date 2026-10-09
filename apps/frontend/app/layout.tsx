import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { TooltipProvider } from "@repo/ui/shadcn/tooltip";
import Sidebar from "@/components/shared/Sidebar";
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
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="bg-background min-h-full font-sans overscroll-none">
        <TooltipProvider delayDuration={200}>
          <div className="flex min-h-screen">
            {/* <Sidebar /> */}

            <main className="min-w-0 flex-1">
              {children}
            </main>
          </div>
        </TooltipProvider>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const preventBrowserZoom = (event) => {
                  if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                  }
                };

                const preventKeyboardZoom = (event) => {
                  if (
                    (event.ctrlKey || event.metaKey) &&
                    ["+", "-", "=", "0"].includes(event.key)
                  ) {
                    event.preventDefault();
                  }
                };

                window.addEventListener(
                  "wheel",
                  preventBrowserZoom,
                  { passive: false }
                );

                window.addEventListener(
                  "keydown",
                  preventKeyboardZoom
                );

                window.addEventListener("beforeunload", () => {
                  window.removeEventListener(
                    "wheel",
                    preventBrowserZoom
                  );

                  window.removeEventListener(
                    "keydown",
                    preventKeyboardZoom
                  );
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}