import { NextResponse } from "next/server";
import { computeEffectiveEndsAt, getAuction, isAuctionLive } from "@/lib/auctions";
import { getAuctionBids, getHighestBidsForAuctions } from "@/lib/bids";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auction = getAuction(params.id);
  if (!auction) {
    return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  }

  const [highest, bids] = await Promise.all([
    getHighestBidsForAuctions([auction.id]),
    getAuctionBids(auction.id, 50)
  ]);

  const top = highest[auction.id];
  const lastBidAt = bids[0]?.createdAt;
  const effectiveEndsAt = computeEffectiveEndsAt(auction.id, auction.endsAt, lastBidAt);
  const live = isAuctionLive(effectiveEndsAt, new Date());
  const hasBids = Boolean(lastBidAt);

  return NextResponse.json({
    auction,
    endsAt: effectiveEndsAt,
    hasBids,
    live,
    highestBid: top?.amount ?? 0,
    highBidder: top?.user,
    bids
  });
}

