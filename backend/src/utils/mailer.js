const nodemailer = require('nodemailer');

/**
 * Helper to get Nodemailer transporter initialized with process.env SMTP config
 */
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    // Optional TLS settings for self-signed certificates or standard ports
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Send Contact Us email submission to designated recipient & optional sender confirmation
 */
const sendContactEmail = async ({ name, email, rollNo, category, subject, message }) => {
  const transporter = getTransporter();
  const recipientEmail = process.env.CONTACT_RECIPIENT_EMAIL || process.env.SMTP_USER || 'admin@codearena.com';

  const mailOptions = {
    from: `"${name} (via CodeArena Contact)" <${process.env.SMTP_USER || email}>`,
    replyTo: email,
    to: recipientEmail,
    subject: `[CodeArena Contact - ${category || 'General'}] ${subject || 'New Contact Submission'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">New Contact Us Form Submission</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px; font-weight: bold; width: 140px; color: #555;">Full Name:</td>
            <td style="padding: 8px; color: #111;">${name}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px; font-weight: bold; color: #555;">Email Address:</td>
            <td style="padding: 8px; color: #111;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #555;">Roll / Reg No:</td>
            <td style="padding: 8px; color: #111;">${rollNo || 'N/A'}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px; font-weight: bold; color: #555;">Category:</td>
            <td style="padding: 8px; color: #111;"><span style="background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 4px; font-size: 13px; font-weight: bold;">${category || 'General Inquiry'}</span></td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #555;">Subject:</td>
            <td style="padding: 8px; color: #111; font-weight: bold;">${subject || 'No Subject'}</td>
          </tr>
        </table>

        <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-left: 4px solid #2563eb; border-radius: 4px;">
          <h4 style="margin: 0 0 10px 0; color: #374151;">Message:</h4>
          <p style="margin: 0; color: #1f2937; white-space: pre-wrap; line-height: 1.5;">${message}</p>
        </div>

        <div style="margin-top: 25px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
          Received from CodeArena Assessment Platform • ${new Date().toLocaleString()}
        </div>
      </div>
    `
  };

  if (!transporter) {
    console.log('⚠️ [SMTP WARNING] SMTP Credentials not configured in .env file.');
    console.log('📬 Contact Form Submission Data Logged:');
    console.log({ name, email, rollNo, category, subject, message });
    return {
      success: true,
      delivered: false,
      message: 'Contact form received and logged. (SMTP credentials pending in .env)'
    };
  }

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ [SMTP SUCCESS] Contact email sent to ${recipientEmail} (MsgID: ${info.messageId})`);
  return {
    success: true,
    delivered: true,
    messageId: info.messageId
  };
};

module.exports = {
  sendContactEmail
};
