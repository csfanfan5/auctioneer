export type Auction = {
  id: string;
  title: string;
  description?: string;
  endsAt: string; // ISO string
};

type MutableGlobal = typeof globalThis & { __auctionAnchors?: Record<string, string> };
const globalMutable = globalThis as MutableGlobal;
const auctionAnchors: Record<string, string> = globalMutable.__auctionAnchors ?? {};

function anchorFor(auctionId: string): string {
  if (!auctionAnchors[auctionId]) {
    auctionAnchors[auctionId] = new Date().toISOString();
  }
  return auctionAnchors[auctionId];
}

if (!globalMutable.__auctionAnchors) {
  globalMutable.__auctionAnchors = auctionAnchors;
}

// Hardcoded auctions. Update the list to add/remove auctions.
export const auctions: Auction[] = [
  {
    id: "rome-bed",
    title: "Rome Bed",
    description: "Additional money for single bed for 3 nights",
    endsAt: "9999-12-31T23:59:59.000Z"
  },
  {
    id: "rome-couch",
    title: "Rome Couch",
    description: "Additional money for single sofa bed for 3 nights",
    endsAt: "9999-12-31T23:59:59.000Z"
  },
  {
    id: "venice-bed",
    title: "Venice Bed",
    description: "Additional money for single bed for 2 nights",
    endsAt: "9999-12-31T23:59:59.000Z"
  }, 
  {
    id: "venice-couch-1",
    title: "Venice Couch 1",
    description: "Additional money for single sofa bed for 2 nights",
    endsAt: "9999-12-31T23:59:59.000Z"
  },
  {
    id: "venice-couch-2",
    title: "Venice Couch 2",
    description: "Additional money for single sofa bed for 2 nights",
    endsAt: "9999-12-31T23:59:59.000Z"
  }
];

export const getAuction = (id: string) => auctions.find((a) => a.id === id);

const TWO_HOURS_MS = 6 * 60 * 60 * 1000;
const STEP_MS = 60 * 1000; // 1 minute steps to account for market hours

export function isWithinBidHours(now: Date = new Date()): boolean {
  const parts = now
    .toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour12: false,
      hour: "numeric",
      minute: "numeric"
    })
    .split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  const minutesFromMidnight = hour * 60 + minute;
  const openMinutes = 13 * 60; // 13:00 ET
  const closeMinutes = 25 * 60; // 01:00 ET next day (25:00)
  // If before open (e.g., 00:30), treat as next-day minute count.
  const shifted = minutesFromMidnight < openMinutes ? minutesFromMidnight + 24 * 60 : minutesFromMidnight;
  return shifted >= openMinutes && shifted < closeMinutes;
}

export function computeEffectiveEndsAt(
  auctionId: string,
  auctionEndsAt: string,
  lastBidAt?: Date | null
): string | null {
  if (!lastBidAt) return null;
  const configured = new Date(auctionEndsAt).getTime();
  const start = new Date(lastBidAt);
  const bidBasedEnd = addOpenDuration(start, TWO_HOURS_MS).getTime();
  const effective = Math.min(configured, bidBasedEnd);
  return new Date(effective).toISOString();
}

export function isAuctionLive(effectiveEndsAt: string | null, now: Date = new Date()): boolean {
  if (!effectiveEndsAt) {
    return isWithinBidHours(now);
  }
  return now.getTime() < new Date(effectiveEndsAt).getTime();
}

/**
 * Adds the given duration but only during open market hours. Closed periods are skipped.
 */
function addOpenDuration(start: Date, durationMs: number): Date {
  let remaining = durationMs;
  let cursor = new Date(start);

  while (remaining > 0) {
    const open = isWithinBidHours(cursor);
    const step = Math.min(remaining, STEP_MS);
    if (open) {
      remaining -= step;
    }
    cursor = new Date(cursor.getTime() + step);
  }

  return cursor;
}

