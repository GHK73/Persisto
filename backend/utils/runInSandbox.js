const ALLOWED_TIME_LIMITS_MS = new Set([1000, 2000, 5000]);
const ALLOWED_MEMORY_LIMITS_MB = new Set([128, 256, 512, 1024]);
const MAX_CODE_BYTES = 256 * 1024;
const MAX_INPUT_BYTES = 1024 * 1024;
const MAX_TOTAL_INPUT_BYTES = 4 * 1024 * 1024;

export const runInSandbox = async ({
  code,
  language,
  inputs,
  timeLimitMs,
  memoryLimitMb,
}) => {
  const runnerUrl = process.env.RUNNER_URL;
  const runnerToken = process.env.RUNNER_SHARED_TOKEN;
  if (!runnerUrl || !runnerToken) {
    throw new Error('Isolated execution runner is not configured');
  }
  if (!ALLOWED_TIME_LIMITS_MS.has(timeLimitMs) || !ALLOWED_MEMORY_LIMITS_MB.has(memoryLimitMb)) {
    throw new Error('Question execution limits are invalid');
  }
  if (
    typeof code !== 'string' ||
    Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES ||
    !Array.isArray(inputs) ||
    inputs.length < 1 ||
    inputs.length > 20 ||
    inputs.some((input) =>
      typeof input !== 'string' || Buffer.byteLength(input, 'utf8') > MAX_INPUT_BYTES
    ) ||
    inputs.reduce((total, input) => total + Buffer.byteLength(input, 'utf8'), 0) > MAX_TOTAL_INPUT_BYTES
  ) {
    throw new Error('Code or input exceeds execution limits');
  }

  const deadlineMs = 40_000 + inputs.length * timeLimitMs;
  const response = await fetch(new URL('/execute', runnerUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${runnerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, language, inputs, timeLimitMs, memoryLimitMb }),
    signal: AbortSignal.timeout(deadlineMs),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Isolated execution runner is unavailable');
  }
  return result;
};
