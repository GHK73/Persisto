import { S3Client } from "@aws-sdk/client-s3";

// Replace with your actual AWS credentials and region (or use environment variables)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1", // example: "ap-south-1" (Mumbai)
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,     // Set this in your .env
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Set this in your .env
  },
});

export default s3Client;
