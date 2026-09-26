const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const readme = fs.readFileSync(path.join(__dirname, '../README.md'), 'utf8');
const command = 'OLLAMA_ORIGINS="https://localllm.qusai.pro" ollama serve';

test('specific Ollama origin and copy button match the visible command', () => {
  assert.ok(html.includes(`<code id="corsCommand">${command}</code>`));
  assert.match(html, /class="copy-btn"[^>]*onclick="copyText\(document\.getElementById\('corsCommand'\)\.textContent\)"/);
  assert.ok(!html.includes('OLLAMA_ORIGINS=*'));
  assert.ok(readme.includes(command));
  assert.doesNotMatch(readme, /OLLAMA_ORIGINS\s*=\s*["']?\*/);
});
