import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  noStore();

  try {
    await getPrisma().$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        checks: {
          app: "ok",
          database: "ok",
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Health check failed.", error);

    return NextResponse.json(
      {
        status: "degraded",
        checks: {
          app: "ok",
          database: "error",
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
