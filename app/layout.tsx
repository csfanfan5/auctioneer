import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/lib/auth";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: "Auctioneer",
  description: "Auction for italian things"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en">
      <body>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}

