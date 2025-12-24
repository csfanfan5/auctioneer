import { NextResponse } from "next/server";
import { auctions, computeEffectiveEndsAt, isAuctionLive } from "@/lib/auctions";
import { getHighestBidsForAuctions, getLatestBidTimes } from "@/lib/bids";

export async function GET() {
  const ids = auctions.map((a) => a.id);
  const [highest, latestTimes] = await Promise.all([
    getHighestBidsForAuctions(ids),
    getLatestBidTimes(ids)
  ]);
  const now = new Date();

  const payload = auctions.map((auction) => {
    const top = highest[auction.id];
    const latest = latestTimes[auction.id];
    const effectiveEndsAt = computeEffectiveEndsAt(auction.id, auction.endsAt, latest);
    const hasBids = Boolean(latest);
    const live = isAuctionLive(effectiveEndsAt, now);
    return {
      ...auction,
      endsAt: effectiveEndsAt,
      hasBids,
      highestBid: top?.amount ?? 0,
      highBidder: top?.user,
      live
    };
  });

  return NextResponse.json({ auctions: payload });
}

