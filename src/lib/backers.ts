export type DonationBackerIdentity = {
  id?: string | null;
  userId?: string | null;
  donorEmail?: string | null;
  donorName?: string | null;
};

function normalizeIdentity(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

export function getDonationBackerKey(donation: DonationBackerIdentity) {
  const userId = normalizeIdentity(donation.userId);
  if (userId) return `user:${userId}`;

  const donorEmail = normalizeIdentity(donation.donorEmail);
  if (donorEmail) return `email:${donorEmail}`;

  const donorName = normalizeIdentity(donation.donorName);
  if (donorName) return `name:${donorName}`;

  const donationId = normalizeIdentity(donation.id);
  return donationId ? `donation:${donationId}` : null;
}

export function getUniqueBackerCount(donations: DonationBackerIdentity[]) {
  const backers = new Set<string>();

  donations.forEach((donation) => {
    const key = getDonationBackerKey(donation);
    if (key) backers.add(key);
  });

  return backers.size;
}
