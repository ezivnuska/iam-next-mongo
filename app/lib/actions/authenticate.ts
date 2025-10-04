// app/lib/actions/authenticate.ts

import { signIn } from "next-auth/react";

export async function authenticate(formData: FormData): Promise<string | undefined> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/";

  const result = await signIn("credentials", {
    email,
    password,
    redirect: true,
    callbackUrl: redirectTo,
  });

  if (result?.error) return result.error;
  return undefined;
}
