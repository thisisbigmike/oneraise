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
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, image: true },
      })
    : null;
  const name = dbUser?.name || session.user.name || '';
  const email = dbUser?.email || session.user.email || '';
  const image = dbUser?.image || session.user.image || '';

  return (
    <SettingsClient 
      initialName={name}
      initialEmail={email}
      initialImage={image}
      role={role}
    />
  );
}
