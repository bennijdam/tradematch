const express = require('express');
const rateLimit = require('express-rate-limit');
const twilio = require('twilio');

const router = express.Router();

const SEND_WINDOW_MS = 10 * 60 * 1000;
const CHECK_WINDOW_MS = 10 * 60 * 1000;

const sendLimiter = rateLimit({
  windowMs: SEND_WINDOW_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many verification requests. Please wait before trying again.',
    code: 'VERIFY_SEND_RATE_LIMIT'
  }
});

const checkLimiter = rateLimit({
  windowMs: CHECK_WINDOW_MS,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many code verification attempts. Please wait before trying again.',
    code: 'VERIFY_CHECK_RATE_LIMIT'
  }
});

function normalizeUkPhone(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const compact = raw.replace(/[\s()-]/g, '');

  let normalized = compact;
  if (normalized.startsWith('+44')) {
    // already in E.164 UK format
  } else if (normalized.startsWith('0044')) {
    normalized = `+44${normalized.slice(4)}`;
  } else if (normalized.startsWith('44')) {
    normalized = `+${normalized}`;
  } else if (normalized.startsWith('0')) {
    normalized = `+44${normalized.slice(1)}`;
  }

  if (!/^\+44\d{9,10}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !verifyServiceSid) {
    return null;
  }

  return {
    client: twilio(accountSid, authToken),
    verifyServiceSid
  };
}

function mapTwilioError(error, fallbackMessage) {
  const status = Number(error?.status) || 500;
  const code = String(error?.code || 'TWILIO_ERROR');
  const message = String(error?.message || fallbackMessage);

  if (code === '60200' || code === '60203') {
    return {
      status: 400,
      payload: {
        success: false,
        error: 'Please enter a valid UK mobile number.',
        code: 'INVALID_PHONE'
      }
    };
  }

  if (code === '60202' || code === '60212') {
    return {
      status: 429,
      payload: {
        success: false,
        error: 'Too many verification attempts. Please wait and try again.',
        code: 'VERIFY_RATE_LIMIT'
      }
    };
  }

  if (status >= 400 && status < 500) {
    return {
      status,
      payload: {
        success: false,
        error: message,
        code
      }
    };
  }

  return {
    status: 502,
    payload: {
      success: false,
      error: fallbackMessage,
      code
    }
  };
}

router.post('/send', sendLimiter, async (req, res) => {
  const normalizedPhone = normalizeUkPhone(req.body?.phone);

  if (!normalizedPhone) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid UK phone number.',
      code: 'INVALID_PHONE'
    });
  }

  const twilioClient = getTwilioClient();
  if (!twilioClient) {
    return res.status(503).json({
      success: false,
      error: 'Phone verification service is not configured.',
      code: 'VERIFY_NOT_CONFIGURED'
    });
  }

  try {
    const verification = await twilioClient.client.verify
      .v2
      .services(twilioClient.verifyServiceSid)
      .verifications
      .create({ to: normalizedPhone, channel: 'sms' });

    return res.json({
      success: true,
      status: verification.status,
      phone: normalizedPhone
    });
  } catch (error) {
    const mapped = mapTwilioError(error, 'Unable to send verification code right now.');
    return res.status(mapped.status).json(mapped.payload);
  }
});

router.post('/check', checkLimiter, async (req, res) => {
  const normalizedPhone = normalizeUkPhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();

  if (!normalizedPhone) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid UK phone number.',
      code: 'INVALID_PHONE'
    });
  }

  if (!/^\d{4,10}$/.test(code)) {
    return res.status(400).json({
      success: false,
      error: 'Verification code must be numeric.',
      code: 'INVALID_CODE'
    });
  }

  const twilioClient = getTwilioClient();
  if (!twilioClient) {
    return res.status(503).json({
      success: false,
      error: 'Phone verification service is not configured.',
      code: 'VERIFY_NOT_CONFIGURED'
    });
  }

  try {
    const result = await twilioClient.client.verify
      .v2
      .services(twilioClient.verifyServiceSid)
      .verificationChecks
      .create({ to: normalizedPhone, code });

    if (result.status === 'approved' || result.valid === true) {
      return res.json({
        success: true,
        verified: true,
        status: result.status
      });
    }

    return res.status(400).json({
      success: false,
      verified: false,
      error: 'The verification code is incorrect or expired.',
      code: 'INVALID_OR_EXPIRED_CODE'
    });
  } catch (error) {
    const mapped = mapTwilioError(error, 'Unable to verify code right now.');
    return res.status(mapped.status).json(mapped.payload);
  }
});

module.exports = router;
