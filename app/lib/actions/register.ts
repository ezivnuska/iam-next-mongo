// app/lib/actions/register.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import bcrypt from "bcrypt";
import { signIn } from "@/app/lib/auth";
import { AuthError } from "next-auth";

export async function register(formData: FormData): Promise<string | undefined> {
  try {
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();
    const username = formData.get("username")?.toString().trim();
    const redirectTo = (formData.get("redirectTo") as string) || "/";

    // Validation
    if (!email || !password) {
      return "Email and password are required";
    }

    if (!username) {
      return "Username is required";
    }

    if (username.length < 2 || username.length > 20) {
      return "Username must be between 2 and 20 characters";
    }

    await connectToDatabase();

    // Check if email already exists
    const existingEmail = await UserModel.findOne({ email });
    if (existingEmail) {
      return "Email is already registered";
    }

    // Check if username already exists
    const existingUsername = await UserModel.findOne({ username });
    if (existingUsername) {
      return "Username is already taken";
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new UserModel({
      email,
      password: hashedPassword,
      username,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newUser.save();

    // Auto-login after successful registration
    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return "Registration successful, but auto-login failed. Please sign in manually.";
      }
      throw error;
    }

    return undefined; // success
  } catch (err) {
    console.error("Registration error:", err);
    return "Failed to register. Please try again later.";
  }
}
