import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return session?.user ? ((session.user as any).id as string) : null;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json();
  const method = await prisma.payoutMethod.findFirst({
    where: { id, userId },
  });

  if (!method) {
    return NextResponse.json({ error: "Payout method not found." }, { status: 404 });
  }

  if (body.makePrimary) {
    await prisma.payoutMethod.updateMany({
      where: { userId },
      data: { isPrimary: false },
    });
  }

  const updated = await prisma.payoutMethod.update({
    where: { id },
    data: {
      isPrimary: body.makePrimary === true ? true : method.isPrimary,
    },
  });

  return NextResponse.json({ success: true, method: updated });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const method = await prisma.payoutMethod.findFirst({
    where: { id, userId },
  });

  if (!method) {
    return NextResponse.json({ error: "Payout method not found." }, { status: 404 });
  }

  await prisma.payoutMethod.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
