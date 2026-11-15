import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function emailBaseUrl() {
  return process.env.EMAIL_BASE_URL || process.env.NEXTAUTH_URL || 'https://iameric.me';
}

export async function sendVerificationEmail(email: string, token: string, username: string) {
  const verifyUrl = new URL('/verify', emailBaseUrl());
  verifyUrl.searchParams.set('token', token);
  const verifyUrlStr = verifyUrl.toString();
  const safeUsername = escapeHtml(username);

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Verify your email address",
    html: `
      <p>Hi ${safeUsername},</p>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${verifyUrlStr}">${verifyUrlStr}</a></p>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, you can ignore this email.</p>
    `,
  });

  if (error) throw new Error(error.message);
}

export async function sendInvitationEmail(to: string, inviterUsername: string, inviteToken: string) {
  const url = new URL('/signup', emailBaseUrl());
  url.searchParams.set('invite', inviteToken);
  url.searchParams.set('email', to);
  const signupUrl = url.toString();
  const safeUsername = escapeHtml(inviterUsername);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: `An invitation from ${inviterUsername}`,
    html: `
      <p>${safeUsername} has vouched for your character, giving you priority access to this exclusive platform.</p>
      <p><a href="${signupUrl}">Create your account</a></p>
    `,
  });
  if (error) throw new Error(error.message);
}
