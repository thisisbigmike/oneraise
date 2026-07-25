import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

type Params = {
  fileName: string;
};

export async function GET(req: NextRequest, props: { params: Promise<Params> }) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string; role?: string } | undefined;

    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawFileName = params.fileName;
    if (!rawFileName) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }

    // Sanitize path to prevent directory traversal
    const safeFileName = path.basename(rawFileName);
    if (safeFileName !== rawFileName || rawFileName.includes("..")) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }

    const isAdmin = sessionUser.role === "admin";

    if (!isAdmin) {
      // Non-admins may only view their own verification document
      const user = await prisma.user.findFirst({
        where: {
          id: sessionUser.id,
          verificationIdImage: {
            contains: safeFileName,
          },
        },
        select: { id: true },
      });

      if (!user) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const filePath = path.join(process.cwd(), "private_uploads", "verification", safeFileName);
    const ext = path.extname(safeFileName).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    try {
      const fileBuffer = await readFile(filePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, no-store, max-age=0, must-revalidate",
          "CDN-Cache-Control": "no-store",
          "Cloudflare-CDN-Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "ENOENT") {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      throw err;
    }
  } catch (error) {
    console.error("Error serving verification document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
