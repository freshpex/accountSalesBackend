const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = require('../config/supabaseS3');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.match(/^image\/(jpeg|jpg|png)$/)) {
    cb(new Error('Only JPEG, JPG and PNG files are allowed'), false);
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1
  },
  fileFilter
});

const uploadProfileToSupabase = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const filename = `${uuidv4()}-${req.file.originalname}`;
    const filePath = `profiles/${req.user.userId}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.SUPABASE_S3_BUCKET_NAME,
      Key: filePath,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read'
    });

    await s3Client.send(command);
    req.fileUrl = `${process.env.SUPABASE_S3_ENDPOINT}/${process.env.SUPABASE_S3_BUCKET_NAME}/${filePath}`;
    next();
  } catch (error) {
    console.error('Profile upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

module.exports = {
  uploadMiddleware: upload.single('image'),
  uploadProfileToSupabase
};
