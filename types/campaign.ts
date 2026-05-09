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
  status: CampaignStatus;
};
