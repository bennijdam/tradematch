const express = require('express');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const bucketName = process.env.AWS_BUCKET_NAME || process.env.S3_BUCKET;
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

if (!bucketName || !region) {
    console.warn('⚠️  S3 uploads are not fully configured. Missing AWS_BUCKET_NAME/S3_BUCKET or AWS_REGION.');
}

const s3 = new S3Client({
    region,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
        : undefined
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
        const payload = (req.body && Object.keys(req.body).length ? req.body : req.query) || {};
        const { filename, contentType, folder, contentLength } = payload;

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
        const uploadCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: contentType
        });

        const uploadUrl = await getSignedUrl(s3, uploadCommand, { expiresIn: 300 });

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

        const downloadCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: key
        });

        const url = await getSignedUrl(s3, downloadCommand, { expiresIn: 300 });

        res.json({ success: true, url });
    } catch (error) {
        console.error('Presign download error:', error);
        res.status(500).json({ error: 'Failed to generate download URL' });
    }
});

module.exports = router;
