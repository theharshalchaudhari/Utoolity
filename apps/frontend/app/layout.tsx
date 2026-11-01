import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DEFAULT_WALLPAPER_ID, getWallpaper, WALLPAPER_STORAGE_KEY } from "@/lib/wallpapers";
import { Nunito } from "next/font/google";
import { TooltipProvider } from "@repo/ui/shadcn/tooltip";
import Sidebar from "@/components/shared/Sidebar";
import DeviceTheme from "@/components/shared/DeviceTheme";
import BrowserGuards from "@/components/shared/BrowserGuards";
import CustomCursor from "@/components/shared/CustomCursor";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialWallpaperId = getWallpaper(
    cookieStore.get(WALLPAPER_STORAGE_KEY)?.value ?? DEFAULT_WALLPAPER_ID,
  ).id;
  const themeCookie = cookieStore.get("utoolity.theme")?.value;
  const initialTheme = themeCookie === "dark" ? "dark" : "light";

  return (
    <html
      lang="en"
      className={`${nunito.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background min-h-full font-sans overscroll-none">
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const saved = localStorage.getItem("utoolity.theme");
                const theme = saved === "dark" || saved === "light"
                  ? saved
                  : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
                const root = document.documentElement;
                root.classList.toggle("dark", theme === "dark");
                root.classList.toggle("light", theme === "light");
                root.style.colorScheme = theme;
              } catch {}
            })();`,
          }}
        />
        <DeviceTheme />
        <CustomCursor />
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
