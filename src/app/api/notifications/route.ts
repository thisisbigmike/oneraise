import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

type SessionUser = { id?: string };

function getSessionUser(session: unknown): SessionUser {
  if (!session || typeof session !== "object" || !("user" in session)) return {};
  return ((session as { user?: unknown }).user as SessionUser | undefined) ?? {};
}

/** Mark a single notification (`{ id }`) or all (`{ all: true }`) as read. */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getSessionUser(session).id;
    if (!userId) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const { id, all } = await req.json().catch(() => ({}));

    if (all === true) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Notification id is required." }, { status: 400 });
    }

    // Scope the update to the owner so users can't flip others' rows.
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Mark notification read error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update notification." },
      { status: 500 },
    );
  }
}
