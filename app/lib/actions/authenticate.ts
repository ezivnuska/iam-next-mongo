// app/lib/actions/authenticate.ts

"use server";

import { signIn } from "@/app/lib/auth";
import { AuthError } from "next-auth";

export async function authenticate(formData: FormData): Promise<string | undefined> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/";

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }

  return undefined;
}
