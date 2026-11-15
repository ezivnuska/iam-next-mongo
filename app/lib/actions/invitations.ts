"use server";

import crypto from "crypto";
import { requireAuthWithUsername } from "@/app/lib/utils/auth/utils";
import { connectToDatabase } from "@/app/lib/mongoose";
import Invitation from "@/app/lib/models/invitation";
import { sendInvitationEmail } from "@/app/lib/email";

export async function checkExistingInvitation(email: string): Promise<boolean> {
    const { id: inviterId } = await requireAuthWithUsername();
    await connectToDatabase();
    const existing = await Invitation.findOne({
        inviterId,
        inviteeEmail: email.toLowerCase().trim(),
        used: false,
    }).lean();
    return !!existing;
}

export async function sendInviteAction(email: string) {
    const { id: inviterId, username } = await requireAuthWithUsername();
    await connectToDatabase();

    const token = crypto.randomBytes(32).toString("hex");
    await Invitation.create({ inviterId, inviteeEmail: email.toLowerCase().trim(), token });

    await sendInvitationEmail(email, username, token);
}
