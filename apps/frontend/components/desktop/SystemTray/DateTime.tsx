
"use client";

import { useEffect, useState } from "react";
import {
  BatteryFull,
  Bell,
  ChevronLeft,
  ChevronRight,
  Expand,
  LockKeyhole,
  Moon,
  Sun,
  Waves,
  Wifi,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useUserPreference } from "../../../lib/user-preference";

type Props = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLock?: () => void;
};

type SettingProps = {
  icon: typeof Moon;
  title: string;
  value: string;
  active?: boolean;
  onClick: () => void;
};

type CalendarEvent = {
  title: string;
  subtitle: string;
  date: Date;
};

const calendarEvents: CalendarEvent[] = [
  {
    title: "Working on a YouTube Video",
    subtitle: "5 Oct 2026",
    date: new Date(2026, 9, 5),
  },
  {
    title: "Taking on new brand projects",
    subtitle: "October 2026 · Branding",
    date: new Date(2026, 9, 10),
  },
  {
    title: "Next journal article",
    subtitle: "October 2026 · Writing",
    date: new Date(2026, 9, 19),
  },
  {
    title: "Launched rohan kumar.pro",
    subtitle: "October 2026 · Website",
    date: new Date(2026, 9, 26),
  },
];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function Setting({
  icon: Icon,
  title,
  value,
  active = false,
  onClick,
}: SettingProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-16 min-w-0 items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors active:scale-[0.98] ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground hover:bg-accent"
      }`}
    >
      <Icon size={20} strokeWidth={1.9} className="shrink-0" />

      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-5">
          {title}
        </span>

        <span
          className={`mt-0.5 block text-xs leading-4 ${
            active
              ? "text-primary-foreground/80"
              : "text-muted-foreground"
          }`}
        >
          {value}
        </span>
      </span>
    </button>
  );
}

export default function DateTime({
  open,
  onToggle,
  onClose,
  onLock,
}: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [month, setMonth] = useState(() => new Date(2000, 0, 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date(2000, 0, 1));

  const [theme, setTheme] = useUserPreference<"auto" | "light" | "dark">(
    "utoolity.theme",
    "auto",
  );
  const darkMode =
    theme === "dark" ||
    (theme === "auto" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [animation, setAnimation] = useState(true);
  const [grain, setGrain] = useState(false);
  const [sound, setSound] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const update = () => setNow(new Date());

    update();
    setMonth(new Date());
    setSelectedDate(new Date());
    const timer = window.setInterval(update, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const update = () =>
      setFullscreen(Boolean(document.fullscreenElement));

    document.addEventListener("fullscreenchange", update);

    return () =>
      document.removeEventListener("fullscreenchange", update);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.classList.toggle("light", !darkMode);
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.dataset.animation = animation
      ? "on"
      : "off";
  }, [animation]);

  useEffect(() => {
    document.documentElement.dataset.grain = grain
      ? "on"
      : "off";
  }, [grain]);

  const calendarDays = (() => {
    const first = new Date(
      month.getFullYear(),
      month.getMonth(),
      1,
    );

    const offset = (first.getDay() + 6) % 7;

    const count = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();

    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: count }, (_, index) => index + 1),
    ];
  })();

  const monthLabel = month.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const changeMonth = (amount: number) => {
    setMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + amount,
          1,
        ),
    );
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Failed to toggle fullscreen:", error);
    }
  };

  const selectedEvents = calendarEvents.filter((event) =>
    sameDay(event.date, selectedDate),
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Date, time and quick settings"
        aria-expanded={open}
        className="flex h-10 items-center gap-2.5 rounded-full border border-border/70 bg-background/75 px-3.5 text-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-accent active:scale-[0.98]"
      >
        <span className="hidden text-sm font-semibold sm:inline">
          {now
            ? now.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            : "Loading"}
        </span>

        <span className="text-sm font-bold tabular-nums">
          {now ? formatTime(now) : "--:--"}
        </span>

        <Wifi size={16} className="shrink-0" />
        <BatteryFull size={16} className="shrink-0" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close quick settings"
            onClick={onClose}
            className="fixed inset-0 z-[85] cursor-default"
          />

          <section
            role="dialog"
            aria-label="Quick settings and calendar"
            className="absolute right-0 top-12 z-[86] max-h-[calc(100dvh-76px)] w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-3xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl shadow-black/20"
          >
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-4xl font-bold leading-none tracking-tight tabular-nums">
                  {now ? formatTime(now) : "--:--"}
                </h2>

                <p className="mt-2 text-base font-bold text-muted-foreground">
                  {now
                    ? now.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Loading date"}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close quick settings"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X size={18} />
              </button>
            </header>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Setting
                icon={darkMode ? Moon : Sun}
                title="Dark mode"
                value={darkMode ? "On" : "Off"}
                active={darkMode}
                onClick={() =>
                  setTheme(darkMode ? "light" : "dark")
                }
              />

              <Setting
                icon={Waves}
                title="Animation"
                value={animation ? "On" : "Off"}
                active={animation}
                onClick={() =>
                  setAnimation((value) => !value)
                }
              />

              <Setting
                icon={Waves}
                title="Grain"
                value={grain ? "On" : "Off"}
                active={grain}
                onClick={() => setGrain((value) => !value)}
              />

              <Setting
                icon={sound ? Volume2 : VolumeX}
                title="Sound"
                value={sound ? "On" : "Off"}
                active={sound}
                onClick={() => setSound((value) => !value)}
              />

              <Setting
                icon={LockKeyhole}
                title="Lock"
                value="Lock screen"
                onClick={() => {
                  onClose();
                  onLock?.();
                }}
              />

              <Setting
                icon={Expand}
                title="Full screen"
                value={fullscreen ? "On" : "Off"}
                active={fullscreen}
                onClick={() => void toggleFullscreen()}
              />

            </div>

            <section className="mt-4 rounded-2xl bg-muted p-3">
              <header className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold tracking-tight">
                  {monthLabel}
                </h3>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => changeMonth(-1)}
                    aria-label="Previous month"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    aria-label="Next month"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </header>

              <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
                {["M", "T", "W", "T", "F", "S", "S"].map(
                  (day, index) => (
                    <span
                      key={`${day}-${index}`}
                      className="py-1 text-xs font-semibold text-muted-foreground"
                    >
                      {day}
                    </span>
                  ),
                )}

                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return (
                      <span
                        key={`empty-${index}`}
                        className="aspect-square"
                      />
                    );
                  }

                  const date = new Date(
                    month.getFullYear(),
                    month.getMonth(),
                    day,
                  );

                  const selected = sameDay(date, selectedDate);
                  const today = now
                    ? sameDay(date, now)
                    : false;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      aria-pressed={selected}
                      aria-label={date.toLocaleDateString(undefined, {
                        dateStyle: "full",
                      })}
                      className={`relative mx-auto flex aspect-square w-full max-w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                        selected
                          ? "bg-primary font-bold text-primary-foreground"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      {day}

                      {today && !selected && (
                        <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-1">
                {selectedEvents.map((event) => (
                  <div
                    key={event.title}
                    className="flex items-start gap-3 rounded-xl px-2 py-2"
                  >
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />

                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-5">
                        {event.title}
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {event.subtitle}
                      </p>
                    </div>
                  </div>
                ))}

                {selectedEvents.length === 0 && (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    No events for this day.
                  </p>
                )}
              </div>
            </section>
          </section>
        </>
      )}
    </div>
  );
}
