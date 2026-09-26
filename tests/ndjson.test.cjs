const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseNdjson } = require('../ndjson.js');

function streamFromChunks(chunks) {
  return new ReadableStream({
    start(controller) {
      chunks.forEach(chunk => controller.enqueue(chunk));
      controller.close();
    }
  });
}

async function records(body) {
  const result = [];
  for await (const record of parseNdjson(body)) result.push(record);
  return result;
}

test('split UTF-8 and CRLF NDJSON yield complete records', async () => {
  const bytes = new TextEncoder().encode('{"message":{"content":"✓"}}\r\n{"done":true}');
  const mark = bytes.indexOf(0xe2);
  assert.ok(mark > 0, 'fixture contains multi-byte check mark');
  const chunks = [bytes.slice(0, mark + 1), bytes.slice(mark + 1, mark + 2), bytes.slice(mark + 2)];
  assert.deepEqual(await records(streamFromChunks(chunks)), [
    { message: { content: '✓' } }, { done: true }
  ]);
});

test('malformed frame is an error, never silently skipped', async () => {
  const body = streamFromChunks([new TextEncoder().encode('{broken}\n')]);
  await assert.rejects(() => records(body), SyntaxError);
});

test('trailing record without newline is parsed once', async () => {
  const body = streamFromChunks([new TextEncoder().encode('{"done":true}')]);
  assert.deepEqual(await records(body), [{ done: true }]);
});

test('browser loads parser before app', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const parser = html.indexOf('<script src="ndjson.js"></script>');
  const app = html.indexOf('<script src="app.js"></script>');
  assert.ok(parser >= 0 && app > parser, 'parser must be loaded before app.js');
});
