// app/lib/actions/signout.ts

"use server";

export async function signOutUser(): Promise<void> {
  await fetch("/api/auth/signout", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ callbackUrl: "/" }),
  });
}
