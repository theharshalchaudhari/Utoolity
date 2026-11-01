import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DEFAULT_WALLPAPER_ID, WALLPAPER_STORAGE_KEY } from "@/lib/wallpapers";
import { Nunito } from "next/font/google";
import { TooltipProvider } from "@repo/ui/shadcn/tooltip";
import Sidebar from "@/components/shared/Sidebar";
import DeviceTheme from "@/components/shared/DeviceTheme";
import BrowserGuards from "@/components/shared/BrowserGuards";
import CustomCursor from "@/components/shared/CustomCursor";
import { InitialDesktopPreferencesProvider } from "@/components/shared/InitialDesktopPreferences";
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
  const initialWallpaperId =
    cookieStore.get(WALLPAPER_STORAGE_KEY)?.value ?? DEFAULT_WALLPAPER_ID;
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
                const root = document.documentElement;
                const wallpaperKey = "utoolity.wallpaper";
                const wallpaperCookie = document.cookie
                  .split("; ")
                  .find((value) => value.startsWith(wallpaperKey + "="))
                  ?.slice(wallpaperKey.length + 1);
                const savedWallpaper = localStorage.getItem(wallpaperKey);
                const wallpaper = savedWallpaper || wallpaperCookie;
                if (wallpaper) {
                  document.cookie = wallpaperKey + "=" + encodeURIComponent(wallpaper) + "; Path=/; Max-Age=31536000; SameSite=Lax";
                }

                const saved = localStorage.getItem("utoolity.theme");
                const themeCookie = document.cookie
                  .split("; ")
                  .find((value) => value.startsWith("utoolity.theme="))
                  ?.slice("utoolity.theme=".length);
                const theme = saved === "dark" || saved === "light"
                  ? saved
                  : themeCookie === "dark" || themeCookie === "light"
                    ? themeCookie
                    : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
                root.classList.toggle("dark", theme === "dark");
                root.classList.toggle("light", theme === "light");
                root.style.colorScheme = theme;
                document.cookie = "utoolity.theme=" + theme + "; Path=/; Max-Age=31536000; SameSite=Lax";
              } catch {}
            })();`,
          }}
        />
        <DeviceTheme />
        <CustomCursor />
        <BrowserGuards />
        <TooltipProvider delayDuration={200}>
          <InitialDesktopPreferencesProvider
            value={{ wallpaperId: initialWallpaperId, theme: initialTheme }}
          >
            <div className="flex min-h-screen">
              {/* <Sidebar /> */}

              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </InitialDesktopPreferencesProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
