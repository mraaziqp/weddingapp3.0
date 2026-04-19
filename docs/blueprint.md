# **App Name**: Wedu 3.0 (Project WifeOS)

## Core Features:

- Visual Seating Studio: Drag-and-drop interface using Canvas API for seating arrangements. Features color-coded Guest Chips, table capacity constraints, snap-to-grid alignment, and conflict detection (e.g., divorced parents seated at the same table).
- Multi-Store Registry Manager: Admin interface for adding gifts from multiple stores via URL scraping. Auto-fetches Title, Price, and Image. Includes a 'Crowdfund Engine' for splitting items into smaller contribution slots.
- Dashboard Analytics: Real-time chart displaying '% Funded,' 'Total Cash Gifts,' and 'Thank You Notes Pending'. Provides a high-level overview of registry progress.
- AI Bride's Secretary: AI-powered tool that auto-drafts WhatsApp messages. Context-aware messages for missing RSVPs or received gifts. Includes a tone slider to adjust from 'Formal' to 'Casual/Funny'.
- Immersive 'Storybook' Hero: Dynamic personalization via URL parameters (e.g., ?guest=uuid) to load guest's name, partner's name, and table number. Features a Parallax Scroll effect with background layers moving at different speeds.
- 'Live' Registry & Gifting: Gamified experience for contributing to a 'Honeymoon Fund' with progress bar animation and confetti explosion. Offers privacy options for guests to be 'Anonymous' to the public.
- 'Event Mode' (Geofenced/Time-Based): Automatically activates on the wedding day. Features a Live Gallery (Snapchat-style feed for guest photo uploads to venue's big screen with admin approval) and a Digital Program (live timeline highlighting the 'Current Event').
- Database Schema (Relational/Postgres): Defines the relational database schema for Households -> Guests, Tables (Capacity, Shape, X/Y Coordinates), Gifts (Price, FundedAmount, IsCrowdfund), and Contributions (Linked to Guest + Gift).
- Role-Based Access Control (RBAC): Implements Role-Based Access Control with Admin (full write access) and Guest (read-only, except for their own RSVP and Photo Uploads) roles.
- Guest Playlist Builder: Guests can submit one song request with their RSVP. Admin can veto/approve songs for the DJ list.
- Dynamic QR Check-in: Generates a unique QR code for every household. Scanned at the venue for instant check-in and table assignment lookup.

## Style Guidelines:

- Primary: Deep Emerald Green (Luxury).
- Secondary: Champagne Gold (Accents).
- Background: Soft Cream/Off-White (Paper texture overlay).
- Headings: Playfair Display (Italicized for emphasis).
- Body: Geist Sans or Inter (Ultra-clean readability).
- Glassmorphism: Navigation bars and modal windows should have backdrop-blur-md and a thin white border.
- Micro-Interactions: Buttons should scale down slightly on click (scale-95). Hover effects should lift cards (translate-y-1).