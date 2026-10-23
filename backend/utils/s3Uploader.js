import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client from './s3Client.js';
import { streamToString } from './streamToString.js';
import dotenv from 'dotenv';

dotenv.config();

export const getS3BucketName = () => {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }
  return bucketName;
};

export const createS3Reference = (key) => `s3://${getS3BucketName()}/${key}`;

export const getS3ObjectKey = (reference) => {
  if (typeof reference !== 'string' || !reference.trim()) {
    throw new Error('S3 object reference is invalid');
  }

  if (!reference.startsWith('s3://')) {
    return reference;
  }

  const bucketName = getS3BucketName();
  const prefix = `s3://${bucketName}/`;
  if (!reference.startsWith(prefix)) {
    throw new Error('S3 object reference points to an unexpected bucket');
  }

  const key = reference.slice(prefix.length);
  if (!key) {
    throw new Error('S3 object reference is missing its object key');
  }
  return key;
};

export const uploadBufferToS3 = async (body, key, contentType = 'application/octet-stream') => {
  const command = new PutObjectCommand({
    Bucket: getS3BucketName(),
    Key: key,
    Body: Buffer.isBuffer(body) ? body : Buffer.from(body),
    ContentType: contentType,
  });

  await s3Client.send(command);
};

export const createS3UploadUrl = async (key, contentType, expiresIn = 600) => {
  const command = new PutObjectCommand({
    Bucket: getS3BucketName(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
};

export const getS3ObjectMetadata = async (key) => {
  const command = new HeadObjectCommand({
    Bucket: getS3BucketName(),
    Key: key,
  });
  return s3Client.send(command);
};

export const copyS3Object = async (sourceKey, destinationKey) => {
  const command = new CopyObjectCommand({
    Bucket: getS3BucketName(),
    CopySource: `${getS3BucketName()}/${sourceKey}`,
    Key: destinationKey,
  });
  await s3Client.send(command);
};

export const deleteFileFromS3 = async (reference) => {
  const command = new DeleteObjectCommand({
    Bucket: getS3BucketName(),
    Key: getS3ObjectKey(reference),
  });
  await s3Client.send(command);
};

export const deleteS3Objects = async (keys) => {
  if (!keys.length) return;
  for (let start = 0; start < keys.length; start += 1000) {
    const command = new DeleteObjectsCommand({
      Bucket: getS3BucketName(),
      Delete: {
        Objects: keys.slice(start, start + 1000).map((Key) => ({ Key })),
        Quiet: false,
      },
    });
    const response = await s3Client.send(command);
    if (response.Errors?.length) {
      throw new Error(`Failed to delete ${response.Errors.length} S3 object(s)`);
    }
  }
};

export const getSignedUrlForS3 = async (reference) => {
  const command = new GetObjectCommand({
    Bucket: getS3BucketName(),
    Key: getS3ObjectKey(reference),
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

export const getS3FileContent = async (reference) => {
  const command = new GetObjectCommand({
    Bucket: getS3BucketName(),
    Key: getS3ObjectKey(reference),
  });
  const response = await s3Client.send(command);
  return streamToString(response.Body);
};
