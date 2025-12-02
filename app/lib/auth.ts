// app/lib/auth.ts

import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { User } from "next-auth";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import bcrypt from "bcrypt";
import { UserRole } from "@/app/lib/definitions/user";

console.log('[AUTH CONFIG]', {
  AUTH_URL: process.env.AUTH_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NODE_ENV: process.env.NODE_ENV,
});

export const authOptions: NextAuthConfig = {
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const email = String(credentials.email);
        const password = String(credentials.password);

        await connectToDatabase();
        const userDoc = await UserModel.findOne({ email })
        .populate("avatar");
        if (!userDoc) return null;

        const isValid = await bcrypt.compare(password, userDoc.password);
        if (!isValid) return null;

        return {
          id: userDoc._id.toString(),
          username: userDoc.username,
          email: userDoc.email,
          role: userDoc.role,
          emailVerified: userDoc.emailVerified ?? null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // ----------------------
    // JWT callback (runs on sign-in and token refresh)
    // ----------------------
    async jwt({ token, user }: { token: JWT; user?: User }) {
        console.log('[AUTH] JWT callback:', { hasUser: !!user, tokenId: token?.id });
        if (user) {
            Object.assign(token, user, {
                emailVerified: (user as any).emailVerified ?? null,
            });
            console.log('[AUTH] JWT token created with user:', { id: user.id, email: user.email });
        }

        return token;
    },

    // ----------------------
    // Session callback (runs when client calls getSession/useSession)
    // ----------------------
    async session({ session, token }) {
        console.log('[AUTH] Session callback:', { hasToken: !!token, tokenId: token?.id });
        if (!token?.id) return session;
        session.user = {
          id: token.id,
          username: token.username ?? "",
          email: token.email ?? "",
          role: token.role ?? UserRole.User,
          emailVerified: token.emailVerified ?? null,
        };
        console.log('[AUTH] Session created for user:', session.user.id);

        return session;
    },
  },
  pages: { signIn: "/" },
  debug: process.env.NODE_ENV === "development",
};

export const { auth, handlers, signIn, signOut } = NextAuth(authOptions);
