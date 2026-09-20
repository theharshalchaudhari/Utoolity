import { GsapButton } from "@/components/shared/Gsapbutton";
import { Logo } from "@/components/shared/Logo";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative isolate flex h-screen w-screen flex-col overflow-hidden bg-background font-sans text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-[13vh] z-0 w-full">
        <Image
          src="/interns.png"
          alt="Characters"
          width={1920}
          height={500}
          className="w-full"
          priority
        />
      </div>

      <Logo
        className="absolute left-20 top-10 z-20 scale-[3]"
        size={48}
      />

      <Link
        href="/dashboard"
        className="absolute right-10 top-10 z-20"
      >
        <GsapButton className="w-50 cursor-pointer border-3 bg-background p-8 text-2xl text-primary-foreground hover:text-background">
          Dashboard
        </GsapButton>
      </Link>

      <main className="relative z-10 flex flex-1 items-center justify-center">
        <div className="flex w-[900px] -translate-y-70 flex-col items-center text-center">
          <h1 className="m-0 w-full text-6xl font-bold leading-[1.1] tracking-normal text-foreground">
            Find your tools,
            <br />
            Rebuilt on network.
          </h1>

          <p className="m-0 mt-2 w-full text-2xl font-thin leading-[1.4] tracking-normal text-foreground">
            Connect with like-minded interns for fun,
            <br />
            friendship, and task completion.
          </p>
        </div>
      </main>
    </div>
  );
}