import dotenv from 'dotenv';

// Load environment variables
dotenv.config();


const BREVO_API_KEY = process.env.EMAIL_PASSWORD;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const FROM_EMAIL = process.env.EMAIL_USER || 'noreply@onlineauction.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Online Auction';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';


// Base email template wrapper
const emailWrapper = (content: string) => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #E0B84C 0%, #d4a83a 100%); padding: 30px 20px; text-align: center;">
      <h1 style="color: #1a1205; margin: 0; font-size: 28px; font-weight: 700;">🏆 Online Auction</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 30px 25px;">
      ${content}
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px; margin: 0 0 10px 0;">
        © ${new Date().getFullYear()} Online Auction Platform. All rights reserved.
      </p>
      <p style="color: #999; font-size: 11px; margin: 0;">
        This is an automated message. Please do not reply directly to this email.
      </p>
    </div>
  </div>
`;

// CTA button component
const ctaButton = (text: string, url: string, color = '#E0B84C') => `
  <div style="text-align: center; margin: 25px 0;">
    <a href="${url}" style="background-color: ${color}; color: #1a1205; padding: 14px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 14px;">
      ${text}
    </a>
  </div>
`;

// Send email via Brevo API
// Local adapter: EMAIL_TRANSPORT=local keeps messages in memory (tests/dev) instead of calling the provider;
// EMAIL_TRANSPORT=local-fail simulates a provider outage (every send throws) for retry demos/tests.
// `key` identifies the logical message (sent as a custom header for tracing). Brevo offers no idempotent send, so a
// crash after the provider accepted a message but before we recorded it can resend it: delivery is at least once.
export type SentMail = { to: string; subject: string; html: string; key?: string };
type SendResult = { success: true; messageId: string };
type Recipient = { username: string; email: string };

export const mailSink: SentMail[] = [];

const sendEmailViaAPI = async (to: string, subject: string, htmlContent: string, { key }: { key?: string } = {}): Promise<SendResult> => {
  try {
    if (!to || to.trim() === '') {
      throw new Error('Recipient email address is required');
    }

    if (process.env.EMAIL_TRANSPORT === 'local') {
      mailSink.push({ to: to.trim(), subject, html: htmlContent, key });
      return { success: true, messageId: 'local' };
    }
    if (process.env.EMAIL_TRANSPORT === 'local-fail') throw new Error('Mail transport unavailable (EMAIL_TRANSPORT=local-fail)');
    // RFC 2606 reserved domains (seeded demo accounts) can never receive mail; sending would only bounce
    if (/\.(test|example|invalid)$/i.test(to.trim())) return { success: true, messageId: 'skipped-reserved-domain' };

    console.log(`Sending email to: ${to}, Subject: ${subject}`);

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY ?? '',
      },
      body: JSON.stringify({
        to: [{ email: to.trim() }],
        sender: { 
          name: FROM_NAME,
          email: FROM_EMAIL 
        },
        subject: subject,
        htmlContent: emailWrapper(htmlContent),
        ...(key ? { headers: { 'X-Notification-Key': key } } : {}),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Brevo API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log(`Email sent successfully to ${to}: ${data.messageId}`);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('Error sending email via Brevo API:', error);
    throw error;
  }
};

// ============================================
// AUTHENTICATION EMAILS
// ============================================

// Send welcome email after registration
export const sendWelcomeEmail = async (to: string, username: string, verificationCode: string) => {
  const htmlContent = `
    <h2 style="color: #333; margin-bottom: 20px;">Welcome to Online Auction, ${username}! 🎉</h2>
    <p style="color: #555; line-height: 1.6;">Thank you for joining our auction community. We're excited to have you on board!</p>
    <p style="color: #555; line-height: 1.6;">To activate your account, please verify your email using the code below:</p>
    
    <div style="background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
      <p style="font-size: 13px; margin: 0 0 10px 0; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
      <p style="font-size: 36px; font-weight: bold; color: #E0B84C; letter-spacing: 8px; margin: 0;">${verificationCode}</p>
    </div>
    
    <p style="color: #555; line-height: 1.6;">Enter this code on the verification page to activate your account. <strong>The code will expire in 24 hours.</strong></p>
    
    <p style="color: #555; line-height: 1.6;">Once verified, you can:</p>
    <ul style="color: #555; line-height: 1.8;">
      <li>Browse and bid on thousands of items</li>
      <li>Create your own auctions</li>
      <li>Track your bids and wins</li>
    </ul>
  `;

  return sendEmailViaAPI(to, '🎉 Welcome to Online Auction - Please Verify Your Email', htmlContent);
};

// Send password reset OTP
export const sendPasswordResetOTP = async (to: string, username: string, otp: string) => {
  const htmlContent = `
    <h2 style="color: #333; margin-bottom: 20px;">🔑 Password Reset Request</h2>
    <p style="color: #555;">Hello <strong>${username}</strong>,</p>
    <p style="color: #555; line-height: 1.6;">We received a request to reset your password. Use the verification code below:</p>
    
    <div style="background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
      <p style="font-size: 13px; margin: 0 0 10px 0; color: #666; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
      <p style="font-size: 36px; font-weight: bold; color: #E0B84C; letter-spacing: 8px; margin: 0;">${otp}</p>
    </div>
    
    <p style="color: #555;"><strong>This code will expire in 15 minutes.</strong></p>
    <p style="color: #888; font-size: 13px;">If you didn't request this password reset, please ignore this email.</p>
  `;

  return sendEmailViaAPI(to, '🔑 Password Reset Code - Online Auction', htmlContent);
};

/**
 * Send change password OTP
 * Sends a 6-digit OTP to the user's email for password change verification
 */
export const sendChangePasswordOTP = async (to: string, username: string, otp: string) => {
  const htmlContent = `
    <h2 style="color: #333; margin-bottom: 20px;">🔐 Password Change Request</h2>
    <p style="color: #555;">Hello <strong>${username}</strong>,</p>
    <p style="color: #555; line-height: 1.6;">You requested to change your password. Please use the following verification code:</p>
    
    <div style="background: linear-gradient(135deg, #E0B84C 0%, #d4a83a 100%); border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
      <p style="margin: 0 0 10px 0; color: #1a1205; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Verification Code</p>
      <p style="margin: 0; color: #1a1205; font-size: 42px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
    </div>
    
    <p style="color: #d9534f; font-weight: 600;">⏰ This code will expire in 10 minutes.</p>
    
    <p style="color: #555; line-height: 1.6;">
      If you didn't request a password change, please ignore this email and ensure your account is secure.
    </p>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #856404; font-size: 13px;">
        🔒 <strong>Security Tip:</strong> Never share this code with anyone. Our staff will never ask for your verification code.
      </p>
    </div>
  `;

  return sendEmailViaAPI(to, '🔐 Password Change Verification Code', htmlContent);
};

/**
 *  10. REJECTED REQUEST TO SELLER - SEND TO BUYER
 *  Notifies the buyer that their request to become a seller was rejected
 */
export const sendSellerRequestRejected = async (buyer: Recipient) => {
  const htmlContent = `
    <h2 style="color: #d9534f; margin-bottom: 20px;">❌ Seller Request Rejected</h2>
    <p style="color: #555;">Hello <strong>${buyer.username}</strong>,</p>
    <p style="color: #555; line-height: 1.6;">We regret to inform you that your request to become a seller on our platform has been rejected after careful consideration.</p>
    
    <p style="color: #555; line-height: 1.6;">If you have any questions or would like feedback on your application, please feel free to contact our support team.</p>
    
    ${ctaButton('Contact Support', `${FRONTEND_URL}/support`, '#d9534f')}
    
    <p style="color: #555; line-height: 1.6;">Thank you for your understanding, and we hope to see you continue as a valued buyer on our platform.</p>
  `;

  return sendEmailViaAPI(buyer.email, '❌ Seller Request Rejected - Online Auction', htmlContent);
};


/** 
 * 11. ACCEPTED REQUEST TO SELLER - SEND TO BUYER
 * 
*/

export const sendSellerRequestAccepted = async (buyer: Recipient) => {
  const htmlContent = `
    <h2 style="color: #28a745; margin-bottom: 20px;">✅ Seller Request Accepted</h2>
    <p style="color: #555;">Hello <strong>${buyer.username}</strong>,</p>
    <p style="color: #555; line-height: 1.6;">Congratulations! Your request to become a seller on our platform has been approved.</p>
    
    <p style="color: #555; line-height: 1.6;">You can now start creating auctions and selling your items to our community of buyers.</p>
    
    ${ctaButton('Start Selling', `${FRONTEND_URL}/create-auction`, '#28a745')}
    
    <p style="color: #555; line-height: 1.6;">If you have any questions or need assistance, please feel free to contact our support team.</p>
  `;

  return sendEmailViaAPI(buyer.email, '✅ Seller Request Accepted - Online Auction', htmlContent);
};

// ============================================
// UTILITY EXPORTS
// ============================================

// Generic email sender
export const sendEmail = async (to: string, subject: string, html: string, options?: { key?: string }) => {
  return sendEmailViaAPI(to, subject, html, options);
};