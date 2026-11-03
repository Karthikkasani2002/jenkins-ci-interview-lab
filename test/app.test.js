import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/app.js';

function makeResponse() {
  const storedHeaders = new Map();
  return {
    status: undefined,
    bodyText: '',
    headers: {
      get(name) {
        return storedHeaders.get(name.toLowerCase()) ?? null;
      },
    },
    writeHead(status, headers = {}) {
      this.status = status;
      for (const [name, value] of Object.entries(headers)) {
        storedHeaders.set(name.toLowerCase(), String(value));
      }
    },
    end(body = '') {
      this.bodyText = body ?? '';
    },
  };
}

async function callApp(app, path, options = {}) {
  const headers = Object.fromEntries(
    Object.entries(options.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]),
  );
  const body = options.body;
  const request = {
    method: options.method ?? 'GET',
    url: path,
    headers,
    resume() {},
    async *[Symbol.asyncIterator]() {
      if (body !== undefined && body.length > 0) {
        yield Buffer.from(body);
      }
    },
  };
  const response = makeResponse();
  await app(request, response);
  return {
    response,
    body: response.status === 204 ? null : JSON.parse(response.bodyText),
  };
}

const app = createApp();

async function jsonRequest(path, options = {}) {
  return callApp(app, path, options);
}

function jsonBody(value) {
  return {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  };
}

test('liveness and readiness are available and return request ids', async () => {
  const live = await jsonRequest('/health/live', { headers: { 'x-request-id': 'trace-123' } });
  assert.equal(live.response.status, 200);
  assert.equal(live.body.status, 'live');
  assert.equal(live.response.headers.get('x-request-id'), 'trace-123');
  assert.equal(live.response.headers.get('cache-control'), 'no-store');
  assert.equal(live.response.headers.get('x-content-type-options'), 'nosniff');

  const ready = await jsonRequest('/health/ready');
  assert.equal(ready.response.status, 200);
  assert.equal(ready.body.status, 'ready');
  assert.ok(ready.response.headers.get('x-request-id'));
});

test('invalid request ids are replaced with a generated id', async () => {
  const result = await jsonRequest('/health/live', { headers: { 'x-request-id': 'bad id' } });
  assert.equal(result.response.status, 200);
  assert.match(result.response.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);

  const listHeader = await jsonRequest('/health/live', { headers: { 'x-request-id': ['a', 'b'] } });
  assert.match(listHeader.response.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);
});

test('task collection starts empty and rejects unknown status filters', async () => {
  const empty = await jsonRequest('/api/v1/tasks');
  assert.equal(empty.response.status, 200);
  assert.deepEqual(empty.body.items, []);

  const invalid = await jsonRequest('/api/v1/tasks?status=blocked');
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.body.error.code, 'invalid_status');
});

test('creating a task trims its title and returns a location', async () => {
  const created = await jsonRequest('/api/v1/tasks', {
    method: 'POST',
    ...jsonBody({ title: '  Ship CI  ', description: 'Build and test the service' }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.title, 'Ship CI');
  assert.equal(created.body.description, 'Build and test the service');
  assert.equal(created.body.status, 'open');
  assert.equal(typeof created.body.createdAt, 'string');
  assert.equal(created.response.headers.get('location'), '/api/v1/tasks/' + created.body.id);
  assert.match(created.response.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);
});

test('task creation validates content type, JSON, fields, and limits', async () => {
  const wrongType = await jsonRequest('/api/v1/tasks', { method: 'POST', body: 'title=hello' });
  assert.equal(wrongType.response.status, 415);
  assert.equal(wrongType.body.error.code, 'unsupported_media_type');

  const empty = await jsonRequest('/api/v1/tasks', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '',
  });
  assert.equal(empty.response.status, 400);
  assert.equal(empty.body.error.code, 'invalid_json');

  const malformed = await jsonRequest('/api/v1/tasks', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
  });
  assert.equal(malformed.response.status, 400);
  assert.equal(malformed.body.error.code, 'invalid_json');

  for (const value of [null, [], 'string', 42]) {
    const result = await jsonRequest('/api/v1/tasks', { method: 'POST', ...jsonBody(value) });
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error.code, 'invalid_json');
  }

  for (const value of [{}, { title: 1 }, { title: '   ' }, { title: 'x'.repeat(121) }]) {
    const result = await jsonRequest('/api/v1/tasks', { method: 'POST', ...jsonBody(value) });
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error.code, 'invalid_title');
  }

  for (const value of [
    { title: 'ok', description: 4 },
    { title: 'ok', description: null },
    { title: 'ok', description: 'x'.repeat(501) },
  ]) {
    const result = await jsonRequest('/api/v1/tasks', { method: 'POST', ...jsonBody(value) });
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error.code, 'invalid_description');
  }

  const unknownField = await jsonRequest('/api/v1/tasks', {
    method: 'POST', ...jsonBody({ title: 'ok', owner: 'someone' }),
  });
  assert.equal(unknownField.response.status, 400);
  assert.equal(unknownField.body.error.code, 'unknown_field');
});

test('task reads return 404 for a missing task and the task for a valid id', async () => {
  const missing = await jsonRequest('/api/v1/tasks/missing-task');
  assert.equal(missing.response.status, 404);
  assert.equal(missing.body.error.code, 'task_not_found');

  const created = await jsonRequest('/api/v1/tasks', {
    method: 'POST', ...jsonBody({ title: 'Read task' }),
  });
  const read = await jsonRequest('/api/v1/tasks/' + created.body.id);
  assert.equal(read.response.status, 200);
  assert.equal(read.body.id, created.body.id);
});

test('task updates validate fields and transition status', async () => {
  const created = await jsonRequest('/api/v1/tasks', {
    method: 'POST', ...jsonBody({ title: 'Update task' }),
  });
  const path = '/api/v1/tasks/' + created.body.id;

  const invalid = await jsonRequest(path, { method: 'PATCH', ...jsonBody({ status: 'blocked' }) });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.body.error.code, 'invalid_status');

  const unknownField = await jsonRequest(path, {
    method: 'PATCH', ...jsonBody({ status: 'done', title: 'rename' }),
  });
  assert.equal(unknownField.response.status, 400);
  assert.equal(unknownField.body.error.code, 'unknown_field');

  const updated = await jsonRequest(path, { method: 'PATCH', ...jsonBody({ status: 'done' }) });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.status, 'done');

  const openItems = await jsonRequest('/api/v1/tasks?status=open');
  assert.equal(openItems.body.items.some((item) => item.id === created.body.id), false);
  const doneItems = await jsonRequest('/api/v1/tasks?status=done');
  assert.equal(doneItems.body.items.some((item) => item.id === created.body.id), true);

  const reopened = await jsonRequest(path, { method: 'PATCH', ...jsonBody({ status: 'open' }) });
  assert.equal(reopened.response.status, 200);
  assert.equal(reopened.body.status, 'open');
});

test('task delete returns 204 once and then 404', async () => {
  const created = await jsonRequest('/api/v1/tasks', {
    method: 'POST', ...jsonBody({ title: 'Delete task' }),
  });
  const path = '/api/v1/tasks/' + created.body.id;

  const deleted = await jsonRequest(path, { method: 'DELETE' });
  assert.equal(deleted.response.status, 204);
  assert.equal(deleted.body, null);

  const deletedAgain = await jsonRequest(path, { method: 'DELETE' });
  assert.equal(deletedAgain.response.status, 404);
});

test('known routes reject unsupported methods with Allow headers', async () => {
  const collection = await jsonRequest('/api/v1/tasks', { method: 'PUT' });
  assert.equal(collection.response.status, 405);
  assert.equal(collection.response.headers.get('allow'), 'GET, POST');

  const item = await jsonRequest('/api/v1/tasks/task-1', { method: 'PUT' });
  assert.equal(item.response.status, 405);
  assert.equal(item.response.headers.get('allow'), 'GET, PATCH, DELETE');

  const health = await jsonRequest('/health/live', { method: 'POST' });
  assert.equal(health.response.status, 405);
  assert.equal(health.response.headers.get('allow'), 'GET');

  const readiness = await jsonRequest('/health/ready', { method: 'POST' });
  assert.equal(readiness.response.status, 405);
  assert.equal(readiness.response.headers.get('allow'), 'GET');
});

test('unknown routes and malformed task ids return bounded errors', async () => {
  const unknown = await jsonRequest('/not-a-route');
  assert.equal(unknown.response.status, 404);
  assert.equal(unknown.body.error.code, 'route_not_found');

  const malformed = await jsonRequest('/api/v1/tasks/%E0%A4%A');
  assert.equal(malformed.response.status, 400);
  assert.equal(malformed.body.error.code, 'invalid_task_id');

  const invalidCharacters = await jsonRequest('/api/v1/tasks/bad.id');
  assert.equal(invalidCharacters.response.status, 400);
  assert.equal(invalidCharacters.body.error.code, 'invalid_task_id');
});

test('request size limits and readiness failures are enforced', async () => {
  const limitedApp = createApp({ maxBodyBytes: 8 });
  const oversized = await callApp(limitedApp, '/api/v1/tasks', {
    method: 'POST', ...jsonBody({ title: 'too big' }),
  });
  assert.equal(oversized.response.status, 413);
  assert.equal(oversized.body.error.code, 'payload_too_large');

  const notReadyApp = createApp({ isReady: () => false });
  const notReady = await callApp(notReadyApp, '/health/ready');
  assert.equal(notReady.response.status, 503);
  assert.equal(notReady.body.error.code, 'not_ready');
});

test('missing tasks reject updates and deletes with the same safe 404 response', async () => {
  const path = '/api/v1/tasks/never-created';
  const update = await jsonRequest(path, { method: 'PATCH', ...jsonBody({ status: 'done' }) });
  assert.equal(update.response.status, 404);
  assert.equal(update.body.error.code, 'task_not_found');

  const remove = await jsonRequest(path, { method: 'DELETE' });
  assert.equal(remove.response.status, 404);
  assert.equal(remove.body.error.code, 'task_not_found');
});

test('unexpected dependency errors return a generic 500 without stack details', async () => {
  const brokenApp = createApp({
    isReady() {
      throw new Error('sensitive internal detail');
    },
  });
  const result = await callApp(brokenApp, '/health/ready');
  assert.equal(result.response.status, 500);
  assert.equal(result.body.error.code, 'internal_error');
  assert.doesNotMatch(JSON.stringify(result.body), /sensitive internal detail/);
});
test('invalid server configuration fails fast', () => {
  assert.throws(() => createApp({ maxBodyBytes: 0 }), /maxBodyBytes must be a positive integer/);
});

