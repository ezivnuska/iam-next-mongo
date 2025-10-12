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

    try {
      await signIn("credentials", {
        email,
        password,
        redirect: true,
        callbackUrl: redirectTo,
      });
      return undefined; // success
    } catch (error) {
      console.error("Sign in after registration failed:", error);
      return "Registration successful, but auto-login failed. Please sign in manually.";
    }
  } catch (err) {
    console.error("Registration error:", err);
    return "Failed to register. Please try again later.";
  }
}
