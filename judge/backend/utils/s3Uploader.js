import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client from './s3Client.js';
import { streamToString } from './streamToString.js';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Accepts file path (string), reads content and uploads
export const uploadFileToS3 = async (filePathOrBuffer, key, contentType = 'text/plain') => {
  let fileContent;
  if (typeof filePathOrBuffer === 'string' && !filePathOrBuffer.includes('\n')) {
    // Treat it as file path
    fileContent = await fs.readFile(filePathOrBuffer);
  } else {
    // Treat it as direct content (buffer or code string)
    fileContent = filePathOrBuffer;
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
  });

  await s3Client.send(command);
};

export const deleteFileFromS3 = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  await s3Client.send(command);
};

export const getSignedUrlForS3 = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

export const getS3FileContent = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  const response = await s3Client.send(command);
  return streamToString(response.Body);
};
