"use server";

import { signIn } from "@/app/lib/auth";
import { AuthError } from "next-auth";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import bcrypt from "bcrypt";
import { VERIFICATION_CUTOFF } from "@/app/lib/constants";

export async function authenticateWithToken(autoLoginToken: string): Promise<void> {
  await signIn("credentials", { autoLoginToken, redirectTo: "/" });
}

export async function authenticate(formData: FormData): Promise<string | undefined> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/";

  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin": {
          // Only surface the "verify" message when the password was actually correct —
          // prevents email enumeration (attacker needs valid credentials to reach this branch).
          await connectToDatabase();
          const user = await UserModel.findOne({ email }).select("password verified createdAt");
          if (user) {
            const passwordCorrect = await bcrypt.compare(password, user.password);
            if (passwordCorrect && user.createdAt >= VERIFICATION_CUTOFF && !user.verified) {
              return "verify:Please verify your email before signing in.";
            }
          }
          return "Invalid credentials.";
        }
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }

  return undefined;
}
