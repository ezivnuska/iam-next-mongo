"use server";

import { requireAuthWithUsername } from "@/app/lib/utils/auth/utils";
import { sendInvitationEmail } from "@/app/lib/email";

export async function sendInviteAction(email: string) {
    const { username } = await requireAuthWithUsername();
    await sendInvitationEmail(email, username);
}
