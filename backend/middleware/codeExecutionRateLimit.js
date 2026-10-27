import { createClient } from 'redis';

const LIMIT = 5;
const WINDOW_MS = 60_000;
const CONNECT_TIMEOUT_MS = 5000;
const INCREMENT_SCRIPT = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
  end
  return { count, redis.call('PTTL', KEYS[1]) }
`;

let redisClient;
let connectPromise;

const waitForConnection = (promise) => {
  let timeout;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Redis connection timed out')), CONNECT_TIMEOUT_MS);
      timeout.unref();
    }),
  ]).finally(() => clearTimeout(timeout));
};

const getRedisClient = async () => {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is not configured');
  }

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      pingInterval: 30_000,
      disableOfflineQueue: true,
      socket: {
        keepAlive: 5000,
        reconnectStrategy: (retries) => Math.min(250 * (2 ** Math.min(retries, 5)), 8000),
      },
    });
    redisClient.on('error', (error) => {
      console.error('Code execution rate-limit Redis error:', error);
    });
  }

  if (!redisClient.isOpen) {
    if (!connectPromise) {
      connectPromise = redisClient.connect().finally(() => {
        connectPromise = undefined;
      });
    }
    await waitForConnection(connectPromise);
  }

  if (!redisClient.isReady) {
    throw new Error('Redis is reconnecting');
  }

  return redisClient;
};

export const connectRedis = async () => {
  const client = await getRedisClient();
  await client.ping();
};

export const codeExecutionRateLimit = async (req, res, next) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const client = await getRedisClient();
    const window = Math.floor(Date.now() / WINDOW_MS);
    const [count, ttlMs] = await client.eval(INCREMENT_SCRIPT, {
      keys: [`rate-limit:code-execution:${userId}:${window}`],
      arguments: [String(WINDOW_MS)],
    });
    const remaining = Math.max(0, LIMIT - Number(count));

    res.set('RateLimit-Limit', String(LIMIT));
    res.set('RateLimit-Remaining', String(remaining));
    res.set('RateLimit-Reset', String(Math.max(1, Math.ceil(Number(ttlMs) / 1000))));

    if (Number(count) > LIMIT) {
      res.set('Retry-After', String(Math.max(1, Math.ceil(Number(ttlMs) / 1000))));
      return res.status(429).json({
        success: false,
        error: 'Code execution rate limit exceeded. Try again later.',
      });
    }

    return next();
  } catch (error) {
    console.error('Code execution rate-limit check failed:', error);
    return res.status(503).json({
      success: false,
      error: 'Code execution is temporarily unavailable.',
    });
  }
};
