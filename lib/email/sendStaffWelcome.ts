import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface StaffWelcomeParams {
  to: string
  full_name: string
  role: string
  password: string
  login_url: string
}

export async function sendStaffWelcomeEmail(params: StaffWelcomeParams) {
  const { to, full_name, role, password, login_url } = params

  const { data, error } = await resend.emails.send({
    from: 'Pseudo Café <onboarding@resend.dev>',
    to,
    subject: `You've been added to Pseudo Café — Your login details`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Pseudo Café</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:16px;border:1px solid #222222;overflow:hidden;max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#111111 100%);padding:36px 40px;border-bottom:1px solid #222222;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                      🍕 Pseudo Café
                    </p>
                    <p style="margin:6px 0 0;font-size:13px;color:#666666;">Staff Management System</p>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background-color:#eab308;color:#000000;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;">${role}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">
                Welcome, ${full_name}!
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#888888;line-height:1.6;">
                You've been added to the Pseudo Café team as a <strong style="color:#eab308;">${role}</strong>.
                Use the credentials below to sign in to your staff portal.
              </p>

              <!-- Credentials Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 16px;font-size:11px;font-weight:600;color:#555555;letter-spacing:1px;text-transform:uppercase;">Your Login Credentials</p>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #222222;">
                          <p style="margin:0;font-size:12px;color:#555555;">Email</p>
                          <p style="margin:4px 0 0;font-size:15px;color:#ffffff;font-weight:500;">${to}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;">
                          <p style="margin:0;font-size:12px;color:#555555;">Password</p>
                          <p style="margin:4px 0 0;font-size:18px;color:#eab308;font-weight:700;font-family:monospace;letter-spacing:1px;">${password}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${login_url}" style="display:inline-block;background-color:#eab308;color:#000000;font-size:15px;font-weight:700;padding:14px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
                      Sign In to Staff Portal →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:13px;color:#555555;line-height:1.6;text-align:center;">
                We recommend changing your password after your first login.<br/>
                If you have any issues, contact your manager.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1a1a1a;background-color:#0d0d0d;">
              <p style="margin:0;font-size:12px;color:#444444;text-align:center;">
                © ${new Date().getFullYear()} Pseudo Café · This email was sent because a manager added you to the team.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  })

  return { data, error }
}
