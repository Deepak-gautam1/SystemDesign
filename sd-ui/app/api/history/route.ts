import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { loadHistory } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = await auth().then(s => s?.user?.id).catch(() => undefined);
  if (!userId) return NextResponse.json({ messages: [] });

  const topicId = req.nextUrl.searchParams.get("topicId");
  const mode    = req.nextUrl.searchParams.get("mode");
  if (!topicId || !mode) return NextResponse.json({ messages: [] });

  const messages = await loadHistory(userId, topicId, mode);
  return NextResponse.json({ messages });
}
