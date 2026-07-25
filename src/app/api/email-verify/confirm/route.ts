import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();

  const redirect = (result: string) => {
    const params = new URLSearchParams();
    params.set("mode", "signin");
    params.set("verified", result);
    if (email) params.set("email", email);
    return NextResponse.redirect(new URL(`/auth?${params.toString()}`, url));
  };

  if (!token || !email) return redirect("invalid");

  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record || record.identifier.toLowerCase() !== email) {
    return redirect("invalid");
  }

  if (record.expires < new Date()) {
    return redirect("expired");
  }

  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
  ]);

  return redirect("success");
}
