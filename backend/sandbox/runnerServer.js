import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.RUNNER_PORT || 8090);
const RUNNER_TOKEN = process.env.RUNNER_SHARED_TOKEN;
const SANDBOX_IMAGE = process.env.SANDBOX_IMAGE || 'persisto-execution:latest';
const MAX_REQUEST_BYTES = 32 * 1024 * 1024;
const MAX_CODE_BYTES = 256 * 1024;
const MAX_INPUT_BYTES = 1024 * 1024;
const MAX_TOTAL_INPUT_BYTES = 4 * 1024 * 1024;
const MAX_TEST_CASES = 20;
const MAX_OUTPUT_BYTES = 24 * 1024 * 1024;
const ALLOWED_TIME_LIMITS_MS = new Set([1000, 2000, 5000]);
const ALLOWED_MEMORY_LIMITS_MB = new Set([128, 256, 512, 1024]);
const COMPILE_TIMEOUT_MS = 20_000;
const MAX_CONCURRENT_JOBS = 2;
let activeJobs = 0;

if (!RUNNER_TOKEN) {
  throw new Error('RUNNER_SHARED_TOKEN must be configured for the sandbox runner');
}

const readJsonBody = async (request) => {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_REQUEST_BYTES) {
      throw new Error('Execution request is too large');
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const isAuthorized = (authorization) => {
  const expected = Buffer.from(`Bearer ${RUNNER_TOKEN}`);
  const received = Buffer.from(authorization || '');
  return received.length === expected.length && timingSafeEqual(received, expected);
};

const validatePayload = (payload) => {
  if (
    !payload ||
    !['c', 'cpp', 'c++', 'python', 'py', 'java'].includes(payload.language) ||
    typeof payload.code !== 'string' ||
    Buffer.byteLength(payload.code, 'utf8') > MAX_CODE_BYTES ||
    !Array.isArray(payload.inputs) ||
    payload.inputs.length < 1 ||
    payload.inputs.length > MAX_TEST_CASES ||
    payload.inputs.some((input) =>
      typeof input !== 'string' || Buffer.byteLength(input, 'utf8') > MAX_INPUT_BYTES
    ) ||
    payload.inputs.reduce((total, input) => total + Buffer.byteLength(input, 'utf8'), 0) > MAX_TOTAL_INPUT_BYTES ||
    !ALLOWED_TIME_LIMITS_MS.has(payload.timeLimitMs) ||
    !ALLOWED_MEMORY_LIMITS_MB.has(payload.memoryLimitMb)
  ) {
    throw new Error('Invalid execution request');
  }
};

const runDocker = (payload) => new Promise((resolve, reject) => {
  const memory = `${payload.memoryLimitMb}m`;
  const containerName = `persisto-job-${randomUUID()}`;
  const args = [
    'run',
    '--rm',
    '--name', containerName,
    '--interactive',
    '--network=none',
    '--memory', memory,
    '--memory-swap', memory,
    '--cpus=1',
    '--pids-limit=64',
    '--read-only',
    '--tmpfs', '/tmp:rw,exec,nosuid,nodev,size=256m',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges:true',
    '--user=10001:10001',
    '--ulimit', 'nofile=64:64',
    '--ulimit', 'fsize=16777216:16777216',
    SANDBOX_IMAGE,
  ];
  const timeoutMs = COMPILE_TIMEOUT_MS + payload.inputs.length * payload.timeLimitMs + 10_000;
  const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  const stdout = [];
  const stderr = [];
  let outputBytes = 0;
  let settled = false;
  let timedOut = false;

  const removeContainer = () => {
    const cleanup = spawn('docker', ['rm', '--force', containerName], {
      stdio: 'ignore',
      windowsHide: true,
    });
    cleanup.on('error', (error) => {
      console.error(`Failed to stop sandbox container ${containerName}:`, error);
    });
  };

  const timer = setTimeout(() => {
    timedOut = true;
    removeContainer();
    child.kill();
  }, timeoutMs);

  const finish = (error, result) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (error) reject(error);
    else resolve(result);
  };

  child.stdout.on('data', (chunk) => {
    outputBytes += chunk.length;
    if (outputBytes > MAX_OUTPUT_BYTES) {
      child.kill();
      finish(new Error('Sandbox result exceeded the output limit'));
      return;
    }
    stdout.push(chunk);
  });
  child.stderr.on('data', (chunk) => {
    const existingBytes = stderr.reduce((total, existing) => total + existing.length, 0);
    if (existingBytes < 1024 * 1024) {
      stderr.push(chunk.subarray(0, 1024 * 1024 - existingBytes));
    }
  });
  child.stdin.on('error', (error) => {
    if (error.code !== 'EPIPE') finish(error);
  });
  child.on('error', (error) => finish(error));
  child.on('close', (code) => {
    removeContainer();
    if (timedOut) {
      finish(new Error('Sandbox exceeded its hard execution deadline'));
      return;
    }
    if (code === 137) {
      finish(null, { status: 'memory_limit_exceeded', results: [] });
      return;
    }
    if (code !== 0) {
      finish(new Error(`Sandbox runner failed (exit ${code}): ${Buffer.concat(stderr).toString('utf8').slice(-4000)}`));
      return;
    }
    try {
      finish(null, JSON.parse(Buffer.concat(stdout).toString('utf8')));
    } catch (error) {
      finish(new Error(`Sandbox returned invalid output: ${error.message}`));
    }
  });

  child.stdin.end(JSON.stringify(payload));
});

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  if (request.method !== 'POST' || request.url !== '/execute') {
    response.writeHead(404);
    response.end();
    return;
  }
  if (!isAuthorized(request.headers.authorization)) {
    response.writeHead(401, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: 'Unauthorized' }));
    return;
  }
  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    response.writeHead(429, { 'content-type': 'application/json', 'retry-after': '2' });
    response.end(JSON.stringify({ message: 'Sandbox is busy; retry shortly' }));
    return;
  }

  activeJobs += 1;
  try {
    const payload = await readJsonBody(request);
    validatePayload(payload);
    const result = await runDocker(payload);
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(result));
  } catch (error) {
    const statusCode = error.message === 'Execution request is too large' ||
      error.message === 'Invalid execution request' ? 400 : 503;
    response.writeHead(statusCode, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: error.message }));
  } finally {
    activeJobs -= 1;
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sandbox runner listening on port ${PORT}`);
});
