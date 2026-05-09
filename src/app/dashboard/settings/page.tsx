import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import SettingsClient from "./SettingsClient";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth');
  }

  const role = (session.user as any).role || 'creator';
  const userId = (session.user as any).id as string | undefined;
  const dbUser = userId
    ? await (prisma.user as any).findUnique({
        where: { id: userId },
        select: { 
          name: true, 
          email: true, 
          image: true,
          emailNotifications: true,
          pushNotifications: true,
          campaignUpdates: true,
          marketingEmails: true
        },
      })
    : null;
  const name = dbUser?.name || session.user.name || '';
  const email = dbUser?.email || session.user.email || '';
  const image = dbUser?.image || session.user.image || '';
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
      initialEmailNotif={emailNotifications}
      initialPushNotif={pushNotifications}
      initialCampaignNotif={campaignUpdates}
      initialMarketingNotif={marketingEmails}
    />
  );
}
