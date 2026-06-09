import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

type SessionUser = {
  id?: string;
  role?: string | null;
};

function getSessionUser(session: unknown) {
  if (!session || typeof session !== "object" || !("user" in session)) return {};
  return ((session as { user?: unknown }).user as SessionUser | undefined) ?? {};
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
    const verification = searchParams.get("verification") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = 50;

    const where: Prisma.UserWhereInput = {};
    if (role && role !== "all") where.role = role;
    if (verification && verification !== "all") where.kycStatus = verification;
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
          kycStatus: true,
          emailVerified: true,
          verificationFullName: true,
          verificationIdType: true,
          verificationIdImage: true,
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
        verificationStatus: u.kycStatus || "unverified",
        emailVerified: !!u.emailVerified,
        verificationFullName: u.verificationFullName,
        verificationDocumentType: u.verificationIdType,
        verificationDocumentUrl: u.verificationIdImage,
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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = getSessionUser(session);
    if (sessionUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { name, email, role, password } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const parsedName = String(name || "").trim();
    const parsedRole = String(role || "backer").trim();
    const parsedPassword = String(password || "").trim();
    const allowedRoles = ["creator", "backer", "admin"];

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (!parsedName) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!allowedRoles.includes(parsedRole)) {
      return NextResponse.json({ error: `Role must be one of: ${allowedRoles.join(", ")}.` }, { status: 400 });
    }
    if (parsedPassword && parsedPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name: parsedName,
        email: normalizedEmail,
        role: parsedRole,
        password: parsedPassword ? await bcrypt.hash(parsedPassword, 10) : null,
        kycStatus: "unverified",
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin");

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("admin/users POST error", error);
    return NextResponse.json({ error: "Unable to create user." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = getSessionUser(session);
    if (sessionUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { userId, action, role, verificationStatus } = await req.json();
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId required." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        _count: {
          select: {
            campaigns: true,
            donations: true,
            payouts: true,
          },
        },
      },
    });
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

    if (action === "set-verification") {
      const allowed = ["unverified", "pending", "verified", "rejected"];
      if (!allowed.includes(verificationStatus)) {
        return NextResponse.json({ error: `Verification status must be one of: ${allowed.join(", ")}.` }, { status: 400 });
      }
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: verificationStatus,
        },
      });
      revalidatePath("/admin/users");
      revalidatePath("/admin");
      return NextResponse.json({ success: true, user: { id: updated.id, verificationStatus: updated.kycStatus } });
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

    if (action === "delete") {
      if (sessionUser.id === userId) {
        return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
      }
      const hasFinancialHistory = target._count.donations > 0 || target._count.payouts > 0 || target._count.campaigns > 0;
      if (hasFinancialHistory) {
        return NextResponse.json(
          { error: "This user has campaigns, donations, or payouts. Ban the account instead to preserve records." },
          { status: 409 },
        );
      }
      await prisma.user.delete({ where: { id: userId } });
      revalidatePath("/admin/users");
      revalidatePath("/admin");
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("admin/users PATCH error", error);
    return NextResponse.json({ error: "Unable to update user." }, { status: 500 });
  }
}
