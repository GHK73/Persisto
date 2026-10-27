import dotenv from 'dotenv';
import { createClient } from 'redis';

dotenv.config();

if (!process.env.REDIS_URL) {
  console.error('Redis connection check failed: REDIS_URL is not configured.');
  process.exit(1);
}

const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => {
      if (retries >= 3) {
        return new Error('Redis connection retries exceeded');
      }
      return Math.min(retries * 250, 1000);
    },
  },
});

client.on('error', (error) => {
  console.error('Redis client error:', error.message);
});

try {
  await client.connect();
  const response = await client.ping();
  if (response !== 'PONG') {
    throw new Error(`Unexpected Redis PING response: ${response}`);
  }
  console.log('Redis connection successful (PING: PONG).');
} catch (error) {
  console.error('Redis connection check failed:', error.message);
  process.exitCode = 1;
} finally {
  if (client.isOpen) {
    try {
      await client.quit();
    } catch (error) {
      console.error('Could not close Redis connection cleanly:', error.message);
      process.exitCode = 1;
    }
  }
}
