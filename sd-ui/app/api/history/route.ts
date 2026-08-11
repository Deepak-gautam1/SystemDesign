import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { loadHistory, deleteHistory } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = await auth().then(s => s?.user?.id).catch(() => undefined);
  if (!userId) return NextResponse.json({ messages: [], attemptId: null });

  const topicId = req.nextUrl.searchParams.get("topicId");
  const mode    = req.nextUrl.searchParams.get("mode");
  // Absent/empty attemptId means "whatever my latest attempt is" — the client
  // sends nothing on a fresh browser or after signing back in.
  const raw       = req.nextUrl.searchParams.get("attemptId");
  const attemptId = raw && raw.trim() ? raw : undefined;
  if (!topicId || !mode) return NextResponse.json({ messages: [], attemptId: null });

  const { messages, attemptId: loaded } = await loadHistory(userId, topicId, mode, attemptId);
  return NextResponse.json({ messages, attemptId: loaded });
}

// Permanent delete — removes every saved attempt for this topic+mode. Scoped
// to the verified session user, so it can only ever delete the caller's own rows.
export async function DELETE(req: NextRequest) {
  const userId = await auth().then(s => s?.user?.id).catch(() => undefined);
  if (!userId) return NextResponse.json({ deleted: 0, signedIn: false }, { status: 401 });

  const topicId = req.nextUrl.searchParams.get("topicId");
  const mode    = req.nextUrl.searchParams.get("mode");
  if (!topicId || !mode) {
    return NextResponse.json({ error: "topicId and mode required" }, { status: 400 });
  }

  try {
    const deleted = await deleteHistory(userId, topicId, mode);
    return NextResponse.json({ deleted, signedIn: true });
  } catch (err) {
    console.error("history delete failed:", err);
    return NextResponse.json({ error: "delete failed" }, { status: 500 });
  }
}
