// app/lib/actions/register.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendVerificationEmail } from "@/app/lib/email";

export type RegisterResult = { error: string } | { success: true } | undefined;

export async function register(formData: FormData): Promise<RegisterResult> {
  try {
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();
    const username = formData.get("username")?.toString().trim();

    if (!email || !password) return { error: "Email and password are required" };
    if (!username) return { error: "Username is required" };
    if (username.length < 2 || username.length > 20) return { error: "Username must be between 2 and 20 characters" };

    await connectToDatabase();

    const existingEmail = await UserModel.findOne({ email });
    if (existingEmail) return { error: "Email is already registered" };

    const existingUsername = await UserModel.findOne({ username });
    if (existingUsername) return { error: "Username is already taken" };

    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newUser = new UserModel({
      email,
      password: hashedPassword,
      username,
      role: "user",
      verified: false,
      verifyToken,
      verifyTokenExpires,
    });

    await newUser.save();

    try {
      await sendVerificationEmail(email, verifyToken, username);
    } catch (emailErr) {
      console.error("Verification email failed to send:", emailErr);
    }

    return { success: true };
  } catch (err) {
    console.error("Registration error:", err);
    return { error: "Failed to register. Please try again later." };
  }
}
