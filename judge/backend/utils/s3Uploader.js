// utils/s3Uploader.js

import fs from 'fs';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import s3Client from './s3Client.js';
import dotenv from 'dotenv';

dotenv.config();

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

export const uploadFileToS3 = async (localFilePath, key) => {
  const fileStream = fs.createReadStream(localFilePath);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileStream,
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
