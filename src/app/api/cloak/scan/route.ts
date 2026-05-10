import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { estimateCloakFee, usdcToRaw, rawToUsdc } from "@/lib/cloak";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user
      ? ((session.user as { id?: string }).id as string | undefined)
      : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all completed shielded donations for the creator's campaigns
    const donations = await prisma.donation.findMany({
      where: {
        provider: "cloak_shielded",
        status: "completed",
        campaign: {
          userId: userId
        }
      }
    });

    let totalGrossUsdcRaw = BigInt(0);
    let totalFeeUsdcRaw = BigInt(0);
    let totalNetUsdcRaw = BigInt(0);
    let donationsCount = 0;

    for (const d of donations) {
      const amountRaw = usdcToRaw(d.amount);
      const feeEstimate = estimateCloakFee(amountRaw);
      
      totalGrossUsdcRaw += amountRaw;
      totalFeeUsdcRaw += feeEstimate.fee;
      totalNetUsdcRaw += feeEstimate.net;
      donationsCount++;
    }

    return NextResponse.json({
      report: {
        totalGrossUsdc: rawToUsdc(totalGrossUsdcRaw),
        totalFeeUsdc: rawToUsdc(totalFeeUsdcRaw),
        totalNetUsdc: rawToUsdc(totalNetUsdcRaw),
        donationsCount
      }
    });

  } catch (error: any) {
    console.error("[Cloak Scan Error]", error);
    return NextResponse.json({ error: "Failed to generate compliance report" }, { status: 500 });
  }
}
