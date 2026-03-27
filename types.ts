// Type Definitions - Synced
export interface UserConfig {
  username: string;
  apifyToken?: string;
  isLiteMode: boolean;
}

export interface Competitor {
  username: string;
  monetizationMethod: string;
}

export interface InstagramLead {
  username: string;
  fullName?: string;
  handle: string;
  niche: string;
  followers: number;
  dailyWeeklySplit: string;
  topFormat: 'Reels' | 'Carousels' | 'Mixed';
  estRevenueGap: number;
  email: string;
  bio: string;
  profilePic?: string;
  engagementRate?: number;
  isAiGenerated?: boolean;
  externalUrl?: string;
  suggestedProduct?: {
    name: string;
    type: string;
    description: string;
  };
  competitors?: Competitor[];
  groundingSources?: string[];
}