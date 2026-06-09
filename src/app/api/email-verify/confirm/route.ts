import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  const params = new URLSearchParams();

  const redirect = (path: string, result: string) => {
    params.set("emailVerified", result);
    return NextResponse.redirect(new URL(`${path}?${params.toString()}`, url));
  };

  if (!token || !email) return redirect("/dashboard/settings", "invalid");

  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record || record.identifier.toLowerCase() !== email || record.expires < new Date()) {
    return redirect("/dashboard/settings", "invalid");
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  const settingsPath = user?.role === "backer" ? "/backer/settings" : "/dashboard/settings";

  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
  ]);

  return redirect(settingsPath, "success");
}
