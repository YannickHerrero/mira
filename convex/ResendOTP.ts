import Resend from "@auth/core/providers/resend";

function generateOTP(): string {
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString();
}

export const ResendOTP = Resend({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  from: process.env.AUTH_RESEND_FROM ?? "Mira <onboarding@resend.dev>",
  maxAge: 15 * 60, // 15 minutes
  async generateVerificationToken() {
    return generateOTP();
  },
  async sendVerificationRequest({ identifier: email, token }) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.AUTH_RESEND_FROM ?? "Mira <onboarding@resend.dev>",
        to: [email],
        subject: `Your Mira verification code: ${token}`,
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #CAD3F5; margin-bottom: 8px;">Mira</h2>
            <p>Your verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; background: #1e2030; border-radius: 8px; color: #CAD3F5;">
              ${token}
            </div>
            <p style="color: #888; font-size: 14px; margin-top: 16px;">This code expires in 15 minutes.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to send verification email: ${error}`);
    }
  },
});
