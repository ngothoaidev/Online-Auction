import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { formatCurrency } from './format.js';
import { formatDate } from './format.js';

const BREVO_API_KEY = process.env.EMAIL_PASSWORD;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const FROM_EMAIL = process.env.EMAIL_USER || 'noreply@onlineauction.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Online Auction';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';


// Base email template wrapper
const emailWrapper = (content) => `
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

// Auction info card component
const auctionCard = (auction) => `
  <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #E0B84C;">
    <table style="width: 100%;">
      <tr>
        <td style="width: 80px; vertical-align: top;">
          <img src="${auction.imageUrl || 'https://via.placeholder.com/80'}" alt="${auction.title}" 
               style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
        </td>
        <td style="padding-left: 15px; vertical-align: top;">
          <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">
            <a href="${FRONTEND_URL}/auction/${auction.id}" style="color: #333; text-decoration: none;">${auction.title}</a>
          </h3>
          <p style="margin: 0; color: #666; font-size: 14px;">
            Current Price: <strong style="color: #E0B84C;">${formatCurrency(auction.currentPrice)}</strong>
          </p>
          ${auction.endTime ? `<p style="margin: 5px 0 0 0; color: #888; font-size: 12px;">Ends: ${formatDate(auction.endTime)}</p>` : ''}
        </td>
      </tr>
    </table>
  </div>
`;

// CTA button component
const ctaButton = (text, url, color = '#E0B84C') => `
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
export const mailSink = [];

const sendEmailViaAPI = async (to, subject, htmlContent, { key } = {}) => {
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
        'api-key': BREVO_API_KEY,
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

// Send email to multiple recipients
const sendBulkEmail = async (recipients, subject, htmlContent) => {
  const results = [];
  for (const recipient of recipients) {
    try {
      const result = await sendEmailViaAPI(recipient.email, subject, htmlContent);
      results.push({ email: recipient.email, success: true, ...result });
    } catch (error) {
      results.push({ email: recipient.email, success: false, error: error.message });
    }
  }
  return results;
};

// ============================================
// AUTHENTICATION EMAILS
// ============================================

// Send welcome email after registration
export const sendWelcomeEmail = async (to, username, verificationCode) => {
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

// Send login notification
// export const sendLoginNotification = async (to, username, loginDetails) => {
//   const htmlContent = `
//     <h2 style="color: #333; margin-bottom: 20px;">🔐 New Login Detected</h2>
//     <p style="color: #555;">Hello <strong>${username}</strong>,</p>
//     <p style="color: #555; line-height: 1.6;">We detected a new login to your account:</p>
    
//     <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
//       <p style="margin: 5px 0;"><strong>Time:</strong> ${formatDate(new Date())}</p>
//       <p style="margin: 5px 0;"><strong>IP Address:</strong> ${loginDetails.ip || 'Unknown'}</p>
//       <p style="margin: 5px 0;"><strong>Device:</strong> ${loginDetails.device || 'Unknown'}</p>
//     </div>
    
//     <p style="color: #555;">If this was you, you can safely ignore this email.</p>
//     <p style="color: #d9534f;"><strong>If you didn't log in, please secure your account immediately by changing your password.</strong></p>
//   `;

//   return sendEmailViaAPI(to, '🔐 New Login to Your Account', htmlContent);
// };

// Send password reset OTP
export const sendPasswordResetOTP = async (to, username, otp) => {
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

// Send password reset email with link
// export const sendPasswordResetEmail = async (to, username, resetToken) => {
//   const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

//   const htmlContent = `
//     <h2 style="color: #333; margin-bottom: 20px;">🔑 Password Reset Request</h2>
//     <p style="color: #555;">Hello <strong>${username}</strong>,</p>
//     <p style="color: #555; line-height: 1.6;">We received a request to reset your password. Click the button below to reset it:</p>
    
//     ${ctaButton('Reset Password', resetUrl, '#007bff')}
    
//     <p style="color: #888; font-size: 13px;">Or copy and paste this link into your browser:</p>
//     <p style="color: #007bff; word-break: break-all; font-size: 12px;">${resetUrl}</p>
    
//     <p style="color: #d9534f;"><strong>This link will expire in 1 hour.</strong></p>
//     <p style="color: #888; font-size: 13px;">If you didn't request this, please ignore this email.</p>
//   `;

//   return sendEmailViaAPI(to, '🔑 Password Reset Request - Online Auction', htmlContent);
// };

// Send email verification
export const sendEmailVerification = async (to, username, verificationToken) => {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const htmlContent = `
    <h2 style="color: #333; margin-bottom: 20px;">✉️ Verify Your Email</h2>
    <p style="color: #555;">Hello <strong>${username}</strong>,</p>
    <p style="color: #555; line-height: 1.6;">Please verify your email address by clicking the button below:</p>
    
    ${ctaButton('Verify Email', verifyUrl, '#28a745')}
    
    <p style="color: #888; font-size: 13px;">Or copy and paste this link into your browser:</p>
    <p style="color: #28a745; word-break: break-all; font-size: 12px;">${verifyUrl}</p>
    
    <p style="color: #555;"><strong>This link will expire in 24 hours.</strong></p>
  `;

  return sendEmailViaAPI(to, '✉️ Verify Your Email - Online Auction', htmlContent);
};

// ============================================
// AUCTION BIDDING EMAILS
// ============================================

/**
 * 1. NEW BID PLACED - Send to SELLER
 * Notifies the seller that a new bid has been placed on their auction
 */
export const sendNewBidToSeller = async (seller, auction, bidder, bidAmount) => {
  const htmlContent = `
    <h2 style="color: #333; margin-bottom: 20px;">💰 New Bid on Your Auction!</h2>
    <p style="color: #555;">Hello <strong>${seller.username}</strong>,</p>
    <p style="color: #555; line-height: 1.6;">Great news! Someone just placed a bid on your auction:</p>
    
    ${auctionCard({ ...auction, currentPrice: bidAmount })}
    
    <div style="background: #e8f5e9; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #2e7d32;">
        <strong>${bidder.username}</strong> placed a bid of <strong style="font-size: 18px;">${formatCurrency(bidAmount)}</strong>
      </p>
    </div>
    
    <p style="color: #555;">Your auction now has <strong>${auction.bidCount + 1} bids</strong>.</p>
    
    ${ctaButton('View Auction', `${FRONTEND_URL}/auction/${auction.id}`)}
  `;

  return sendEmailViaAPI(seller.email, `💰 New Bid: ${formatCurrency(bidAmount)} on "${auction.title}"`, htmlContent);
};

/**
 * 2. NEW BID PLACED - Send to BIDDER (confirmation)
 * Confirms to the bidder that their bid was successful
 */
export const sendBidConfirmationToBidder = async (bidder, auction, bidAmount) => {
  const htmlContent = `
    <h2 style="color: #333; margin-bottom: 20px;">✅ Bid Placed Successfully!</h2>
    <p style="color: #555;">Hello <strong>${bidder.username}</strong>,</p>
    <p style="color: #555; line-height: 1.6;">Your bid has been successfully placed!</p>
    
    ${auctionCard({ ...auction, currentPrice: bidAmount })}
    
    <div style="background: #e8f5e9; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 5px 0; color: #666; font-size: 13px;">Your Bid Amount</p>
      <p style="margin: 0; color: #2e7d32; font-size: 28px; font-weight: bold;">${formatCurrency(bidAmount)}</p>
    </div>
    
    <p style="color: #555; line-height: 1.6;">You are currently the <strong style="color: #E0B84C;">highest bidder</strong>! We'll notify you if someone outbids you.</p>
    <p style="color: #888; font-size: 13px;">Auction ends: <strong>${formatDate(auction.endTime)}</strong></p>
    
    ${ctaButton('Track Your Bid', `${FRONTEND_URL}/auction/${auction.id}`)}
  `;

  return sendEmailViaAPI(bidder.email, `✅ Bid Confirmed: ${formatCurrency(bidAmount)} on "${auction.title}"`, htmlContent);
};

/**
 * 3. OUTBID NOTIFICATION - Send to PREVIOUS HIGHEST BIDDER
 * Notifies the previous highest bidder that they have been outbid
 */
export const sendOutbidNotification = async (previousBidder, auction, newBidAmount, previousBidAmount) => {
  const htmlContent = `
    <h2 style="color: #d9534f; margin-bottom: 20px;">⚠️ You've Been Outbid!</h2>
    <p style="color: #555;">Hello <strong>${previousBidder.username}</strong>,</p>
    <p style="color: #555; line-height: 1.6;">Someone just placed a higher bid on an auction you're watching:</p>
    
    ${auctionCard({ ...auction, currentPrice: newBidAmount })}
    
    <div style="background: #fff3cd; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <table style="width: 100%;">
        <tr>
          <td style="text-align: center; padding: 10px;">
            <p style="margin: 0; color: #888; font-size: 12px;">Your Previous Bid</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 18px; text-decoration: line-through;">${formatCurrency(previousBidAmount)}</p>
          </td>
          <td style="text-align: center; color: #E0B84C; font-size: 24px;">→</td>
          <td style="text-align: center; padding: 10px;">
            <p style="margin: 0; color: #888; font-size: 12px;">New Highest Bid</p>
            <p style="margin: 5px 0 0 0; color: #d9534f; font-size: 18px; font-weight: bold;">${formatCurrency(newBidAmount)}</p>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="color: #555; line-height: 1.6;">Don't miss out! Place a higher bid to stay in the game.</p>
    <p style="color: #888; font-size: 13px;">Auction ends: <strong>${formatDate(auction.endTime)}</strong></p>
    
    ${ctaButton('Place a Higher Bid', `${FRONTEND_URL}/auction/${auction.id}`, '#d9534f')}
  `;

  return sendEmailViaAPI(previousBidder.email, `⚠️ Outbid! New bid on "${auction.title}"`, htmlContent);
};

/**
 * 4. BID REJECTED - Send to BUYER
 * Notifies the buyer that their bid was rejected (e.g., by seller or system)
 */
export const sendBidRejectedNotification = async (bidder, auction, bidAmount, reason = '') => {
  const htmlContent = `
    <h2 style="color: #d9534f; margin-bottom: 20px;">❌ Bid Rejected</h2>
    <p style="color: #555;">Hello <strong>${bidder.username}</strong>,</p>
    <p style="color: #555; line-height: 1.6;">Unfortunately, your bid has been rejected:</p>
    
    ${auctionCard(auction)}
    
    <div style="background: #f8d7da; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; color: #721c24;">
        <strong>Rejected Bid:</strong> ${formatCurrency(bidAmount)}
      </p>
      ${reason ? `<p style="margin: 0; color: #721c24;"><strong>Reason:</strong> ${reason}</p>` : ''}
    </div>
    
    <p style="color: #555; line-height: 1.6;">The seller has the right to reject bids from certain buyers. You may browse other auctions on our platform.</p>
    
    ${ctaButton('Browse Other Auctions', `${FRONTEND_URL}/search`)}
  `;

  return sendEmailViaAPI(bidder.email, `❌ Bid Rejected on "${auction.title}"`, htmlContent);
};

// ============================================
// AUCTION ENDING EMAILS
// ============================================

/**
 * 5. AUCTION ENDED - NO WINNER (Send to SELLER)
 * Notifies the seller that their auction ended without any bids
 */
export const sendAuctionEndedNoWinner = async (seller, auction) => {
  const htmlContent = `
    <h2 style="color: #6c757d; margin-bottom: 20px;">⏰ Auction Ended - No Bids</h2>
    <p style="color: #555;">Hello <strong>${seller.username}</strong>,</p>
    <p style="color: #555; line-height: 1.6;">Your auction has ended without receiving any bids:</p>
    
    ${auctionCard(auction)}
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #6c757d; font-size: 16px;">
        😔 No bids were placed on this auction
      </p>
    </div>
    
    <p style="color: #555; line-height: 1.6;">Don't be discouraged! Here are some tips to improve your next auction:</p>
    <ul style="color: #555; line-height: 1.8;">
      <li>Add more detailed photos</li>
      <li>Write a compelling description</li>
      <li>Consider adjusting your starting price</li>
      <li>Choose optimal auction timing</li>
    </ul>
    
    ${ctaButton('Create New Auction', `${FRONTEND_URL}/create-auction`)}
  `;

  return sendEmailViaAPI(seller.email, `⏰ Auction Ended: "${auction.title}" - No Bids Received`, htmlContent);
};

/**
 * 6. AUCTION ENDED - SUCCESS (Send to SELLER)
 * Notifies the seller that their auction ended successfully with a winner
 */
export const sendAuctionEndedToSeller = async (seller, auction, winner) => {
  const htmlContent = `
    <h2 style="color: #28a745; margin-bottom: 20px;">🎉 Congratulations! Auction Sold!</h2>
    <p style="color: #555;">Hello <strong>${seller.username}</strong>,</p>
    <p style="color: #555; line-height: 1.6;">Great news! Your auction has ended successfully:</p>
    
    ${auctionCard(auction)}
    
    <div style="background: #d4edda; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%;">
        <tr>
          <td style="text-align: center; border-right: 1px solid #c3e6cb; padding: 10px;">
            <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase;">Final Price</p>
            <p style="margin: 5px 0 0 0; color: #28a745; font-size: 24px; font-weight: bold;">${formatCurrency(auction.currentPrice)}</p>
          </td>
          <td style="text-align: center; padding: 10px;">
            <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase;">Winner</p>
            <p style="margin: 5px 0 0 0; color: #333; font-size: 18px; font-weight: bold;">@${winner.username}</p>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="color: #555; line-height: 1.6;">
      <strong>Next Steps:</strong> Please contact the winner to arrange payment and delivery details.
    </p>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0 0 5px 0; color: #666; font-size: 13px;">Winner's Email:</p>
      <p style="margin: 0;"><a href="mailto:${winner.email}" style="color: #007bff;">${winner.email}</a></p>
    </div>
    
    ${ctaButton('View Transaction Details', `${FRONTEND_URL}/auction/${auction.id}`)}
  `;

  return sendEmailViaAPI(seller.email, `🎉 Sold! "${auction.title}" for ${formatCurrency(auction.currentPrice)}`, htmlContent);
};

/**
 * 7. AUCTION WON - Send to WINNER
 * Notifies the winning bidder that they won the auction
 */
export const sendAuctionWonToWinner = async (winner, auction, seller) => {
  const htmlContent = `
    <h2 style="color: #28a745; margin-bottom: 20px;">🏆 Congratulations! You Won!</h2>
    <p style="color: #555;">Hello <strong>${winner.username}</strong>,</p>
    <p style="color: #555; line-height: 1.6;">Amazing news! You are the winning bidder:</p>
    
    ${auctionCard(auction)}
    
    <div style="background: linear-gradient(135deg, #ffd700 0%, #E0B84C 100%); border-radius: 8px; padding: 25px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 10px 0; color: #1a1205; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">🏆 Winning Bid 🏆</p>
      <p style="margin: 0; color: #1a1205; font-size: 32px; font-weight: bold;">${formatCurrency(auction.currentPrice)}</p>
    </div>
    
    <p style="color: #555; line-height: 1.6;">
      <strong>Next Steps:</strong> Please contact the seller to complete the transaction.
    </p>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0 0 5px 0; color: #666; font-size: 13px;">Seller Information:</p>
      <p style="margin: 0 0 5px 0;"><strong>@${seller.username}</strong></p>
      <p style="margin: 0;"><a href="mailto:${seller.email}" style="color: #007bff;">${seller.email}</a></p>
    </div>
    
    ${ctaButton('View Your Win', `${FRONTEND_URL}/auction/${auction.id}`)}
    
    <p style="color: #888; font-size: 13px; margin-top: 20px;">
      Please complete the payment within 3 days to secure your purchase.
    </p>
  `;

  return sendEmailViaAPI(winner.email, `🏆 You Won! "${auction.title}" for ${formatCurrency(auction.currentPrice)}`, htmlContent);
};

// ============================================
// Q&A EMAILS
// ============================================

/**
 * 8. NEW QUESTION - Send to SELLER
 * Notifies the seller that a buyer asked a question
 */
export const sendQuestionToSeller = async (seller, auction, buyer, question) => {
  const htmlContent = `
    <h2 style="color: #333; margin-bottom: 20px;">❓ New Question on Your Auction</h2>
    <p style="color: #555;">Hello <strong>${seller.username}</strong>,</p>
    <p style="color: #555; line-height: 1.6;">A potential buyer has asked a question about your auction:</p>
    
    ${auctionCard(auction)}
    
    <div style="background: #e3f2fd; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #2196f3;">
      <p style="margin: 0 0 10px 0; color: #1565c0; font-size: 13px;">
        <strong>@${buyer.username}</strong> asks:
      </p>
      <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.6; font-style: italic;">
        "${question}"
      </p>
    </div>
    
    <p style="color: #555; line-height: 1.6;">
      Quick and helpful responses can increase buyer confidence and lead to more bids!
    </p>
    
    ${ctaButton('Reply to Question', `${FRONTEND_URL}/auction/${auction.id}#questions`)}
  `;

  return sendEmailViaAPI(seller.email, `❓ New Question on "${auction.title}"`, htmlContent);
};

/**
 * 9. SELLER ANSWERED - Send to BIDDERS and QUESTIONERS
 * Notifies all participants that the seller answered a question
 */
export const sendAnswerNotification = async (recipient, auction, seller, question, answer) => {
  const htmlContent = `
    <h2 style="color: #333; margin-bottom: 20px;">💬 Seller Answered a Question</h2>
    <p style="color: #555;">Hello <strong>${recipient.username}</strong>,</p>
    <p style="color: #555; line-height: 1.6;">The seller has answered a question on an auction you're interested in:</p>
    
    ${auctionCard(auction)}
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <!-- Question -->
      <div style="border-left: 3px solid #6c757d; padding-left: 15px; margin-bottom: 15px;">
        <p style="margin: 0 0 5px 0; color: #888; font-size: 12px; text-transform: uppercase;">Question</p>
        <p style="margin: 0; color: #555; font-style: italic;">"${question}"</p>
      </div>
      
      <!-- Answer -->
      <div style="border-left: 3px solid #28a745; padding-left: 15px;">
        <p style="margin: 0 0 5px 0; color: #28a745; font-size: 12px; text-transform: uppercase;">
          <strong>@${seller.username}</strong> answered
        </p>
        <p style="margin: 0; color: #333; font-weight: 500;">"${answer}"</p>
      </div>
    </div>
    
    ${ctaButton('View Auction', `${FRONTEND_URL}/auction/${auction.id}#questions`)}
  `;

  return sendEmailViaAPI(recipient.email, `💬 Answer on "${auction.title}"`, htmlContent);
};

/**
 * Send answer notification to multiple recipients (bidders + questioners)
 */
export const sendAnswerToAllParticipants = async (recipients, auction, seller, question, answer) => {
  const results = [];
  for (const recipient of recipients) {
    try {
      const result = await sendAnswerNotification(recipient, auction, seller, question, answer);
      results.push({ email: recipient.email, success: true, ...result });
    } catch (error) {
      console.error(`Failed to send answer notification to ${recipient.email}:`, error);
      results.push({ email: recipient.email, success: false, error: error.message });
    }
  }
  return results;
};

/**
 * Send change password OTP
 * Sends a 6-digit OTP to the user's email for password change verification
 */
export const sendChangePasswordOTP = async (to, username, otp) => {
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
export const sendSellerRequestRejected = async (buyer) => {
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

export const sendSellerRequestAccepted = async (buyer) => {
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
export const sendEmail = async (to, subject, html, options) => {
  return sendEmailViaAPI(to, subject, html, options);
};

export default {
  // Auth emails
  sendWelcomeEmail,
  sendPasswordResetOTP,
  sendEmailVerification,
  sendChangePasswordOTP,
  
  // Bidding emails
  sendNewBidToSeller,
  sendBidConfirmationToBidder,
  sendOutbidNotification,
  sendBidRejectedNotification,
  
  // Auction ending emails
  sendAuctionEndedNoWinner,
  sendAuctionEndedToSeller,
  sendAuctionWonToWinner,
  
  // Q&A emails
  sendQuestionToSeller,
  sendAnswerNotification,
  sendAnswerToAllParticipants,

  // Seller request emails
  sendSellerRequestRejected,
  sendSellerRequestAccepted,
  
  // Utility
  sendEmail,
  sendBulkEmail,
};