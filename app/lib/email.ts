import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string, username: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify?token=${token}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Verify your email address",
    html: `
      <p>Hi ${username},</p>
      <p>Thanks for signing up. Click the link below to verify your email address:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, you can ignore this email.</p>
    `,
  });
}
