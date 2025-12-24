import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { computeEffectiveEndsAt, getAuction, isAuctionLive, isWithinBidHours } from "@/lib/auctions";
import { prisma } from "@/lib/prisma";

class BidError extends Error {
  code: "BID_TOO_LOW" | "INVALID";
  constructor(code: BidError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auction = getAuction(params.id);
  if (!auction) {
    return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  }

  if (!isWithinBidHours()) {
    return NextResponse.json({ error: "Bidding is open 10am-10pm ET" }, { status: 400 });
  }

  const body = await req.json();
  const amount = Number(body?.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "Bid must be a positive integer" }, { status: 400 });
  }

  try {
    const bid = await prisma.$transaction(
      // Explicit any to avoid tooling issues with Prisma TransactionClient types.
      async (tx: any) => {
        const [current, latest] = await Promise.all([
          tx.bid.findFirst({
            where: { auctionId: auction.id },
            orderBy: { amount: "desc" }
          }),
          tx.bid.findFirst({
            where: { auctionId: auction.id },
            orderBy: { createdAt: "desc" }
          })
        ]);

        const effectiveEndsAt = computeEffectiveEndsAt(auction.id, auction.endsAt, latest?.createdAt);
        if (!isAuctionLive(effectiveEndsAt, new Date())) {
          throw new BidError("INVALID", "Auction is closed");
        }

        const highest = current?.amount ?? 0;
        if (amount <= highest) {
          throw new BidError("BID_TOO_LOW", "Bid must be higher than current highest bid");
        }

        return tx.bid.create({
          data: {
            auctionId: auction.id,
            userId: session.user!.id,
            amount
          }
        });
      },
      { isolationLevel: "RepeatableRead" }
    );

    return NextResponse.json({ bid });
  } catch (err) {
    if (err instanceof BidError && err.code === "BID_TOO_LOW") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to place bid", err);
    return NextResponse.json({ error: "Failed to place bid" }, { status: 500 });
  }
}

