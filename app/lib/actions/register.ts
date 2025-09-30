// app/lib/actions/register.ts

"use client";

import { signIn } from "next-auth/react";

export async function register(formData: FormData): Promise<string | undefined> {
  try {
    const response = await fetch("/api/register", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      return data.error || "An unexpected error occurred";
    }

    // Auto-login after successful registration
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const redirectTo = (formData.get("redirectTo") as string) || "/";

    const result = await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: redirectTo,
    });

    if (result?.error) {
      return result.error;
    }

    return undefined; // successful registration & login
  } catch (err) {
    console.error("Registration error:", err);
    return "Failed to register. Please try again later.";
  }
}
