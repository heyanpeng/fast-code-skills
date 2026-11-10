#!/usr/bin/env node

const TERMINAL_SUCCESS = new Set(['success']);
const TERMINAL_FAILURE = new Set(['failed', 'canceled', 'skipped']);
const TERMINAL_BLOCKED = new Set(['manual', 'blocked']);
const DEFAULT_BASE_URL = 'https://gitlab.com';
const DEFAULT_POLL_SECONDS = 10;
const DEFAULT_TIMEOUT_SECONDS = 1800;
const DEFAULT_REQUEST_TIMEOUT_SECONDS = 30;

function usage() {
  return `Usage: wait-gitlab-pipeline.mjs --sha <commit> --ref <branch> [options]

Required:
  --sha <sha>                       Commit SHA to match exactly
  --ref <ref>                       Branch or tag to match exactly

Options:
  --project <path>                  GitLab project path (default: GITLAB_PROJECT_PATH)
  --base-url <url>                  GitLab base URL (default: GITLAB_BASE_URL or ${DEFAULT_BASE_URL})
  --poll-seconds <number>           Poll interval (default: ${DEFAULT_POLL_SECONDS})
  --timeout-seconds <number>        Total wait timeout (default: ${DEFAULT_TIMEOUT_SECONDS})
  --request-timeout-seconds <n>     Per-request timeout (default: ${DEFAULT_REQUEST_TIMEOUT_SECONDS})
  --help                            Show this help

Environment:
  GITLAB_TOKEN                       Private token sent as PRIVATE-TOKEN
  GITLAB_PROJECT_PATH                Project path, for example sofe/pptultra_com_fe
  GITLAB_BASE_URL                    GitLab base URL, for example https://wisgit.qihoo.net
`;
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') return { help: true };
    if (!arg.startsWith('--')) throw configError(`Unknown argument: ${arg}`);
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw configError(`Missing value for --${key}`);
    values[key] = value;
    index += 1;
  }
  return values;
}

function positiveNumber(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw configError(`${name} must be a positive number`);
  }
  return number;
}

function required(value, name) {
  if (!value) throw configError(`Missing ${name}`);
  return value;
}

function configError(message) {
  const error = new Error(message);
  error.code = 'config_error';
  return error;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '');
}

function apiUrl(baseUrl, projectPath, pathname, params = {}) {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}/api/v4/projects/${encodeURIComponent(projectPath)}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, value);
  }
  return url;
}

async function getJson(url, token, requestTimeoutSeconds) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutSeconds * 1000);
  try {
    const headers = { Accept: 'application/json' };
    if (token) headers['PRIVATE-TOKEN'] = token;
    const response = await fetch(url, { headers, signal: controller.signal });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text.slice(0, 500);
    }
    if (!response.ok) {
      const detail = typeof body === 'string' ? body : JSON.stringify(body);
      const error = new Error(`GitLab API ${response.status}: ${detail}`);
      error.code = 'api_error';
      throw error;
    }
    return body;
  } catch (error) {
    if (!error.code) error.code = error.name === 'AbortError' ? 'request_timeout' : 'api_error';
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

function matchingPipeline(pipelines, sha, ref) {
  return pipelines.find((pipeline) => pipeline.sha === sha && pipeline.ref === ref);
}

async function findPipeline(config, deadline) {
  while (Date.now() < deadline) {
    const url = apiUrl(config.baseUrl, config.projectPath, '/pipelines', {
      sha: config.sha,
      ref: config.ref,
      order_by: 'id',
      sort: 'desc',
      per_page: '100',
    });
    const pipelines = await getJson(url, config.token, config.requestTimeoutSeconds);
    const pipeline = matchingPipeline(Array.isArray(pipelines) ? pipelines : [], config.sha, config.ref);
    if (pipeline) return pipeline;
    await sleep(Math.min(config.pollSeconds, Math.max(0, (deadline - Date.now()) / 1000)));
  }
  return null;
}

async function getFailedJobs(config, pipelineId) {
  const url = apiUrl(config.baseUrl, config.projectPath, `/pipelines/${pipelineId}/jobs`, {
    per_page: '100',
  });
  const jobs = await getJson(url, config.token, config.requestTimeoutSeconds);
  return (Array.isArray(jobs) ? jobs : [])
    .filter((job) => TERMINAL_FAILURE.has(job.status) || TERMINAL_BLOCKED.has(job.status))
    .map((job) => ({
      id: job.id,
      name: job.name,
      stage: job.stage,
      status: job.status,
      web_url: job.web_url,
    }));
}

function result(status, extra = {}) {
  return { status, ...extra };
}

async function run(config) {
  const startedAt = Date.now();
  const finish = (status, extra = {}) => result(status, {
    wait_seconds: Number(((Date.now() - startedAt) / 1000).toFixed(3)),
    ...extra,
  });
  const deadline = Date.now() + config.timeoutSeconds * 1000;
  const pipeline = await findPipeline(config, deadline);
  if (!pipeline) {
    return finish('not_evaluated', {
      reason: 'No pipeline matched the exact commit SHA and ref before timeout',
      sha: config.sha,
      ref: config.ref,
      project: config.projectPath,
    });
  }

  let current = pipeline;
  while (Date.now() < deadline) {
    if (TERMINAL_SUCCESS.has(current.status)) {
      return finish('success', { pipeline: current });
    }
    if (TERMINAL_FAILURE.has(current.status)) {
      return finish('failed', {
        pipeline: current,
        failed_jobs: await getFailedJobs(config, current.id),
      });
    }
    if (TERMINAL_BLOCKED.has(current.status)) {
      return finish('blocked', {
        pipeline: current,
        failed_jobs: await getFailedJobs(config, current.id),
      });
    }

    await sleep(Math.min(config.pollSeconds, Math.max(0, (deadline - Date.now()) / 1000)));
    const url = apiUrl(config.baseUrl, config.projectPath, `/pipelines/${current.id}`);
    current = await getJson(url, config.token, config.requestTimeoutSeconds);
  }

  return finish('not_evaluated', {
    reason: 'Pipeline did not reach a terminal state before timeout',
    pipeline: current,
  });
}

function exitCode(status) {
  if (status === 'success') return 0;
  if (status === 'failed' || status === 'blocked') return 1;
  return 2;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return 0;
  }
  const config = {
    baseUrl: args['base-url'] || process.env.GITLAB_BASE_URL || DEFAULT_BASE_URL,
    projectPath: required(args.project || process.env.GITLAB_PROJECT_PATH, 'project path'),
    token: process.env.GITLAB_TOKEN,
    sha: required(args.sha, 'commit SHA'),
    ref: required(args.ref, 'ref'),
    pollSeconds: args['poll-seconds'] ? positiveNumber(args['poll-seconds'], '--poll-seconds') : DEFAULT_POLL_SECONDS,
    timeoutSeconds: args['timeout-seconds'] ? positiveNumber(args['timeout-seconds'], '--timeout-seconds') : DEFAULT_TIMEOUT_SECONDS,
    requestTimeoutSeconds: args['request-timeout-seconds']
      ? positiveNumber(args['request-timeout-seconds'], '--request-timeout-seconds')
      : DEFAULT_REQUEST_TIMEOUT_SECONDS,
  };
  if (!config.token) {
    throw configError('Missing GITLAB_TOKEN; set a read-only token in the environment');
  }
  const output = await run(config);
  process.stdout.write(`${JSON.stringify(output)}\n`);
  return exitCode(output.status);
}

main().then((code) => {
  process.exitCode = code;
}).catch((error) => {
  const status = error.code === 'config_error' ? 'blocked' : 'not_evaluated';
  process.stdout.write(`${JSON.stringify(result(status, { reason: error.message, error_code: error.code || 'unknown' }))}\n`);
  process.exitCode = 2;
});
