import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { auctions, computeEffectiveEndsAt, isAuctionLive, isWithinBidHours } from "@/lib/auctions";
import { getHighestBidsForAuctions, getAuctionBids } from "@/lib/bids";
import { AuctionClient } from "./[id]/AuctionClient";

export default async function AuctionsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const ids = auctions.map((a) => a.id);
  const [highest, bidsEntries] = await Promise.all([
    getHighestBidsForAuctions(ids),
    Promise.all(auctions.map(async (a) => [a.id, await getAuctionBids(a.id, 50)] as const))
  ]);
  const bidsById = Object.fromEntries(bidsEntries);
  const now = new Date();
  const initialNowMs = now.getTime();
  const initialMarketOpen = isWithinBidHours(now);

  return (
    <div className="layout">
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Auctions</h1>
        <div className="muted" style={{ fontSize: 13 }}>
          Market open 1 pm – 1 am ET · Markets close 6h after last bid
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          justifyItems: "center"
        }}
      >
        {auctions.map((auction) => {
          const bidsFor = bidsById[auction.id] ?? [];
          const endsAt = computeEffectiveEndsAt(auction.id, auction.endsAt, bidsFor[0]?.createdAt);
          return (
            <AuctionClient
              key={auction.id}
              auction={auction}
              initialHighestBid={highest[auction.id]?.amount ?? 0}
              initialHighBidder={highest[auction.id]?.user ?? null}
              initialBids={bidsFor}
              effectiveEndsAt={endsAt}
              initialLive={isAuctionLive(endsAt, now)}
              initialNowMs={initialNowMs}
              initialMarketOpen={initialMarketOpen}
              initialHasBids={Boolean(bidsFor[0])}
            />
          );
        })}
      </div>
    </div>
  );
}

