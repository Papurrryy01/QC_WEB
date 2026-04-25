import { NextRequest, NextResponse } from "next/server";
import { processDueMoments } from "@/lib/processDueMoments";

function isAuthorized(req: NextRequest) {
  const cronHeader = req.headers.get("x-vercel-cron");
  if (cronHeader) return true;

  const expectedSecret = process.env.CRON_SECRET?.trim();
  if (!expectedSecret) return false;

  return req.headers.get("authorization") === `Bearer ${expectedSecret}`;
}

function getSiteBaseUrl(req: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(req.url).origin
  );
}

async function handleProcess(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueMoments({
      siteBaseUrl: getSiteBaseUrl(req),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not process due moments." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleProcess(req);
}

export async function POST(req: NextRequest) {
  return handleProcess(req);
}
