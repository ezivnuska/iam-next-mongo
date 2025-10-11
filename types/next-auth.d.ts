// types/next-auth.d.ts

import { DefaultSession } from "next-auth";
import { UserRole } from "@/app/lib/definitions/user";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    emailVerified?: Date | null;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      role: UserRole;
      emailVerified?: Date | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    email?: string | null;
    role: UserRole;
    emailVerified?: Date | null;
  }
}
