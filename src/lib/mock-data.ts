import type { Guest, Household, Table, MenuItem, TimelineEvent, TrackItem } from './types';

export const households: Household[] = [
  {
    id: 'h-1',
    name: 'The Al-Fassi Family',
    address: '12 Morocco Way, Cape Town',
    qrCode: 'fatima-fassi',
    guests: [
      { id: 'g-1', householdId: 'h-1', firstName: 'Fatima', lastName: 'Al-Fassi', rsvpStatus: 'Confirmed', tags: ["Bride's Family"], dietaryRestrictions: 'Vegetarian' }
    ]
  },
  {
    id: 'h-2',
    name: 'The Naidoo Household',
    address: '8 Durban Rd, Cape Town',
    qrCode: 'farid-naidoo',
    guests: [
      { id: 'g-2', householdId: 'h-2', firstName: 'Farid', lastName: 'Naidoo', rsvpStatus: 'Confirmed', tags: ["Groom's Family"], songRequest: 'September', dietaryRestrictions: 'Gluten-Free' }
    ]
  },
  {
    id: 'h-3',
    name: 'Zayd Hendricks',
    address: '42 Pine St, Cape Town',
    qrCode: 'zayd-hendricks',
    guests: [
      { id: 'g-3', householdId: 'h-3', firstName: 'Zayd', lastName: 'Hendricks', rsvpStatus: 'Confirmed', tags: ["Bride's Friends"], songRequest: 'Marry You' }
    ]
  },
  {
    id: 'h-4',
    name: 'Layla Abrahams',
    address: '17 Oak Ave, Cape Town',
    qrCode: 'layla-abrahams',
    guests: [
      { id: 'g-4', householdId: 'h-4', firstName: 'Layla', lastName: 'Abrahams', rsvpStatus: 'Confirmed', tags: ["Groom's Friends"] }
    ]
  }
];

export const allGuests: Guest[] = households.flatMap(h => h.guests);

export const initialTables: Table[] = [
    { id: 'table-1', name: 'Table 1', capacity: 8,  shape: 'round-8',  guests: [], x: 100, y: 200 },
    { id: 'table-2', name: 'Table 2', capacity: 8,  shape: 'round-8',  guests: [], x: 300, y: 200 },
    { id: 'table-3', name: 'Table 3', capacity: 8,  shape: 'round-8',  guests: [], x: 500, y: 200 },
    { id: 'table-4', name: 'Table 4', capacity: 10, shape: 'round-10', guests: [], x: 200, y: 450 },
    { id: 'table-5', name: 'Table 5', capacity: 10, shape: 'round-10', guests: [], x: 450, y: 450 },
];

export const initialMenuItems: MenuItem[] = [
    { id: 'm-1',  name: 'Smoked Salmon Blinis',      description: 'Cream cheese, dill, capers',            course: 'canapes',  dietaryFlags: [],                              sortOrder: 0 },
    { id: 'm-2',  name: 'Mini Spanakopita',           description: 'Filo pastry, spinach, feta',             course: 'canapes',  dietaryFlags: ['vegetarian'],                  sortOrder: 1 },
    { id: 'm-3',  name: 'Prawn Cocktail',             description: 'Marie rose, avocado, lettuce',           course: 'starters', dietaryFlags: ['gluten-free'],                 sortOrder: 0 },
    { id: 'm-4',  name: 'Roasted Butternut Bisque',  description: 'Coconut cream, ginger, chilli oil',      course: 'starters', dietaryFlags: ['vegan', 'gluten-free'],         sortOrder: 1 },
    { id: 'm-5',  name: 'Beef Tenderloin',            description: 'Peppercorn jus, dauphinoise potato',     course: 'mains',    dietaryFlags: ['halal'],                       sortOrder: 0 },
    { id: 'm-6',  name: 'Grilled Line Fish',         description: 'Lemon butter, saffron rice, broccolini', course: 'mains',    dietaryFlags: ['gluten-free', 'halal'],         sortOrder: 1 },
    { id: 'm-7',  name: 'Wild Mushroom Risotto',      description: 'Parmesan, truffle oil, microgreens',     course: 'mains',    dietaryFlags: ['vegetarian', 'gluten-free'],    sortOrder: 2 },
    { id: 'm-8',  name: 'Chocolate Fondant',         description: 'Salted caramel, vanilla gelato',         course: 'desserts', dietaryFlags: [],                              sortOrder: 0 },
    { id: 'm-9',  name: 'Malva Pudding',             description: 'Custard, apricot conserve',              course: 'desserts', dietaryFlags: [],                              sortOrder: 1 },
    { id: 'm-10', name: 'Seasonal Fruit Pavlova',    description: 'Passionfruit curd, fresh berries',       course: 'desserts', dietaryFlags: ['gluten-free'],                 sortOrder: 2 },
];

export const initialTimeline: TimelineEvent[] = [
    { id: 'tl-1', time: '13:30', title: 'Venue Opens',         description: 'Decorators complete final setup',             category: 'other',         isPublic: false, duration: 30  },
    { id: 'tl-2', time: '14:00', title: 'Guest Arrival',       description: 'Doors open, welcome drinks & canapés',        category: 'arrival',       isPublic: true,  duration: 90  },
    { id: 'tl-3', time: '15:30', title: 'Nikkah Ceremony',     description: 'The official union of Razia & Abduraziq',     category: 'ceremony',      isPublic: true,  duration: 45  },
    { id: 'tl-4', time: '16:15', title: 'Photoshoots',         description: 'Couple portraits & family photos',            category: 'reception',     isPublic: true,  duration: 60  },
    { id: 'tl-5', time: '17:00', title: 'Speeches & Toasts',   description: 'Best man, maid of honour, father of bride',   category: 'entertainment', isPublic: true,  duration: 45  },
    { id: 'tl-6', time: '18:00', title: 'Dinner Service',      description: 'Starters, mains, desserts',                   category: 'dinner',        isPublic: true,  duration: 90  },
    { id: 'tl-7', time: '19:30', title: 'First Dance',         description: 'Razia & Abduraziq take the floor',            category: 'entertainment', isPublic: true,  duration: 15  },
    { id: 'tl-8', time: '20:00', title: 'Dance Floor Opens',   description: 'DJ set begins, full party mode activated',    category: 'entertainment', isPublic: true,  duration: 180 },
    { id: 'tl-9', time: '23:00', title: 'Grand Farewell',      description: 'Sparkler send-off & guest departure',         category: 'other',         isPublic: true,  duration: 30  },
];

export const initialTracks: TrackItem[] = [
    { id: 'tr-1',  title: 'Perfect',              artist: 'Ed Sheeran',             column: 'must-play' },
    { id: 'tr-2',  title: 'Marry You',            artist: 'Bruno Mars',             column: 'must-play' },
    { id: 'tr-3',  title: 'At Last',              artist: 'Etta James',             column: 'must-play' },
    { id: 'tr-4',  title: 'September',            artist: 'Earth, Wind & Fire',     column: 'must-play' },
    { id: 'tr-5',  title: 'Thinking Out Loud',    artist: 'Ed Sheeran',             column: 'if-time' },
    { id: 'tr-6',  title: 'Adore You',            artist: 'Harry Styles',           column: 'if-time' },
    { id: 'tr-7',  title: 'Can\'t Stop the Feeling', artist: 'Justin Timberlake',  column: 'if-time' },
    { id: 'tr-8',  title: 'My Heart Will Go On',  artist: 'Celine Dion',           column: 'do-not-play' },
    { id: 'tr-9',  title: 'Disco Inferno',        artist: 'The Trammps',            column: 'do-not-play' },
];
