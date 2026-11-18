// app/lib/actions/register.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import Invitation from "@/app/lib/models/invitation";
import Friendship from "@/app/lib/models/friendship";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendVerificationEmail } from "@/app/lib/email";

export type RegisterResult = { error: string } | { success: true } | undefined;

export async function register(formData: FormData): Promise<RegisterResult> {
  try {
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();
    const username = formData.get("username")?.toString().trim();
    const inviteToken = formData.get("inviteToken")?.toString().trim() || null;

    if (!email || !password) return { error: "Email and password are required" };
    if (password.length < 8) return { error: "Password must be at least 8 characters" };
    if (!username) return { error: "Username is required" };
    if (!/^[a-zA-Z0-9_.-]{2,20}$/.test(username)) return { error: "Username must be 2–20 characters and contain only letters, numbers, underscores, hyphens, or dots" };

    if (!inviteToken) return { error: "An invitation is required to create an account." };

    await connectToDatabase();

    // Validate before claiming to avoid having to reset used: false on mismatch,
    // which would open a replay race window.
    const pendingInvitation = await Invitation.findOne({ token: inviteToken, used: false });
    if (!pendingInvitation) return { error: "This invitation link is invalid or has already been used." };
    if (pendingInvitation.inviteeEmail !== email.toLowerCase()) {
      return { error: "This invitation was sent to a different email address." };
    }
    // Atomically claim the invitation — guards against concurrent requests.
    const invitation = await Invitation.findOneAndUpdate(
      { _id: pendingInvitation._id, used: false },
      { $set: { used: true } },
      { new: false }
    );
    if (!invitation) return { error: "This invitation link is invalid or has already been used." };
    const inviter = await UserModel.findById(invitation.inviterId).select('_id').lean();
    if (!inviter) return { error: "The person who invited you no longer has an account." };

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
      await Friendship.create({
        requester: invitation.inviterId,
        recipient: newUser._id,
        status: 'pending',
      });
    } catch (err) {
      console.error("Failed to create invitation friendship:", err);
    }

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
