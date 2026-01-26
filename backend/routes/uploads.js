const express = require('express');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const bucketName = process.env.AWS_BUCKET_NAME || process.env.S3_BUCKET;
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

if (!bucketName || !region) {
    console.warn('⚠️  S3 uploads are not fully configured. Missing AWS_BUCKET_NAME/S3_BUCKET or AWS_REGION.');
}

const s3 = new AWS.S3({
    region,
    signatureVersion: 'v4',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const maxFileSize = Number(process.env.MAX_FILE_SIZE || 5242880);
const allowedFileTypes = (process.env.ALLOWED_FILE_TYPES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const sanitizeFilename = (filename = 'file') => {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
};

const buildKey = ({ folder = 'uploads', filename }) => {
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/\/+/, '/');
    const safeFilename = sanitizeFilename(filename);
    return `${safeFolder}/${crypto.randomUUID()}_${safeFilename}`;
};

const buildPublicUrl = (key) => {
    if (!bucketName || !region) return null;
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};

router.post('/presign', authenticate, async (req, res) => {
    try {
        const { filename, contentType, folder, contentLength } = req.body || {};

        if (!filename || !contentType) {
            return res.status(400).json({ error: 'filename and contentType are required' });
        }

        if (allowedFileTypes.length && !allowedFileTypes.includes(contentType)) {
            return res.status(400).json({ error: 'File type not allowed' });
        }

        if (contentLength && Number(contentLength) > maxFileSize) {
            return res.status(400).json({ error: 'File exceeds max size' });
        }

        if (!bucketName || !region) {
            return res.status(500).json({ error: 'S3 is not configured' });
        }

        const key = buildKey({ folder, filename });
        const params = {
            Bucket: bucketName,
            Key: key,
            ContentType: contentType,
            Expires: 300
        };

        const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

        res.json({
            success: true,
            uploadUrl,
            key,
            url: buildPublicUrl(key)
        });
    } catch (error) {
        console.error('Presign upload error:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});

router.get('/signed-url', authenticate, async (req, res) => {
    try {
        const { key } = req.query;
        if (!key) return res.status(400).json({ error: 'key is required' });
        if (!bucketName || !region) {
            return res.status(500).json({ error: 'S3 is not configured' });
        }

        const url = await s3.getSignedUrlPromise('getObject', {
            Bucket: bucketName,
            Key: key,
            Expires: 300
        });

        res.json({ success: true, url });
    } catch (error) {
        console.error('Presign download error:', error);
        res.status(500).json({ error: 'Failed to generate download URL' });
    }
});

module.exports = router;
