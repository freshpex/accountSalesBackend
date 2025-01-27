const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = require('../config/supabaseS3');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

const uploadToSupabase = async (req, res, next) => {
  try {
    if (!req.files?.length) return next();

    const uploadPromises = req.files.map(async (file) => {
      const filename = `${uuidv4()}-${file.originalname}`;
      const filePath = `products/${filename}`;

      const command = new PutObjectCommand({
        Bucket: process.env.SUPABASE_S3_BUCKET_NAME,
        Key: filePath,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      });

      await s3Client.send(command);
      return `${process.env.SUPABASE_S3_ENDPOINT}/${process.env.SUPABASE_S3_BUCKET_NAME}/${filePath}`;
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    req.fileUrls = uploadedUrls;
    next();
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
};

module.exports = { upload, uploadToSupabase };
