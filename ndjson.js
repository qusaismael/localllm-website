async function* parseNdjson(body) {
  if (!body) throw new Error('No response stream');
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = pending.indexOf('\n')) !== -1) {
        const line = pending.slice(0, newline).trim();
        pending = pending.slice(newline + 1);
        if (line) yield JSON.parse(line);
      }
    }
    pending += decoder.decode();
    if (pending.trim()) yield JSON.parse(pending.trim());
  } finally {
    reader.releaseLock();
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { parseNdjson };
