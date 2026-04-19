/**
 * Drizzle ORM Schema — Wedu 3.0 Production
 * ──────────────────────────────────────────
 * Run: npx drizzle-kit generate  (after configuring drizzle.config.ts)
 * Migrate: npx drizzle-kit migrate
 */

import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  real,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── households ────────────────────────────────────────────────────────────
export const households = pgTable('households', {
  id:      text('id').primaryKey(),
  name:    text('name').notNull(),
  address: text('address'),
  qrCode:  text('qr_code').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── guests ────────────────────────────────────────────────────────────────
export const guests = pgTable('guests', {
  id:          text('id').primaryKey(),
  householdId: text('household_id')
                 .notNull()
                 .references(() => households.id, { onDelete: 'cascade' }),
  firstName:   text('first_name').notNull(),
  lastName:    text('last_name').notNull(),
  rsvpStatus:  text('rsvp_status')
                 .$type<'Confirmed' | 'Pending' | 'Regret'>()
                 .notNull()
                 .default('Pending'),
  dietaryRestrictions: text('dietary_restrictions'),
  songRequest: text('song_request'),
  // GuestTag[] stored as comma-separated text for portability
  tags:        text('tags'),  // e.g. "Groom's Friends,Do Not Sit Together"
  tableId:     text('table_id').references(() => tables.id, { onDelete: 'set null' }),
  checkedInAt: timestamp('checked_in_at'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
});

// ── tables ────────────────────────────────────────────────────────────────
export const tables = pgTable('tables', {
  id:       text('id').primaryKey(),
  name:     text('name').notNull(),
  capacity: integer('capacity').notNull(),
  shape:    text('shape')
              .$type<'round-8' | 'round-10' | 'rectangle'>()
              .notNull()
              .default('round-8'),
  posX:     real('pos_x').default(0),
  posY:     real('pos_y').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── menu_items ────────────────────────────────────────────────────────────
export const menuItems = pgTable('menu_items', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  description: text('description').notNull().default(''),
  course:      text('course')
                 .$type<'canapes' | 'starters' | 'mains' | 'desserts'>()
                 .notNull(),
  // dietaryFlags stored as comma-separated e.g. "vegan,gluten-free"
  dietaryFlags: text('dietary_flags'),
  sortOrder:   integer('sort_order').notNull().default(0),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
});

// ── timeline_events ───────────────────────────────────────────────────────
export const timelineEvents = pgTable('timeline_events', {
  id:          text('id').primaryKey(),
  time:        text('time').notNull(),   // '14:00' — kept as text for flexibility
  title:       text('title').notNull(),
  description: text('description'),
  category:    text('category')
                 .$type<'arrival' | 'ceremony' | 'reception' | 'dinner' | 'entertainment' | 'other'>()
                 .notNull()
                 .default('other'),
  isPublic:    boolean('is_public').notNull().default(true),
  duration:    integer('duration'),    // minutes
  sortOrder:   integer('sort_order').notNull().default(0),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
});

// ── tracks ────────────────────────────────────────────────────────────────
export const tracks = pgTable('tracks', {
  id:          text('id').primaryKey(),
  title:       text('title').notNull(),
  artist:      text('artist').notNull(),
  column:      text('column')
                 .$type<'must-play' | 'if-time' | 'do-not-play'>()
                 .notNull()
                 .default('if-time'),
  requestedBy: text('requested_by'),   // guest name
  sortOrder:   integer('sort_order').notNull().default(0),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
});

// ── media ─────────────────────────────────────────────────────────────────
export const media = pgTable('media', {
  id:        uuid('id').defaultRandom().primaryKey(),
  guestId:   text('guest_id')
               .references(() => guests.id, { onDelete: 'set null' }),
  mediaUrl:  text('media_url').notNull(),
  mediaType: text('media_type')
               .$type<'image' | 'video' | 'audio'>()
               .notNull()
               .default('image'),
  visibility: text('visibility')
                .$type<'public' | 'private'>()
                .notNull()
                .default('public'),
  questTag:  text('quest_tag'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── gifts ─────────────────────────────────────────────────────────────────
export const gifts = pgTable('gifts', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  price:         real('price').notNull(),
  imageUrl:      text('image_url'),
  storeUrl:      text('store_url'),
  isCrowdfund:   boolean('is_crowdfund').notNull().default(false),
  fundedAmount:  real('funded_amount').notNull().default(0),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
});

// ── contributions ─────────────────────────────────────────────────────────
export const contributions = pgTable('contributions', {
  id:          text('id').primaryKey(),
  giftId:      text('gift_id')
                 .notNull()
                 .references(() => gifts.id, { onDelete: 'cascade' }),
  guestId:     text('guest_id')
                 .references(() => guests.id, { onDelete: 'set null' }),
  amount:      real('amount').notNull(),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
});

// ── Relations ─────────────────────────────────────────────────────────────
export const householdsRelations = relations(households, ({ many }) => ({
  guests: many(guests),
}));

export const guestsRelations = relations(guests, ({ one, many }) => ({
  household:     one(households, { fields: [guests.householdId], references: [households.id] }),
  table:         one(tables,     { fields: [guests.tableId],     references: [tables.id]     }),
  contributions: many(contributions),
  media:         many(media),
}));

export const tablesRelations = relations(tables, ({ many }) => ({
  guests: many(guests),
}));

export const giftsRelations = relations(gifts, ({ many }) => ({
  contributions: many(contributions),
}));

export const contributionsRelations = relations(contributions, ({ one }) => ({
  gift:  one(gifts,  { fields: [contributions.giftId],  references: [gifts.id]  }),
  guest: one(guests, { fields: [contributions.guestId], references: [guests.id] }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  guest: one(guests, { fields: [media.guestId], references: [guests.id] }),
}));

// ── Type exports (inferred) ───────────────────────────────────────────────
export type SelectGuest       = typeof guests.$inferSelect;
export type InsertGuest       = typeof guests.$inferInsert;
export type SelectTable       = typeof tables.$inferSelect;
export type InsertTable       = typeof tables.$inferInsert;
export type SelectMenuItem    = typeof menuItems.$inferSelect;
export type InsertMenuItem    = typeof menuItems.$inferInsert;
export type SelectTimeline    = typeof timelineEvents.$inferSelect;
export type InsertTimeline    = typeof timelineEvents.$inferInsert;
export type SelectTrack       = typeof tracks.$inferSelect;
export type InsertTrack       = typeof tracks.$inferInsert;
export type SelectMedia       = typeof media.$inferSelect;
export type InsertMedia       = typeof media.$inferInsert;
