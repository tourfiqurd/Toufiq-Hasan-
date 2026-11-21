import { adminAuth, USE_FIREBASE_EMULATOR } from './firebaseAdmin.ts';

export interface PasswordSetupEmailResult {
  sent: boolean;
  channel: 'resend' | 'firebase_oob_emulator' | 'logged';
  linkGenerated: boolean;
}

/**
 * Generates a Firebase Auth password-reset ("set your password") link via Admin SDK
 * and dispatches it via Resend API when configured, or handles emulator/dev delivery safely.
 */
export async function sendPasswordSetupEmail(input: {
  email: string;
  recipientName: string;
  institutionName: string;
  institutionCode: string;
  roleLabel: string;
}): Promise<PasswordSetupEmailResult> {
  const actionCodeSettings = process.env.APP_URL
    ? {
        url: `${process.env.APP_URL.replace(/\/+$/, '')}/login`,
        handleCodeInApp: false,
      }
    : undefined;

  const setupLink = await adminAuth.generatePasswordResetLink(
    input.email,
    actionCodeSettings
  );

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'Academia <noreply@academia.edu.bd>';

  if (resendKey) {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [input.email],
        subject: `একাডেমিয়া — ${input.institutionName} (${input.institutionCode}) পাসওয়ার্ড সেট করুন`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #111936;">
            <h2>স্বাগতম, ${input.recipientName}</h2>
            <p><strong>${input.institutionName}</strong> (কোড: <strong>${input.institutionCode}</strong>)-এর ${input.roleLabel} হিসেবে আপনার অ্যাকাউন্ট অনুমোদিত ও প্রস্তুত করা হয়েছে।</p>
            <p>আপনার পাসওয়ার্ড সেট করতে নিচের বাটনে ক্লিক করুন:</p>
            <p><a href="${setupLink}" style="display:inline-block;padding:10px 20px;background:#4F46E5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">পাসওয়ার্ড সেট করুন</a></p>
            <p style="font-size:12px;color:#5D6785;">লিঙ্ক কাজ না করলে ব্রাউজারে খুলুন: ${setupLink}</p>
          </div>
        `,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`ইমেইল পাঠানো যায়নি (${resp.status}): ${body}`);
    }

    return { sent: true, channel: 'resend', linkGenerated: true };
  }

  if (USE_FIREBASE_EMULATOR) {
    console.info(
      `[Emulator Email Dispatch] Set-password email generated for ${input.email} (${input.institutionCode})`
    );
    return { sent: true, channel: 'firebase_oob_emulator', linkGenerated: true };
  }

  console.info(
    `[Password Setup Link Generated] Recipient: ${input.email} (${input.institutionCode})`
  );
  return { sent: true, channel: 'logged', linkGenerated: true };
}
