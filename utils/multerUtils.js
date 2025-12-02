const multer = require('multer');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// 1. Configure S3 client (v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// 2. Configure multer memory storage
const storage = multer.memoryStorage(); // store files in memory temporarily
const upload = multer({ storage });

// 3. Helper to upload file buffer to S3


const uploadToS3 = async (fileBuffer, originalName) => {
  const fileKey = `${uuidv4()}-${originalName}`;

  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: 'image/jpeg'
    // ❗️ NO ACL HERE
  };

  const parallelUpload = new Upload({
    client: s3,
    params: uploadParams
  });

  await parallelUpload.done(); // wait for upload to finish

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
};

module.exports = { upload, uploadToS3 };

