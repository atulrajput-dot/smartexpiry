/** Email templates. Inline styles only — most mail clients ignore <style>. */

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function verificationOtpEmail(input: { name: string; otp: string; expiresInMinutes: number }) {
  const name = escapeHtml(input.name);
  const otp = escapeHtml(input.otp);

  const subject = `${input.otp} is your SmartExpiry verification code`;

  const text = [
    `Hi ${input.name},`,
    "",
    "Use this code to verify your SmartExpiry admin email:",
    "",
    `    ${input.otp}`,
    "",
    `The code expires in ${input.expiresInMinutes} minutes.`,
    "Never share this code with anyone. If you didn't request it, you can ignore this email.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f7f5;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0f1f1a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #dde5e2;border-radius:12px">
          <tr><td style="padding:28px 32px 0">
            <div style="font-size:18px;font-weight:700;color:#047857">SmartExpiry</div>
          </td></tr>
          <tr><td style="padding:20px 32px 8px">
            <h1 style="margin:0 0 12px;font-size:20px">Verify your email</h1>
            <p style="margin:0 0 12px;line-height:1.6">Hi ${name},</p>
            <p style="margin:0 0 20px;line-height:1.6">Enter this code on the verification page to activate your SmartExpiry admin account:</p>
            <div style="margin:0 0 20px;padding:18px;background:#e3efe9;border-radius:10px;text-align:center">
              <span style="font-family:Consolas,Menlo,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#047857">${otp}</span>
            </div>
            <p style="margin:0;font-size:14px;color:#5b6b65;line-height:1.6">This code expires in <strong>${input.expiresInMinutes} minutes</strong>.</p>
          </td></tr>
          <tr><td style="padding:16px 32px 28px;font-size:12px;color:#5b6b65;line-height:1.6">
            Never share this code with anyone — SmartExpiry staff will never ask for it. If you didn't request this, you can ignore this email.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

export function passwordResetOtpEmail(input: { name: string; otp: string; expiresInMinutes: number }) {
  const name = escapeHtml(input.name);
  const otp = escapeHtml(input.otp);

  const subject = `${input.otp} is your SmartExpiry password reset code`;

  const text = [
    `Hi ${input.name},`,
    "",
    "Use this code to reset your SmartExpiry admin password:",
    "",
    `    ${input.otp}`,
    "",
    `The code expires in ${input.expiresInMinutes} minutes.`,
    "Never share this code with anyone. If you didn't ask to reset your password, ignore this email — your password stays the same.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f7f5;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0f1f1a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #dde5e2;border-radius:12px">
          <tr><td style="padding:28px 32px 0">
            <div style="font-size:18px;font-weight:700;color:#047857">SmartExpiry</div>
          </td></tr>
          <tr><td style="padding:20px 32px 8px">
            <h1 style="margin:0 0 12px;font-size:20px">Reset your password</h1>
            <p style="margin:0 0 12px;line-height:1.6">Hi ${name},</p>
            <p style="margin:0 0 20px;line-height:1.6">Enter this code on the reset page to choose a new password for your SmartExpiry admin account:</p>
            <div style="margin:0 0 20px;padding:18px;background:#e3efe9;border-radius:10px;text-align:center">
              <span style="font-family:Consolas,Menlo,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#047857">${otp}</span>
            </div>
            <p style="margin:0;font-size:14px;color:#5b6b65;line-height:1.6">This code expires in <strong>${input.expiresInMinutes} minutes</strong>.</p>
          </td></tr>
          <tr><td style="padding:16px 32px 28px;font-size:12px;color:#5b6b65;line-height:1.6">
            Never share this code with anyone — SmartExpiry staff will never ask for it. If you didn't ask to reset your password, ignore this email — your password stays the same.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
