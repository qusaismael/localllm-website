const { test, expect } = require('@playwright/test');

test('chat stream joins fragmented JSON and UTF-8 before completion', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async () => {
    const bytes = new TextEncoder().encode(
      '{"message":{"content":"Hi ✓"},"done":false}\n' +
      '{"done":true,"eval_count":2,"eval_duration":1000000000,"total_duration":2000000000}\n'
    );
    const mark = bytes.indexOf(0xe2);
    const parts = [bytes.slice(0, mark + 1), bytes.slice(mark + 1, mark + 2), bytes.slice(mark + 2)];
    window.fetch = async () => new Response(new ReadableStream({
      start(controller) { parts.forEach(part => controller.enqueue(part)); controller.close(); }
    }), { status: 200 });
    const chunks = [];
    let completed = null;
    let error = null;
    await window.streamChat([{ role: 'user', content: 'test' }], 'fake',
      (part, full) => chunks.push([part, full]),
      (text, meta) => { completed = { text, meta }; },
      message => { error = message; });
    return { chunks, completed, error };
  });
  expect(result.error).toBeNull();
  expect(result.chunks).toEqual([['Hi ✓', 'Hi ✓']]);
  expect(result.completed.text).toBe('Hi ✓');
  expect(result.completed.meta.tokens).toBe(2);
});

test('chat stream reports premature EOF rather than success', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async () => {
    window.fetch = async () => new Response(
      '{"message":{"content":"partial"},"done":false}\n', { status: 200 }
    );
    let done = false;
    let error = null;
    await window.streamChat([{ role: 'user', content: 'test' }], 'fake',
      () => {}, () => { done = true; }, message => { error = message; });
    return { done, error };
  });
  expect(result).toEqual({ done: false, error: 'Chat ended before completion' });
});
