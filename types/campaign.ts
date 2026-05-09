export type CampaignStatus = 'active' | 'funded' | 'expired' | 'settled';

export type Campaign = {
  id: string;
  title: string;
  description: string;
  image: string;
  targetParticipants: number;
  currentParticipants: number;
  price: number;
  deadline: number;
  sellerName: string;

  // Trust / reputation signals (optional demo metadata)
  sellerVerified?: boolean;
  sellerRating?: number; // 0..5
  sellerRatingsCount?: number;
  sellerSalesCount?: number;
  fulfillmentWindowDays?: number;

  status: CampaignStatus;
};
