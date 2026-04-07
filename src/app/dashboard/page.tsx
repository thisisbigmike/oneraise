import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import prisma from "../../lib/prisma";
import DashboardClient from "./DashboardClient";
import { redirect } from "next/navigation";
import { getCreatorPayoutSummary } from "@/lib/payment-records";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth');
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role || 'creator';
  const firstName = session.user.name?.split(' ')[0] || (role === 'creator' ? 'Creator' : 'Backer');

  let totalRaised = 0;
  let totalBackers = 0;
  let recentDonations: any[] = [];
  let availablePayout = 0;
  let campaignCount = 0;

  if (role === 'creator') {
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      include: {
        donations: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    campaignCount = campaigns.length;
    
    let allDonations: any[] = [];
    let uniqueBackers = new Set();
    
    campaigns.forEach(c => {
      totalRaised += c.raised;
      c.donations.forEach(d => {
        allDonations.push(d);
        if (d.userId) {
          uniqueBackers.add(d.userId);
        } else if (d.donorEmail) {
          uniqueBackers.add(d.donorEmail);
        } else if (d.donorName) {
          uniqueBackers.add(d.donorName);
        } else {
          // completely anonymous
          uniqueBackers.add(d.id); 
        }
      });
    });

    totalBackers = uniqueBackers.size;
    allDonations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    recentDonations = allDonations.slice(0, 5);
    const payoutSummary = await getCreatorPayoutSummary(userId);
    availablePayout = payoutSummary.availableBalance;
  } else {
    // Backer dashboard
    if (userId) {
      const donations = await prisma.donation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: true
        }
      });

      totalRaised = donations.reduce((sum, d) => sum + d.amount, 0); 
      let uniqueCampaigns = new Set(donations.map(d => d.campaignId));
      totalBackers = uniqueCampaigns.size; 
      
      // format recent donations so the client handles them correctly
      recentDonations = donations.slice(0, 5).map(d => ({
        ...d,
        donorName: d.campaign.title, // show campaign title as "name" for backer view
        donorMessage: d.status === 'completed' ? 'Donation successful' : `Status: ${d.status}`
      }));
    }
  }

  return (
    <DashboardClient 
      firstName={firstName}
      role={role}
      totalRaised={totalRaised}
      totalBackers={totalBackers}
      recentDonations={JSON.parse(JSON.stringify(recentDonations))} // serialize dates
      availablePayout={availablePayout}
      campaignCount={campaignCount}
    />
  );
}
