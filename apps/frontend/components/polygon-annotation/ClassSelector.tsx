"use client";

/**
 * The ROI class for new shapes, and for the selected one.
 *
 * Classes are the web tool's addition — the desktop app records every region
 * as "roi". A batch that only ever uses the default class writes exactly the
 * files the desktop app writes, so this stays out of the way until used.
 */

import { useState } from "react";

import { DEFAULT_CLASS } from "@repo/roi-core";
import { Button } from "@repo/ui/shadcn/button";
import { Input } from "@repo/ui/shadcn/input";

export interface ClassSelectorProps {
  classes: string[];
  active: string;
  onActiveChange: (name: string) => void;
  onAddClass: (name: string) => void;
}

export default function ClassSelector({
  classes,
  active,
  onActiveChange,
  onAddClass,
}: ClassSelectorProps) {
  const [draft, setDraft] = useState("");

  const add = (): void => {
    const name = draft.trim();
    if (!name) return;
    onAddClass(name);
    onActiveChange(name);
    setDraft("");
  };

  return (
    <section className="border-border bg-card space-y-3 rounded-lg border p-3">
      <h3 className="text-foreground text-sm font-semibold">Class</h3>

      <div className="flex flex-wrap gap-1.5">
        {classes.map((name) => (
          <Button
            key={name}
            size="xs"
            variant={name === active ? "default" : "outline"}
            aria-pressed={name === active}
            onClick={() => onActiveChange(name)}
          >
            {name}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder="Add a class…"
          aria-label="New class name"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button size="sm" variant="outline" disabled={!draft.trim()} onClick={add}>
          Add
        </Button>
      </div>

      {active !== DEFAULT_CLASS && (
        <p className="text-muted-foreground text-xs">
          Using a class other than <code>{DEFAULT_CLASS}</code> adds a{" "}
          <code>shape_classes</code> column. The desktop app ignores it.
        </p>
      )}
    </section>
  );
}
