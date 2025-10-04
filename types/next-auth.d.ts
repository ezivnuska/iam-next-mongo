// types/next-auth.d.ts

import { DefaultSession } from "next-auth";
import { AppUser } from "@/app/lib/definitions/user";

declare module "next-auth" {
  interface User extends AppUser {
    emailVerified?: Date | null;
  }

  interface Session {
    user: AppUser & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends AppUser {
    emailVerified?: Date | null;
  }
}
