export type CampaignSeed = {
  id: number;
  slug: string;
  title: string;
  creator: string;
  creatorInitials: string;
  raised: number;
  goal: number;
  category: string;
  desc: string;
  backers: number;
  daysLeft: number;
  verified: boolean;
  status: "active" | "completed" | "draft";
};

export const CAMPAIGN_SEEDS: Record<string, CampaignSeed> = {
  "1": {
    id: 1,
    slug: "1",
    title: "SolarPack Mini — Off-grid power for remote communities",
    creator: "Tunde Coker",
    creatorInitials: "TC",
    raised: 68420,
    goal: 100000,
    category: "Technology",
    desc: "A portable, affordable solar generator for small businesses in West Africa.",
    backers: 1240,
    daysLeft: 14,
    verified: true,
    status: "active",
  },
  "2": {
    id: 2,
    slug: "2",
    title: "Clean Water for Kano",
    creator: "Aisha Malik",
    creatorInitials: "AM",
    raised: 24800,
    goal: 50000,
    category: "Social Impact",
    desc: "Building 50 solar-powered boreholes to provide clean drinking water.",
    backers: 480,
    daysLeft: 21,
    verified: true,
    status: "active",
  },
  "3": {
    id: 3,
    slug: "3",
    title: "Tech Start: Lagos",
    creator: "Chidi Nweke",
    creatorInitials: "CN",
    raised: 15000,
    goal: 100000,
    category: "Education",
    desc: "Funding laptops and coding bootcamps for underserved youths.",
    backers: 312,
    daysLeft: 30,
    verified: false,
    status: "active",
  },
  "4": {
    id: 4,
    slug: "4",
    title: "Rural Clinic Solar",
    creator: "Dr. Santos",
    creatorInitials: "DS",
    raised: 8200,
    goal: 15000,
    category: "Health",
    desc: "Installing solar panels to keep vaccines refrigerated at our rural clinic.",
    backers: 195,
    daysLeft: 18,
    verified: true,
    status: "active",
  },
};

export const CAMPAIGN_SEED_LIST = Object.values(CAMPAIGN_SEEDS);

export function getCampaignPct(raised: number, goal: number) {
  return goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;
}
