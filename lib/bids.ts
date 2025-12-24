import { prisma } from "./prisma";
import type { Bid, User } from "@prisma/client";

export type HighestBid = { amount: number; user?: Pick<User, "id" | "name" | "image"> };

export async function getHighestBidsForAuctions(auctionIds: string[]) {
  if (auctionIds.length === 0) return {};

  const bids = await prisma.bid.findMany({
    where: { auctionId: { in: auctionIds } },
    orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
    distinct: ["auctionId"],
    include: {
      user: { select: { id: true, name: true, image: true } }
    }
  });

  const map: Record<string, HighestBid> = {};
  for (const bid of bids) {
    map[bid.auctionId] = { amount: bid.amount, user: bid.user };
  }
  return map;
}

export async function getAuctionBids(auctionId: string, limit = 50) {
  return prisma.bid.findMany({
    where: { auctionId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, image: true } }
    }
  });
}

export async function getLatestBidTimes(auctionIds: string[]) {
  if (auctionIds.length === 0) return {};
  const latest = await prisma.bid.findMany({
    where: { auctionId: { in: auctionIds } },
    orderBy: { createdAt: "desc" },
    distinct: ["auctionId"],
    select: { auctionId: true, createdAt: true }
  });
  const map: Record<string, Date> = {};
  for (const row of latest) {
    map[row.auctionId] = row.createdAt;
  }
  return map;
}

