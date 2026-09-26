const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness(parts) {
  const body = new ReadableStream({
    start(controller) {
      parts.forEach(part => controller.enqueue(part));
      controller.close();
    }
  });
  const context = vm.createContext({
    localStorage: { getItem: () => null },
    document: { querySelector: () => null },
    window: {},
    fetch: async () => ({ ok: true, body }),
    TextDecoder,
    AbortController,
    console
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../ndjson.js'), 'utf8'), context);
  const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  const api = app.split('// ===== Setup Wizard =====')[0];
  assert.ok(api.includes('async function pullModel'), 'API section must be present');
  vm.runInContext(api, context);
  return context;
}

test('model pull joins fragmented progress and success frames', async () => {
  const bytes = new TextEncoder().encode(
    '{"status":"downloading","total":10,"completed":5}\n' +
    '{"status":"success"}\n'
  );
  const frames = [bytes.slice(0, 22), bytes.slice(22, 57), bytes.slice(57)];
  const api = harness(frames);
  const progress = [];
  let completed = 0;
  let error = null;
  await api.pullModel('test:tiny', (percent, status) => progress.push([percent, status]),
    () => { completed += 1; }, message => { error = message; });
  assert.deepEqual(progress, [[50, 'downloading'], [null, 'success']]);
  assert.equal(completed, 1);
  assert.equal(error, null);
});

test('model pull reports premature EOF and provider errors', async () => {
  for (const [frame, expected] of [
    ['{"status":"downloading","total":10,"completed":5}\n', 'Model download ended before success'],
    ['{"error":"disk full"}\n', 'disk full']
  ]) {
    const api = harness([new TextEncoder().encode(frame)]);
    let completed = false;
    let error = null;
    await api.pullModel('test:tiny', () => {}, () => { completed = true; },
      message => { error = message; });
    assert.equal(completed, false);
    assert.equal(error, expected);
  }
});

test('chat stream preserves fragmented Unicode and final token stats', async () => {
  const bytes = new TextEncoder().encode(
    '{"message":{"content":"Hi ✓"},"done":false}\n' +
    '{"done":true,"eval_count":2,"eval_duration":1000000000,"total_duration":2000000000}\n'
  );
  const mark = bytes.indexOf(0xe2);
  const api = harness([bytes.slice(0, mark + 1), bytes.slice(mark + 1, mark + 2), bytes.slice(mark + 2)]);
  const chunks = [];
  let final;
  let error;
  await api.streamChat([], 'test:tiny', (part, full) => chunks.push([part, full]),
    (text, stats) => { final = { text, stats }; }, message => { error = message; });
  assert.deepEqual(chunks, [['Hi ✓', 'Hi ✓']]);
  assert.equal(final.text, 'Hi ✓');
  assert.equal(final.stats.tokens, 2);
  assert.equal(final.stats.tokens_per_sec, '2.0');
  assert.equal(error, undefined);
});

test('chat stream reports premature EOF and provider errors', async () => {
  for (const [frame, expected] of [
    ['{"message":{"content":"partial"},"done":false}\n', 'Chat ended before completion'],
    ['{"error":"unknown model"}\n', 'unknown model']
  ]) {
    const api = harness([new TextEncoder().encode(frame)]);
    let completed = false;
    let error = null;
    await api.streamChat([], 'test:tiny', () => {}, () => { completed = true; },
      message => { error = message; });
    assert.equal(completed, false);
    assert.equal(error, expected);
  }
});
