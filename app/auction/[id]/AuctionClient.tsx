"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { isWithinBidHours } from "@/lib/auctions";

type BidWithUser = {
  id: string;
  auctionId: string;
  userId: string;
  amount: number;
  createdAt: string | Date;
  user: { id: string; name: string | null; image: string | null } | null;
};

type AuctionClientProps = {
  auction: {
    id: string;
    title: string;
    description?: string;
    endsAt: string;
  };
  initialHighestBid: number;
  initialBids: BidWithUser[];
  effectiveEndsAt: string | null;
  initialLive: boolean;
  initialNowMs: number;
  initialMarketOpen: boolean;
  initialHasBids: boolean;
};

type AuctionApiResponse = {
  auction: AuctionClientProps["auction"];
  highestBid: number;
  bids: BidWithUser[];
  endsAt: string | null;
  live: boolean;
};

export function AuctionClient({
  auction,
  effectiveEndsAt,
  initialHighestBid,
  initialBids,
  initialLive,
  initialNowMs,
  initialMarketOpen,
  initialHasBids
}: AuctionClientProps) {
  const { data: session } = useSession();
  const [highestBid, setHighestBid] = useState(initialHighestBid);
  const [bids, setBids] = useState<BidWithUser[]>(initialBids);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(initialNowMs);
  const [live, setLive] = useState(initialLive);
  const [endsAtIso, setEndsAtIso] = useState<string | null>(effectiveEndsAt);
  const [marketOpen, setMarketOpen] = useState(initialMarketOpen);
  const [hasBids, setHasBids] = useState(initialHasBids);

  const endsAtMs = useMemo(() => (endsAtIso ? new Date(endsAtIso).getTime() : null), [endsAtIso]);
  const timeLive = endsAtMs ? endsAtMs > now : true;
  const displayLive = live && timeLive && hasBids;

  useEffect(() => {
    const tick = setInterval(() => {
      const open = isWithinBidHours(new Date());
      setMarketOpen(open);
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!displayLive) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/auctions/${auction.id}`);
      if (!res.ok) return;
      const data: AuctionApiResponse = await res.json();
      setHighestBid(data.highestBid);
      setBids(data.bids);
      setEndsAtIso(data.endsAt);
      setLive(data.live);
      setHasBids(Boolean(data.endsAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [auction.id, displayLive]);

  function formatHms(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const two = (n: number) => n.toString().padStart(2, "0");
    return `${two(hours)}:${two(minutes)}:${two(seconds)}`;
  }

  async function submitBid(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const numericAmount = Number(amount);
    if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
      setError("Enter a positive integer");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/auctions/${auction.id}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: numericAmount })
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data?.error ?? "Failed to bid");
      return;
    }
    setAmount("");
    // Refresh latest state
    const detail = await fetch(`/api/auctions/${auction.id}`);
    if (detail.ok) {
      const data: AuctionApiResponse = await detail.json();
      setHighestBid(data.highestBid);
      setBids(data.bids);
      setEndsAtIso(data.endsAt);
      setLive(data.live);
    }
  }

  function formatLocalTime(timestampMs: number) {
    return new Date(timestampMs).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function renderTimeRemaining() {
    if (!hasBids) return "No bids yet";
    if (!endsAtMs) return "No bids yet";
    const msRemaining = endsAtMs - now;
    const atTime = formatLocalTime(endsAtMs);
    if (msRemaining <= 0) return `Closed · closes at ${atTime}`;
    if (!marketOpen) return `Market closed · ${formatHms(msRemaining)} remaining · closes at ${atTime}`;
    if (!displayLive) return `Closed · ${formatHms(msRemaining)} remaining · closes at ${atTime}`;
    return `Ends in ${formatHms(msRemaining)} · closes at ${atTime}`;
  }

  return (
    <div className="card">
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: "0 0 4px" }}>{auction.title}</h2>
          {auction.description ? <p className="muted" style={{ margin: 0 }}>{auction.description}</p> : null}
          <div className="flex" style={{ gap: 8, marginTop: 6, alignItems: "center" }}>
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                background: displayLive && marketOpen ? "#ecfdf3" : "#f3f4f6",
                color: displayLive && marketOpen ? "#166534" : "#6b7280",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.2
              }}
            >
              {!marketOpen
                ? "CLOSED"
                : hasBids
                ? displayLive
                  ? "LIVE"
                  : "CLOSED"
                : "OPEN"}
            </span>
            <span className="muted" style={{ fontSize: 13 }}>{renderTimeRemaining()}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="muted">Best bid</div>
          <div style={{ fontWeight: 800, fontSize: 26 }}>${highestBid}</div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        {session?.user ? (
          <form onSubmit={submitBid} className="flex" style={{ alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label className="muted" style={{ display: "block", marginBottom: 6 }}>
                Your bid (integer)
              </label>
              <input
                type="number"
                value={amount}
                min={1}
                onChange={(e) => setAmount(e.target.value)}
                disabled={(!displayLive && hasBids) || !marketOpen || submitting}
              />
            </div>
            <button type="submit" disabled={(!displayLive && hasBids) || !marketOpen || submitting}>
              {marketOpen ? (submitting ? "Bidding..." : "Place bid") : "Unavailable"}
            </button>
          </form>
        ) : (
          <button onClick={() => signIn("google")}>Sign in to bid</button>
        )}
        {error ? (
          <p style={{ color: "#b91c1c", marginTop: 8, marginBottom: 0 }}>
            {error}
          </p>
        ) : null}
      </div>

      <div style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Bid history</h3>
        <div style={{ display: "grid", gap: 8, maxHeight: 100, overflowY: "auto" }}>
          {bids.length === 0 ? (
            <p className="muted">No bids yet</p>
          ) : (
            bids.map((bid) => (
              <div
                key={bid.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #f3f4f6",
                  paddingBottom: 8
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>${bid.amount}</div>
                  <div className="muted">
                    {bid.user?.name ?? "Unknown"} · {new Date(bid.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

