import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const MAX_PROFILE_IMAGE_DATA_URL_LENGTH = 3 * 1024 * 1024;

function parseProfileImage(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error("Profile image must be a valid image URL.");
  }

  const image = value.trim();
  if (!image) return null;
  if (image.length > MAX_PROFILE_IMAGE_DATA_URL_LENGTH) {
    throw new Error("Profile image is too large. Please upload an image under 2MB.");
  }
  if (!image.startsWith("data:image/") && !image.startsWith("/") && !image.startsWith("https://")) {
    throw new Error("Profile image must be a valid image URL.");
  }

  return image;
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? ((session.user as { id?: string }).id) : null;

    if (!userId) {
      return NextResponse.json({ error: "Please sign in to update your profile." }, { status: 401 });
    }

    const { name, email, image } = await req.json();
    const parsedImage = parseProfileImage(image);
    const parsedName = typeof name === "string" ? name.trim() : "";
    const parsedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!parsedName) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    if (!parsedEmail || !parsedEmail.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: parsedName,
        email: parsedEmail,
        ...(parsedImage !== undefined ? { image: parsedImage } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    const message = error instanceof Error ? error.message : "Unable to update profile.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
