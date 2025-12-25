import Link from "next/link";
import { notFound } from "next/navigation";
import { auctions, computeEffectiveEndsAt, getAuction, isAuctionLive, isWithinBidHours } from "@/lib/auctions";
import { getAuctionBids, getHighestBidsForAuctions } from "@/lib/bids";
import { AuctionClient } from "./AuctionClient";

type Params = { params: { id: string } };

export async function generateStaticParams() {
  return auctions.map((auction) => ({ id: auction.id }));
}

export default async function AuctionPage({ params }: Params) {
  const auction = getAuction(params.id);
  if (!auction) {
    notFound();
  }

  const [highest, bids] = await Promise.all([
    getHighestBidsForAuctions([auction.id]),
    getAuctionBids(auction.id, 50)
  ]);
  const top = highest[auction.id];
  const effectiveEndsAt = computeEffectiveEndsAt(auction.id, auction.endsAt, bids[0]?.createdAt);
  const now = new Date();

  return (
    <div className="layout">
      <Link href="/auction" className="muted">
        ← Back to auctions
      </Link>
      <AuctionClient
        auction={auction}
        initialHighestBid={top?.amount ?? 0}
        initialHighBidder={top?.user ?? null}
        initialBids={bids}
        effectiveEndsAt={effectiveEndsAt}
        initialLive={isAuctionLive(effectiveEndsAt, now)}
        initialNowMs={now.getTime()}
        initialMarketOpen={isWithinBidHours(now)}
        initialHasBids={Boolean(bids[0])}
      />
    </div>
  );
}

