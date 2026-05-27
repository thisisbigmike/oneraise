import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

function getSessionUser(session: unknown) {
  if (!session || typeof session !== "object" || !("user" in session)) return {};
  return (session as { user?: any }).user ?? {};
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = getSessionUser(session);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = 50;

    const where: any = {};
    if (role && role !== "all") where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          bushaStatus: true,
          emailNotifications: true,
          _count: {
            select: {
              campaigns: true,
              donations: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      users: users.map(u => ({
        id: u.id,
        name: u.name || "—",
        email: u.email || "—",
        role: u.role || "backer",
        image: u.image,
        bushaStatus: u.bushaStatus || "unverified",
        campaignCount: u._count.campaigns,
        donationCount: u._count.donations,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("admin/users GET error", error);
    return NextResponse.json({ error: "Unable to load users." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = getSessionUser(session);
    if (sessionUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { userId, action, role } = await req.json();
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId required." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (action === "set-role") {
      const allowed = ["creator", "backer", "admin"];
      if (!allowed.includes(role)) {
        return NextResponse.json({ error: `Role must be one of: ${allowed.join(", ")}.` }, { status: 400 });
      }
      const updated = await prisma.user.update({ where: { id: userId }, data: { role } });
      revalidatePath("/admin/users");
      return NextResponse.json({ success: true, user: { id: updated.id, role: updated.role } });
    }

    if (action === "ban") {
      // Mark banned by setting a sentinel role value
      const updated = await prisma.user.update({ where: { id: userId }, data: { role: "banned" } });
      revalidatePath("/admin/users");
      return NextResponse.json({ success: true, user: { id: updated.id, role: updated.role } });
    }

    if (action === "unban") {
      const updated = await prisma.user.update({ where: { id: userId }, data: { role: "backer" } });
      revalidatePath("/admin/users");
      return NextResponse.json({ success: true, user: { id: updated.id, role: updated.role } });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("admin/users PATCH error", error);
    return NextResponse.json({ error: "Unable to update user." }, { status: 500 });
  }
}
