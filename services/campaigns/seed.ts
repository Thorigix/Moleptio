import { Campaign } from '@/types/campaign';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

export const SEED_CAMPAIGNS: Campaign[] = [
  {
    id: 'cmp_001',
    title: 'Aurora Mechanical Keyboard',
    description:
      'Hot-swap aluminum 75% board with smoked PBT keycaps. Group-buy unlocks the small-batch run direct from the maker — skip the markup, skip the wait.',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1200&q=80',
    targetParticipants: 100,
    currentParticipants: 64,
    price: 0.45,
    deadline: now + 4 * DAY,
    sellerName: 'Northstar Keys',
    status: 'active',
  },
  {
    id: 'cmp_002',
    title: 'Ceramic Pour-Over Set',
    description:
      'Hand-thrown carafe + dripper + double-wall glasses. Made in a two-person studio in Lisbon. Threshold-priced for the hackathon community.',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80',
    targetParticipants: 50,
    currentParticipants: 50,
    price: 0.32,
    deadline: now + 1 * DAY,
    sellerName: 'Estúdio Ondina',
    status: 'funded',
  },
  {
    id: 'cmp_003',
    title: 'Merino Travel Hoodie',
    description:
      '17.5-micron merino, full-zip, four-way stretch. Direct-from-mill pricing once we hit threshold. Refunded automatically if we miss.',
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1200&q=80',
    targetParticipants: 200,
    currentParticipants: 28,
    price: 0.78,
    deadline: now + 9 * DAY,
    sellerName: 'Field & Loom',
    status: 'active',
  },
  {
    id: 'cmp_004',
    title: 'Single-Origin Coffee, 12-Bag Drop',
    description:
      'Ethiopia Guji, anaerobic natural. Roasted to order on settle date. Twelve 250g bags shipped together to the unlock region.',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=1200&q=80',
    targetParticipants: 75,
    currentParticipants: 41,
    price: 0.18,
    deadline: now + 6 * DAY,
    sellerName: 'Halftone Roasters',
    status: 'active',
  },
  {
    id: 'cmp_005',
    title: 'Linen Throw — Indigo Run',
    description:
      'Stonewashed Belgian linen, garment-dyed indigo. Mill needs a 60-unit minimum to schedule a dye day; group-buy hits it or refunds.',
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&q=80',
    targetParticipants: 60,
    currentParticipants: 12,
    price: 0.55,
    deadline: now - 2 * DAY,
    sellerName: 'Mara Textiles',
    status: 'expired',
  },
];
