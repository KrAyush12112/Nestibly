// utils/s3.js
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
require("dotenv").config();

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

exports.uploadToS3 = async (file) => {
    const upload = new Upload({
        client: s3,
        params: {
            Bucket: process.env.AWS_BUCKET,
            Key: `homes/${Date.now()}-${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype
        }
    });

    const result = await upload.done();
    return result.Location; // PUBLIC URL
};
