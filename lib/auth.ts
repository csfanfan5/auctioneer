import NextAuth, { type DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    })
  ],
  session: {
    strategy: "database"
  },
  callbacks: {
    session: async ({ session, user }) => {
      if (session && session.user) {
        (session.user as DefaultSession["user"] & { id: string }).id = user.id;
      }
      return session;
    }
  }
});

export const { handlers: authHandlers, signIn, signOut, auth } = authOptions;

