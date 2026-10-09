import Lockcard from "@/components/lockscreen/lockcard";
import { GsapButton } from "@/components/shared/Gsapbutton";
import { Logo } from "@/components/shared/Logo";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative isolate flex h-screen w-screen flex-col overflow-hidden bg-background font-sans text-foreground">
      <Lockcard socketDisconnected={false} />
    </div>
  );
}