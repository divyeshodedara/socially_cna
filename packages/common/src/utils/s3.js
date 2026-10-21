import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

let s3ClientInstance = null;
const getS3Client = () => {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: process.env.AWS_REGION || "ap-south-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3ClientInstance;
};

export const uploadToS3 = async (file, folder = "posts") => {
  try {
    const s3 = getS3Client();
    const ext = file.originalname ? file.originalname.split(".").pop() : "jpeg";
    const key = `${folder}/${uuidv4()}.${ext}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || "image/jpeg",
      }),
    );

    const publicUrl = process.env.S3_PUBLIC_URL
      ? `${process.env.S3_PUBLIC_URL}/${key}`
      : `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/${key}`;

    return {
      url: publicUrl,
      key,
    };
  } catch (error) {
    console.error("S3 upload error:", error);
    throw new Error(error.message || "Failed to upload image to S3");
  }
};

export const deleteFromS3 = async (key) => {
  try {
    const s3 = getS3Client();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      }),
    );
  } catch (error) {
    console.error("S3 delete error:", error);
    throw new Error(error.message || "Failed to delete image from S3");
  }
};
