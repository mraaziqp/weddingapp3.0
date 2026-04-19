
export type GuestTag =
  | "Bride's Family"
  | "Groom's Family"
  | "Bride's Friends"
  | "Groom's Friends"
  | 'Work'
  | 'Do Not Sit Together';

export type Guest = {
  id: string;
  householdId: string;
  firstName: string;
  lastName: string;
  isAttending?: boolean;
  rsvpStatus: 'Confirmed' | 'Pending' | 'Regret';
  songRequest?: string;
  dietaryRestrictions?: string;
  tags?: GuestTag[];
};

export type Household = {
  id: string;
  name: string;
  address: string;
  guests: Guest[];
  qrCode: string;
};

export type Table = {
  id: string;
  name: string;
  capacity: number;
  shape: 'round-8' | 'round-10' | 'rectangle';
  x: number;
  y: number;
  guests: Guest[];
};

export type Gift = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  storeUrl: string;
  isCrowdfund: boolean;
  fundedAmount: number;
};

export type Contribution = {
  id: string;
  giftId: string;
  guestId: string;
  amount: number;
  isAnonymous: boolean;
};

export type Media = {
  id: string; // uuid
  guest_id: string; // foreign key to Guests table
  media_url: string;
  media_type: 'image' | 'video' | 'audio';
  visibility: 'public' | 'private';
  quest_tag?: string;
  created_at: Date;
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  tag: string;
  completed: boolean;
};

// ── Planner Suite ───────────────────────────────────────────────────────

export type MenuCourse = 'canapes' | 'starters' | 'mains' | 'desserts';
export type DietaryFlag = 'vegan' | 'vegetarian' | 'gluten-free' | 'halal' | 'nut-free';

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  course: MenuCourse;
  dietaryFlags?: DietaryFlag[];
  sortOrder: number;
};

export type TimelineCategory =
  | 'arrival'
  | 'ceremony'
  | 'reception'
  | 'dinner'
  | 'entertainment'
  | 'other';

export type TimelineEvent = {
  id: string;
  time: string;        // '14:00'
  title: string;
  description?: string;
  category: TimelineCategory;
  isPublic: boolean;
  duration?: number;   // minutes
};

export type TrackColumn = 'must-play' | 'if-time' | 'do-not-play';

export type TrackItem = {
  id: string;
  title: string;
  artist: string;
  column: TrackColumn;
  requestedBy?: string; // guest name
};
