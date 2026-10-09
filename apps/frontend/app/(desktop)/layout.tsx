import type { ReactNode } from "react";
import Desktop from "@/components/desktop/Desktop";

export default function DesktopLayout({ children }: { children: ReactNode }) {
  return <Desktop>{children}</Desktop>;
}
