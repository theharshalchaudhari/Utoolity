"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";

const Sidebar = () => {
  const pathname = usePathname();

  const activeIndex =
    pathname === "/task1" ? 0 :
    pathname === "/task2" ? 1 :
    pathname === "/task3" ? 2 :
    pathname === "/task4" ? 3 :
    pathname === "/task5" ? 4 :
    pathname === "/task6" ? 5 :
    pathname === "/task7" ? 6 :
    pathname === "/task8" ? 7 :
    -1;

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="fixed top-6 bottom-6 left-4 z-50 flex w-19 flex-col items-center overflow-visible rounded-full bg-foreground shadow-[0_10px_40px_rgba(0,0,0,0.15)]">

      <nav className="relative flex w-full flex-col items-center">

        {activeIndex !== -1 && (
          <div
            className="pointer-events-none absolute top-0 left-0 z-0 h-14 w-full rounded-r-[28px] bg-background transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]"
            style={{
              transform: `translateY(${activeIndex * 56}px)`,
            }}
          >
            <div className="absolute -top-4.5 right-0 h-9 w-9 rounded-br-[36px] bg-foreground" />

            <div className="absolute -bottom-4.5 right-0 h-9 w-9 rounded-tr-[36px] bg-foreground" />
          </div>
        )}

        <Link href="/task1" className="relative z-10 flex h-14 w-19 items-center justify-center">
          <Icon name="Icon1" size={23} className={isActive("/task1") ? "text-foreground" : "text-background"} />
        </Link>

        <Link href="/task2" className="relative z-10 flex h-14 w-19 items-center justify-center">
          <Icon name="Icon1" size={23} className={isActive("/task2") ? "text-foreground" : "text-background"} />
        </Link>

        <Link href="/task3" className="relative z-10 flex h-14 w-19 items-center justify-center">
          <Icon name="Icon1" size={23} className={isActive("/task3") ? "text-foreground" : "text-background"} />
        </Link>

        <Link href="/task4" className="relative z-10 flex h-14 w-19 items-center justify-center">
          <Icon name="Icon1" size={23} className={isActive("/task4") ? "text-foreground" : "text-background"} />
        </Link>

        <Link href="/task5" className="relative z-10 flex h-14 w-19 items-center justify-center">
          <Icon name="Icon1" size={23} className={isActive("/task5") ? "text-foreground" : "text-background"} />
        </Link>

        <Link href="/task6" className="relative z-10 flex h-14 w-19 items-center justify-center">
          <Icon name="Icon1" size={23} className={isActive("/task6") ? "text-foreground" : "text-background"} />
        </Link>

        <Link href="/task7" className="relative z-10 flex h-14 w-19 items-center justify-center">
          <Icon name="Icon1" size={23} className={isActive("/task7") ? "text-foreground" : "text-background"} />
        </Link>

        <Link href="/task8" className="relative z-10 flex h-14 w-19 items-center justify-center">
          <Icon name="Icon1" size={23} className={isActive("/task8") ? "text-foreground" : "text-background"} />
        </Link>

      </nav>
    </aside>
  );
};

export default Sidebar;