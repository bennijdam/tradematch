const express = require('express');
const router = express.Router();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS = process.env.EMAIL_FROM || 'noreply@tradematch.uk';
const CAREERS_INBOX = 'support@tradematch.uk';

// POST /api/apply
router.post('/', async (req, res) => {
  try {
    const {
      role, jobId,
      firstName, lastName, email, phone, location,
      rightToWork, startDate, salary, workPreference,
      coverLetter, achievements,
      linkedin, portfolio, github,
      skills, hearAbout,
      cvFilename
    } = req.body;

    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields: firstName, lastName, email, role' });
    }

    const appId = `APP-${Date.now().toString(36).toUpperCase()}`;
    const submittedAt = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });

    // ── Email to support@tradematch.uk ──────────────────────────────
    const adminHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7f4;margin:0;padding:32px}
  .card{background:#fff;border-radius:12px;max-width:640px;margin:0 auto;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  h1{font-size:22px;font-weight:800;color:#0f1923;margin:0 0 4px}
  .badge{display:inline-block;background:#e6f9f0;color:#007a3d;font-size:12px;font-weight:600;padding:4px 12px;border-radius:100px;margin-bottom:24px}
  .section{margin:20px 0 0}
  .section-title{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8b9eaa;margin-bottom:10px}
  table{width:100%;border-collapse:collapse}
  td{padding:8px 0;font-size:14px;color:#0f1923;border-bottom:1px solid #f0f4ff;vertical-align:top}
  td:first-child{color:#5a6478;font-weight:500;width:44%;padding-right:12px}
  .text-block{background:#f8fafc;border-left:3px solid #00c268;padding:12px 16px;border-radius:0 8px 8px 0;font-size:13.5px;line-height:1.7;color:#0f1923;white-space:pre-wrap;margin:8px 0 0}
  .footer{margin-top:28px;font-size:12px;color:#8b9eaa;border-top:1px solid #eef2f0;padding-top:16px}
</style></head>
<body>
<div class="card">
  <div class="badge">New Application &mdash; ${appId}</div>
  <h1>${role}</h1>
  <p style="color:#5a6478;font-size:14px;margin:4px 0 24px">Submitted ${submittedAt}</p>

  <div class="section">
    <div class="section-title">Applicant</div>
    <table>
      <tr><td>Name</td><td>${firstName} ${lastName}</td></tr>
      <tr><td>Email</td><td><a href="mailto:${email}" style="color:#007a3d">${email}</a></td></tr>
      ${phone ? `<tr><td>Phone</td><td>${phone}</td></tr>` : ''}
      <tr><td>Location</td><td>${location || '—'}</td></tr>
      <tr><td>Right to work</td><td>${rightToWork || '—'}</td></tr>
      ${startDate ? `<tr><td>Earliest start</td><td>${startDate}</td></tr>` : ''}
      <tr><td>Target salary</td><td>${salary || '—'}</td></tr>
      <tr><td>Work preference</td><td>${workPreference || '—'}</td></tr>
      <tr><td>How they heard</td><td>${hearAbout || '—'}</td></tr>
    </table>
  </div>

  ${skills && skills.length ? `
  <div class="section">
    <div class="section-title">Skills</div>
    <p style="font-size:14px;color:#0f1923">${(Array.isArray(skills) ? skills : skills.split(',')).join(' &bull; ')}</p>
  </div>` : ''}

  ${linkedin || portfolio || github ? `
  <div class="section">
    <div class="section-title">Links</div>
    <table>
      ${linkedin ? `<tr><td>LinkedIn</td><td><a href="${linkedin}" style="color:#007a3d">${linkedin}</a></td></tr>` : ''}
      ${portfolio ? `<tr><td>Portfolio</td><td><a href="${portfolio}" style="color:#007a3d">${portfolio}</a></td></tr>` : ''}
      ${github ? `<tr><td>GitHub</td><td><a href="${github}" style="color:#007a3d">${github}</a></td></tr>` : ''}
    </table>
  </div>` : ''}

  ${cvFilename ? `
  <div class="section">
    <div class="section-title">CV</div>
    <p style="font-size:14px;color:#0f1923">${cvFilename} <em style="color:#8b9eaa">(attached via upload)</em></p>
  </div>` : ''}

  ${coverLetter ? `
  <div class="section">
    <div class="section-title">Cover Letter</div>
    <div class="text-block">${coverLetter}</div>
  </div>` : ''}

  ${achievements ? `
  <div class="section">
    <div class="section-title">Key Achievements</div>
    <div class="text-block">${achievements}</div>
  </div>` : ''}

  <div class="footer">
    Application ID: ${appId} &bull; Job ID: ${jobId || 'n/a'} &bull; Submitted: ${submittedAt}
  </div>
</div>
</body></html>`;

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: CAREERS_INBOX,
      replyTo: email,
      subject: `[Application] ${firstName} ${lastName} — ${role}`,
      html: adminHtml
    });

    // ── Confirmation email to applicant ─────────────────────────────
    const confirmHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7f4;margin:0;padding:32px}
  .card{background:#fff;border-radius:12px;max-width:560px;margin:0 auto;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  h1{font-size:24px;font-weight:800;color:#0f1923;margin:0 0 8px}
  p{font-size:15px;color:#3d5060;line-height:1.75;margin:0 0 14px}
  .step{display:flex;gap:14px;margin:8px 0}
  .step-num{width:28px;height:28px;border-radius:50%;background:#e6f9f0;color:#007a3d;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
  .step-text{font-size:14px;color:#3d5060;line-height:1.65}
  .footer{margin-top:28px;font-size:12px;color:#8b9eaa;border-top:1px solid #eef2f0;padding-top:16px}
</style></head>
<body>
<div class="card">
  <p style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#00c268;margin-bottom:8px">Application received</p>
  <h1>Thanks, ${firstName}!</h1>
  <p>We've received your application for <strong>${role}</strong> and we read every one personally. You'll hear from us within 5 business days.</p>

  <p style="font-weight:700;color:#0f1923;margin-top:24px">What happens next</p>
  <div class="step"><div class="step-num">1</div><div class="step-text"><strong>Application review</strong> — we'll read your application and CV within 5 business days</div></div>
  <div class="step"><div class="step-num">2</div><div class="step-text"><strong>Intro call</strong> — a 30-minute chat with our talent team if you're shortlisted</div></div>
  <div class="step"><div class="step-num">3</div><div class="step-text"><strong>Skills interview</strong> — a focused technical or role-specific round</div></div>
  <div class="step"><div class="step-num">4</div><div class="step-text"><strong>Team meet &amp; offer</strong> — meet the team and receive your written offer within 48 hours</div></div>

  <div class="footer">
    Application ID: ${appId} &bull; Role: ${role}<br>
    Questions? Reply to this email or contact <a href="mailto:${CAREERS_INBOX}" style="color:#007a3d">${CAREERS_INBOX}</a>
  </div>
</div>
</body></html>`;

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: `Application received — ${role} at TradeMatch`,
      html: confirmHtml
    });

    return res.json({ success: true, appId });

  } catch (err) {
    console.error('Apply route error:', err);
    return res.status(500).json({ error: 'Failed to process application', details: err.message });
  }
});

module.exports = router;
