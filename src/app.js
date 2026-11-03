import { randomUUID } from 'node:crypto';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,80}$/;
const TASK_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const ALLOWED_TASK_FIELDS = new Set(['title', 'description']);
const ALLOWED_UPDATE_FIELDS = new Set(['status']);

class HttpError extends Error {
  constructor(status, code, message, allow) {
    super(message);
    this.status = status;
    this.code = code;
    this.allow = allow;
  }
}

function requestIdFor(value, idFactory) {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value)
    ? value
    : idFactory();
}

function sendJson(response, status, requestId, body, extraHeaders = {}) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-request-id': requestId,
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

function sendNoContent(response, requestId) {
  response.writeHead(204, {
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-request-id': requestId,
  });
  response.end();
}

function fail(status, code, message, allow) {
  throw new HttpError(status, code, message, allow);
}

async function readJson(request, maxBodyBytes) {
  const contentType = String(request.headers['content-type'] ?? '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== 'application/json') {
    fail(415, 'unsupported_media_type', 'Content-Type must be application/json');
  }

  const chunks = [];
  let bytesRead = 0;
  for await (const chunk of request) {
    bytesRead += chunk.length;
    if (bytesRead > maxBodyBytes) {
      request.resume();
      fail(413, 'payload_too_large', 'Request body exceeds the configured limit');
    }
    chunks.push(chunk);
  }

  if (bytesRead === 0) {
    fail(400, 'invalid_json', 'Request body must contain a JSON object');
  }

  let parsed;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    fail(400, 'invalid_json', 'Request body must contain valid JSON');
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail(400, 'invalid_json', 'Request body must contain a JSON object');
  }
  return parsed;
}

function rejectUnknownFields(body, allowedFields) {
  if (Object.keys(body).some((field) => !allowedFields.has(field))) {
    fail(400, 'unknown_field', 'Request contains an unsupported field');
  }
}

function makeTask(body, idFactory, clock) {
  rejectUnknownFields(body, ALLOWED_TASK_FIELDS);
  if (typeof body.title !== 'string') {
    fail(400, 'invalid_title', 'title must be a string');
  }

  const title = body.title.trim();
  if (title.length === 0 || title.length > 120) {
    fail(400, 'invalid_title', 'title must contain 1 to 120 characters');
  }

  const description = body.description === undefined ? '' : body.description;
  if (typeof description !== 'string' || description.length > 500) {
    fail(400, 'invalid_description', 'description must be a string of at most 500 characters');
  }

  return {
    id: idFactory(),
    title,
    description,
    status: 'open',
    createdAt: clock().toISOString(),
  };
}

function updateTask(task, body) {
  rejectUnknownFields(body, ALLOWED_UPDATE_FIELDS);
  if (body.status !== 'open' && body.status !== 'done') {
    fail(400, 'invalid_status', 'status must be open or done');
  }
  return { ...task, status: body.status };
}

export function createApp({
  maxBodyBytes = 16_384,
  isReady = () => true,
  idFactory = randomUUID,
  clock = () => new Date(),
} = {}) {
  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes < 1) {
    throw new TypeError('maxBodyBytes must be a positive integer');
  }

  const tasks = new Map();

  return async function handleRequest(request, response) {
    const requestId = requestIdFor(request.headers['x-request-id'], idFactory);

    try {
      const url = new URL(request.url ?? '/', 'http://jenkins-ci.local');
      const { pathname } = url;

      if (pathname === '/health/live') {
        if (request.method !== 'GET') {
          fail(405, 'method_not_allowed', 'Method not allowed', 'GET');
        }
        sendJson(response, 200, requestId, { status: 'live' });
        return;
      }

      if (pathname === '/health/ready') {
        if (request.method !== 'GET') {
          fail(405, 'method_not_allowed', 'Method not allowed', 'GET');
        }
        if (!isReady()) {
          sendJson(response, 503, requestId, { error: { code: 'not_ready', message: 'Service is not ready' } });
          return;
        }
        sendJson(response, 200, requestId, { status: 'ready' });
        return;
      }

      if (pathname === '/api/v1/tasks') {
        if (request.method === 'GET') {
          const status = url.searchParams.get('status');
          if (status !== null && status !== 'open' && status !== 'done') {
            fail(400, 'invalid_status', 'status filter must be open or done');
          }
          const items = [...tasks.values()].filter((task) => status === null || task.status === status);
          sendJson(response, 200, requestId, { items });
          return;
        }

        if (request.method === 'POST') {
          const body = await readJson(request, maxBodyBytes);
          const task = makeTask(body, idFactory, clock);
          tasks.set(task.id, task);
          sendJson(response, 201, requestId, task, { location: '/api/v1/tasks/' + task.id });
          return;
        }

        fail(405, 'method_not_allowed', 'Method not allowed', 'GET, POST');
      }

      const taskPath = /^\/api\/v1\/tasks\/([^/]+)$/.exec(pathname);
      if (taskPath) {
        let taskId;
        try {
          taskId = decodeURIComponent(taskPath[1]);
        } catch {
          fail(400, 'invalid_task_id', 'Task id is not valid URL encoding');
        }
        if (!TASK_ID_PATTERN.test(taskId)) {
          fail(400, 'invalid_task_id', 'Task id contains unsupported characters');
        }

        const task = tasks.get(taskId);
        if (request.method === 'GET') {
          if (!task) {
            fail(404, 'task_not_found', 'Task was not found');
          }
          sendJson(response, 200, requestId, task);
          return;
        }

        if (request.method === 'PATCH') {
          if (!task) {
            fail(404, 'task_not_found', 'Task was not found');
          }
          const body = await readJson(request, maxBodyBytes);
          const updatedTask = updateTask(task, body);
          tasks.set(taskId, updatedTask);
          sendJson(response, 200, requestId, updatedTask);
          return;
        }

        if (request.method === 'DELETE') {
          if (!task) {
            fail(404, 'task_not_found', 'Task was not found');
          }
          tasks.delete(taskId);
          sendNoContent(response, requestId);
          return;
        }

        fail(405, 'method_not_allowed', 'Method not allowed', 'GET, PATCH, DELETE');
      }

      fail(404, 'route_not_found', 'Route was not found');
    } catch (error) {
      if (error instanceof HttpError) {
        const headers = error.allow ? { allow: error.allow } : {};
        sendJson(response, error.status, requestId, {
          error: { code: error.code, message: error.message },
          requestId,
        }, headers);
        return;
      }

      sendJson(response, 500, requestId, {
        error: { code: 'internal_error', message: 'An unexpected error occurred' },
        requestId,
      });
    }
  };
}

