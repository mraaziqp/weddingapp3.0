import type { Guest, Household, Table, MenuItem, TimelineEvent, TrackItem } from './types';

export const allGuests: Guest[] = [
    { id: 'guest-1',  householdId: 'household-1', firstName: 'John',    lastName: 'Doe',             rsvpStatus: 'Confirmed', dietaryRestrictions: 'None',        tags: ["Groom's Friends"],   songRequest: 'September – Earth, Wind & Fire' },
    { id: 'guest-2',  householdId: 'household-1', firstName: 'Jane',    lastName: 'Doe',             rsvpStatus: 'Confirmed', dietaryRestrictions: 'Vegetarian',  tags: ["Groom's Friends"],   songRequest: 'Adore You – Harry Styles' },
    { id: 'guest-3',  householdId: 'household-2', firstName: 'Peter',   lastName: 'Jones',           rsvpStatus: 'Pending',   dietaryRestrictions: undefined,     tags: ['Work'] },
    { id: 'guest-4',  householdId: 'household-3', firstName: 'Mary',    lastName: 'Williams',        rsvpStatus: 'Confirmed', dietaryRestrictions: 'Gluten-Free', tags: ["Bride's Family"],    songRequest: 'All of Me – John Legend' },
    { id: 'guest-5',  householdId: 'household-3', firstName: 'David',   lastName: 'Williams',        rsvpStatus: 'Regret',    dietaryRestrictions: undefined,     tags: ["Bride's Family"] },
    { id: 'guest-6',  householdId: 'household-4', firstName: 'Susan',   lastName: 'Davis',           rsvpStatus: 'Pending',   dietaryRestrictions: undefined,     tags: ['Work'] },
    { id: 'guest-7',  householdId: 'household-5', firstName: 'Michael', lastName: 'Miller',          rsvpStatus: 'Confirmed', dietaryRestrictions: 'None',        tags: ["Groom's Family"] },
    { id: 'guest-8',  householdId: 'household-5', firstName: 'Sarah',   lastName: 'Miller',          rsvpStatus: 'Confirmed', dietaryRestrictions: 'Vegan',       tags: ["Groom's Family"],    songRequest: 'Dancing Queen – ABBA' },
    { id: 'guest-9',  householdId: 'household-6', firstName: 'Chris',   lastName: 'Lee',             rsvpStatus: 'Confirmed', dietaryRestrictions: 'None',        tags: ["Bride's Friends"] },
    { id: 'guest-10', householdId: 'household-7', firstName: 'Patricia',lastName: 'Garcia',          rsvpStatus: 'Pending',   dietaryRestrictions: undefined,     tags: ["Bride's Friends"] },
    { id: 'guest-11', householdId: 'household-8', firstName: 'Fatima',  lastName: 'Ahmed',           rsvpStatus: 'Confirmed', dietaryRestrictions: 'Halal',       tags: ["Bride's Family"],    songRequest: 'Thinking Out Loud – Ed Sheeran' },
    { id: 'guest-12', householdId: 'household-8', firstName: 'Mohammed',lastName: 'Khan',            rsvpStatus: 'Confirmed', dietaryRestrictions: 'Halal',       tags: ["Groom's Family"] },
    { id: 'guest-13', householdId: 'household-9', firstName: 'Lerato',  lastName: 'Mokoena',         rsvpStatus: 'Pending',   dietaryRestrictions: undefined,     tags: ["Bride's Friends"] },
    { id: 'guest-14', householdId: 'household-10',firstName: 'Pieter',  lastName: 'van der Merwe',   rsvpStatus: 'Regret',    dietaryRestrictions: undefined,     tags: ['Work'] },
];

export const households: Household[] = [
    { id: 'household-1', name: 'The Doe Family', address: '123 Main St', guests: allGuests.filter(g => g.householdId === 'household-1'), qrCode: 'WEDU-HOUSEHOLD-1' },
    { id: 'household-2', name: 'Peter Jones', address: '456 Oak Ave', guests: allGuests.filter(g => g.householdId === 'household-2'), qrCode: 'WEDU-HOUSEHOLD-2' },
    { id: 'household-3', name: 'The Williams Family', address: '789 Pine Ln', guests: allGuests.filter(g => g.householdId === 'household-3'), qrCode: 'WEDU-HOUSEHOLD-3' },
    { id: 'household-4', name: 'Susan Davis', address: '101 Maple Dr', guests: allGuests.filter(g => g.householdId === 'household-4'), qrCode: 'WEDU-HOUSEHOLD-4' },
    { id: 'household-5', name: 'The Miller Family', address: '212 Birch Rd', guests: allGuests.filter(g => g.householdId === 'household-5'), qrCode: 'WEDU-HOUSEHOLD-5' },
    { id: 'household-6', name: 'Chris Lee', address: '333 Cedar Ct', guests: allGuests.filter(g => g.householdId === 'household-6'), qrCode: 'WEDU-HOUSEHOLD-6' },
    { id: 'household-7', name: 'Patricia Garcia', address: '444 Elm St', guests: allGuests.filter(g => g.householdId === 'household-7'), qrCode: 'WEDU-HOUSEHOLD-7' },
    { id: 'household-8', name: 'The Khan Family', address: '555 Spruce Way', guests: allGuests.filter(g => g.householdId === 'household-8'), qrCode: 'WEDU-HOUSEHOLD-8' },
    { id: 'household-9', name: 'Lerato Mokoena', address: '666 Willow Ave', guests: allGuests.filter(g => g.householdId === 'household-9'), qrCode: 'WEDU-HOUSEHOLD-9' },
    { id: 'household-10', name: 'Pieter van der Merwe', address: '777 Redwood Pkwy', guests: allGuests.filter(g => g.householdId === 'household-10'), qrCode: 'WEDU-HOUSEHOLD-10' },
];

export const initialTables: Table[] = [
    { id: 'table-1', name: 'Table 1', capacity: 8,  shape: 'round-8',  guests: [], x: 100, y: 200 },
    { id: 'table-2', name: 'Table 2', capacity: 8,  shape: 'round-8',  guests: [], x: 300, y: 200 },
    { id: 'table-3', name: 'Table 3', capacity: 8,  shape: 'round-8',  guests: [], x: 500, y: 200 },
    { id: 'table-4', name: 'Table 4', capacity: 10, shape: 'round-10', guests: [], x: 200, y: 450 },
    { id: 'table-5', name: 'Table 5', capacity: 10, shape: 'round-10', guests: [], x: 450, y: 450 },
];

// ── Planner Suite seed data ────────────────────────────────────────────────

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
