import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { storeVerificationDocumentDataUrl } from "@/lib/verification-storage";

const VALID_DOCUMENT_TYPES = ["account_proof", "organization_document", "campaign_document", "other"];

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user ? (session.user as { id?: string }).id : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycStatus: true, emailVerified: true },
  });

  return NextResponse.json({
    success: true,
    verificationStatus: user?.kycStatus || "unverified",
    emailVerified: !!user?.emailVerified,
    verifiedBadge: user?.kycStatus === "verified" && !!user?.emailVerified,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycStatus: true },
  });

  if (user?.kycStatus === "verified") {
    return NextResponse.json({ error: "Account is already verified." }, { status: 400 });
  }
  if (user?.kycStatus === "pending") {
    return NextResponse.json({ error: "Verification is already under review." }, { status: 400 });
  }

  let body: { fullName?: string; documentType?: string; documentImage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const fullName = body.fullName;
  const documentType = body.documentType;
  const documentImage = body.documentImage;

  if (!fullName?.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!VALID_DOCUMENT_TYPES.includes(documentType ?? "")) {
    return NextResponse.json({ error: "Invalid verification document type." }, { status: 400 });
  }

  let documentUrl: string;
  try {
    documentUrl = await storeVerificationDocumentDataUrl(userId, documentImage || "");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid verification document." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus: "pending",
      verificationFullName: fullName.trim(),
      verificationIdType: documentType,
      verificationIdImage: documentUrl,
    },
  });

  return NextResponse.json({ success: true });
}
