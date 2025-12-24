# Mini Auction (Next.js App Router)

Hardcoded auctions, Google login via NextAuth, and bids stored in Postgres/Prisma. Deployable to Vercel with Neon.

## Folder structure

- `app/` — App Router pages and API routes  
  - `api/auth/[...nextauth]/` — NextAuth handlers  
  - `api/auctions/` — list endpoint  
  - `api/auctions/[id]/` — auction detail endpoint  
  - `api/auctions/[id]/bids/` — bid submission endpoint  
  - `auction/[id]/` — auction detail page + polling client  
  - `page.tsx` — auction list
- `lib/` — Prisma client, NextAuth config, auctions config, bid helpers
- `prisma/schema.prisma` — database models (User, Account, Session, VerificationToken, Bid)
- `types/next-auth.d.ts` — NextAuth session typings

## Environment

See `ENVIRONMENT.md` for required variables.

## Commands

- `pnpm install` (or `npm install`)
- `pnpm prisma:generate`
- `pnpm dev` — start Next.js

## Development notes

- Auctions are hardcoded in `lib/auctions.ts`. Update this file to add/remove auctions.
- Bid validation and insertion happen in a database transaction (`RepeatableRead`) to avoid races on concurrent bids.
- Client polling hits `/api/auctions/[id]` every second while the auction is live.

