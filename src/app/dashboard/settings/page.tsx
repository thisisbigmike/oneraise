import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import SettingsClient from "./SettingsClient";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

type SettingsUser = {
  name: string | null;
  email: string | null;
  image: string | null;
  role: string | null;
  kycStatus: string | null;
  emailVerified: Date | null;
  emailNotifications: boolean;
  pushNotifications: boolean;
  campaignUpdates: boolean;
  marketingEmails: boolean;
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth');
  }

  const sessionUser = session.user as { id?: string; role?: string | null };
  const userId = sessionUser.id;
  const role = sessionUser.role || 'creator';
  let dbUser: SettingsUser | null = null;
  try {
    dbUser = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: {
            name: true,
            email: true,
            image: true,
            role: true,
            kycStatus: true,
            emailVerified: true,
            emailNotifications: true,
            pushNotifications: true,
            campaignUpdates: true,
            marketingEmails: true
          },
        })
      : null;
  } catch (error) {
    console.error('Database error in DashboardSettingsPage:', error);
  }
  const name = dbUser?.name || session.user.name || '';
  const email = dbUser?.email || session.user.email || '';
  const image = dbUser?.image || session.user.image || '';
  const verificationStatus = dbUser?.kycStatus || 'unverified';
  const emailVerified = !!dbUser?.emailVerified;
  const emailNotifications = dbUser?.emailNotifications ?? true;
  const pushNotifications = dbUser?.pushNotifications ?? true;
  const campaignUpdates = dbUser?.campaignUpdates ?? true;
  const marketingEmails = dbUser?.marketingEmails ?? false;

  return (
    <SettingsClient
      initialName={name}
      initialEmail={email}
      initialImage={image}
      role={role}
      initialVerificationStatus={verificationStatus}
      initialEmailVerified={emailVerified}
      initialEmailNotif={emailNotifications}
      initialPushNotif={pushNotifications}
      initialCampaignNotif={campaignUpdates}
      initialMarketingNotif={marketingEmails}
    />
  );
}
