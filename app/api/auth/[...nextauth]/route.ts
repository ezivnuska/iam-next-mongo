// app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import type { Account, Profile, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import type { User } from "@/app/lib/definitions/user";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import bcrypt from 'bcrypt'
import { Image, ImageDocument } from "@/app/lib/definitions";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials: any) {
        console.log("[authorize] credentials", credentials);
        await connectToDatabase();
      
        // Populate avatar with ImageDocument
        const userDoc = await UserModel.findOne({ email: credentials.email }).populate<{ avatar: ImageDocument }>('avatar');
      
        if (!userDoc) {
            console.log("[authorize] user not found");
            return null;
        }
      
        const user = userDoc.toObject();
        console.log("[authorize] found user", user);
      
        const isValid = await bcrypt.compare(credentials.password, user.password);
        console.log("[authorize] password valid?", isValid);
      
        let avatar: Image | undefined;
      
        if (user.avatar && typeof user.avatar !== 'string' && '_id' in user.avatar) {
            const a = user.avatar as ImageDocument;
            avatar = {
                id: a._id.toString(),
                userId: a.userId,
                filename: a.filename,
                username: a.username,
                url: a.url ?? '',
                alt: a.alt ?? '',
                variants: a.variants ?? [],
                likes: (a.likes ?? []).map(l => l.toString()),
                likedByCurrentUser: false,
            };
        }
      
        return {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            bio: user.bio,
            verified: user.verified,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            avatar,
        };
      }      
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt(params: { token: JWT; user?: User | Record<string, any>; account: Account | null; profile?: Profile; trigger?: string; isNewUser?: boolean; session?: Session }) {
        const { token, user } = params;
        if (user && 'id' in user) {  // type guard for your AppUser
            token.id = user.id;
            token.username = (user as any).username;
            token.role = (user as any).role;
            token.email = user.email;
            token.avatar = user.avatar as User['avatar'];
        }
        return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
        session.user = {
          ...session.user,
          id: token.id as string,
          username: token.username as string,
          role: token.role,
          avatar: token.avatar,
        };
        return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  debug: true,
});

export const { GET, POST } = handlers;
