/**
 * apps/api/services/vetting-emails.js
 *
 * Email notification helpers for the vetting system.
 * All functions accept a pool so the caller can inject the pg connection.
 * Each function returns { sent: boolean, error?: string }.
 */

'use strict';

const EmailService = require('./email.service');

const FROM = 'TradeMatch Vetting <vetting@tradematch.uk>';
const BASE_URL = process.env.APP_BASE_URL || 'https://tradematch.uk';

// ─── Utility ──────────────────────────────────────────────────────────────────

async function sendVettingEmail(to, subject, html) {
    try {
        const svc = new EmailService();
        if (!svc) {
            console.warn('[vetting-emails] Email service not initialised (no RESEND_API_KEY?)');
            return { sent: false, error: 'Email service not initialised' };
        }
        await svc.sendEmail({ from: FROM, to, subject, html });
        return { sent: true };
    } catch (err) {
        console.error('[vetting-emails] Failed to send email:', err.message);
        return { sent: false, error: err.message };
    }
}

function brandWrap(content) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>TradeMatch</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fa; font-family:'Segoe UI',Arial,sans-serif; }
    .wrap { max-width:600px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.08); }
    .header { background:#1a56db; padding:28px 32px; }
    .header h1 { margin:0; color:#fff; font-size:22px; font-weight:700; letter-spacing:-.5px; }
    .header p  { margin:6px 0 0; color:rgba(255,255,255,.8); font-size:13px; }
    .body { padding:32px; color:#1a202c; font-size:15px; line-height:1.6; }
    .body h2 { margin-top:0; font-size:18px; color:#1a56db; }
    .btn { display:inline-block; margin:20px 0; padding:12px 28px; background:#1a56db; color:#fff !important; text-decoration:none; border-radius:8px; font-weight:600; font-size:15px; }
    .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600; }
    .badge-green  { background:#d1fae5; color:#065f46; }
    .badge-red    { background:#fee2e2; color:#991b1b; }
    .badge-yellow { background:#fef3c7; color:#92400e; }
    table.details { width:100%; border-collapse:collapse; margin:16px 0; }
    table.details td { padding:8px 12px; border-bottom:1px solid #e2e8f0; font-size:14px; }
    table.details td:first-child { color:#64748b; width:40%; }
    .footer { background:#f8fafc; padding:20px 32px; font-size:12px; color:#94a3b8; text-align:center; border-top:1px solid #e2e8f0; }
    .footer a { color:#94a3b8; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>TradeMatch</h1>
      <p>Verified Tradespeople Platform</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} TradeMatch UK Ltd &bull;
      <a href="${BASE_URL}/help-centre">Help</a> &bull;
      <a href="${BASE_URL}/contact">Contact</a>
    </div>
  </div>
</body>
</html>`;
}

// ─── 1. Submission received ───────────────────────────────────────────────────

async function sendSubmissionReceived(vendor) {
    const html = brandWrap(`
<h2>We've received your verification documents</h2>
<p>Hi ${vendor.name || 'there'},</p>
<p>Thank you for submitting your credentials for verification. Our team will review your documents within <strong>2–3 business days</strong>.</p>
<p>You'll receive an email as soon as a decision has been made. In the meantime you can track your progress in your dashboard.</p>
<a class="btn" href="${BASE_URL}/vendor-dashboard-enhanced#credentials">View Vetting Status</a>
<p style="color:#64748b;font-size:13px;">If you have questions, visit our <a href="${BASE_URL}/help-centre">Help Centre</a> or reply to this email.</p>`);

    return sendVettingEmail(vendor.email, 'TradeMatch — Verification documents received', html);
}

// ─── 2. Document verified ─────────────────────────────────────────────────────

async function sendDocumentVerified(vendor, docType, docLabel) {
    const html = brandWrap(`
<h2>Document verified <span class="badge badge-green">✓ Verified</span></h2>
<p>Hi ${vendor.name || 'there'},</p>
<p>Great news — your <strong>${docLabel}</strong> has been verified successfully.</p>
<p>Your vetting score has been updated. Keep building your profile to unlock the <strong>TradeMatch Verified</strong> badge.</p>
<a class="btn" href="${BASE_URL}/vendor-dashboard-enhanced#credentials">View Your Score</a>`);

    return sendVettingEmail(vendor.email, `TradeMatch — Your ${docLabel} has been verified`, html);
}

// ─── 3. Document rejected ─────────────────────────────────────────────────────

async function sendDocumentRejected(vendor, docLabel, reason) {
    const html = brandWrap(`
<h2>Action required — document not accepted <span class="badge badge-red">✗ Rejected</span></h2>
<p>Hi ${vendor.name || 'there'},</p>
<p>Unfortunately we were unable to verify your <strong>${docLabel}</strong>.</p>
<table class="details">
  <tr><td>Reason</td><td>${reason || 'The document did not meet our verification requirements.'}</td></tr>
</table>
<p>Please re-upload a valid document. Common issues include:</p>
<ul>
  <li>Document is expired or expiry date is not clearly visible</li>
  <li>Policy/registration number does not match the issuing body's records</li>
  <li>File is blurry or truncated</li>
</ul>
<a class="btn" href="${BASE_URL}/vendor-dashboard-enhanced#credentials">Re-upload Document</a>`);

    return sendVettingEmail(vendor.email, `TradeMatch — Action needed: ${docLabel} not accepted`, html);
}

// ─── 4. Profile fully verified ────────────────────────────────────────────────

async function sendFullyVerified(vendor, score) {
    const html = brandWrap(`
<h2>🎉 Congratulations — you're TradeMatch Verified!</h2>
<p>Hi ${vendor.name || 'there'},</p>
<p>Your profile has passed all verification checks and you've earned the <strong>TradeMatch Verified</strong> badge with a score of <strong>${score}/100</strong>.</p>
<p>Verified profiles receive:</p>
<ul>
  <li>Priority placement in search results</li>
  <li>The blue verified badge on your public profile</li>
  <li>Increased customer trust and higher conversion rates</li>
</ul>
<a class="btn" href="${BASE_URL}/vendor-dashboard-enhanced">Go to Dashboard</a>`);

    return sendVettingEmail(vendor.email, 'TradeMatch — You are now a Verified Tradesperson!', html);
}

// ─── 5. Expiry warning ────────────────────────────────────────────────────────

async function sendExpiryWarning(vendor, docLabel, expiresAt, daysLeft) {
    const urgency = daysLeft <= 7 ? 'badge-red' : daysLeft <= 14 ? 'badge-yellow' : 'badge-yellow';
    const html = brandWrap(`
<h2>Document expiring soon <span class="badge ${urgency}">${daysLeft} days left</span></h2>
<p>Hi ${vendor.name || 'there'},</p>
<p>Your <strong>${docLabel}</strong> is set to expire on <strong>${new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>
<p>To keep your Verified status please upload a renewed document before the expiry date.</p>
<a class="btn" href="${BASE_URL}/vendor-dashboard-enhanced#credentials">Renew Now</a>
<p style="color:#64748b;font-size:13px;">If your document has already been renewed, please upload the new version so we can keep your records up to date.</p>`);

    return sendVettingEmail(vendor.email, `TradeMatch — Your ${docLabel} expires in ${daysLeft} days`, html);
}

// ─── 6. Document expired ──────────────────────────────────────────────────────

async function sendDocumentExpired(vendor, docLabel) {
    const html = brandWrap(`
<h2>Document expired <span class="badge badge-red">Expired</span></h2>
<p>Hi ${vendor.name || 'there'},</p>
<p>Your <strong>${docLabel}</strong> has expired. Your Verified status has been temporarily suspended until you upload a valid renewal.</p>
<p>Customers will not see the Verified badge on your profile until this is resolved.</p>
<a class="btn" href="${BASE_URL}/vendor-dashboard-enhanced#credentials">Upload Renewal</a>`);

    return sendVettingEmail(vendor.email, `TradeMatch — Your ${docLabel} has expired`, html);
}

// ─── 7. Admin: new submission for review ─────────────────────────────────────

async function sendAdminNewSubmission(adminEmail, vendor, docType, docLabel) {
    const html = brandWrap(`
<h2>New vetting submission for review</h2>
<table class="details">
  <tr><td>Vendor</td><td>${vendor.name} (ID: ${vendor.id})</td></tr>
  <tr><td>Email</td><td>${vendor.email}</td></tr>
  <tr><td>Document type</td><td>${docLabel}</td></tr>
  <tr><td>Submitted</td><td>${new Date().toLocaleString('en-GB')}</td></tr>
</table>
<a class="btn" href="${BASE_URL}/super-admin-dashboard/vetting-queue.html">Open Vetting Queue</a>`);

    return sendVettingEmail(adminEmail, `[Admin] New vetting submission: ${vendor.name} — ${docLabel}`, html);
}

module.exports = {
    sendSubmissionReceived,
    sendDocumentVerified,
    sendDocumentRejected,
    sendFullyVerified,
    sendExpiryWarning,
    sendDocumentExpired,
    sendAdminNewSubmission
};
