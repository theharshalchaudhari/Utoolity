import { hostname } from "node:os";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deviceHostname = hostname();

export function GET() {
  return NextResponse.json(
    { hostname: deviceHostname },
    {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}