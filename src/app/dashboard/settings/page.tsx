import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import SettingsClient from "./SettingsClient";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth');
  }

  const role = (session.user as any).role || 'creator';
  const name = session.user.name || '';
  const email = session.user.email || '';

  return (
    <SettingsClient 
      initialName={name}
      initialEmail={email}
      role={role}
    />
  );
}
