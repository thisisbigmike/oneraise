import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as any).id as string) : null;

    if (!userId) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedRole =
      body?.role === "creator" || body?.role === "backer" ? body.role : null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.role === "creator" || user.role === "backer") {
      return NextResponse.json({
        success: true,
        role: user.role,
        conflict: requestedRole ? user.role !== requestedRole : false,
      });
    }

    if (!requestedRole) {
      return NextResponse.json(
        { error: "Choose whether you are signing up as a creator or donor first." },
        { status: 400 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: requestedRole,
        email: user.email?.trim().toLowerCase() || null,
      },
      select: {
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      role: updatedUser.role,
      conflict: false,
    });
  } catch (error: any) {
    console.error("OAuth role completion error:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to complete social sign in." },
      { status: 500 },
    );
  }
}
