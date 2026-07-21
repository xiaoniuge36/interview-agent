/* global fetch */

import assert from 'node:assert/strict';
import test from 'node:test';

import { startModelStub } from './model-stub.mjs';

test('returns a completed PageAgent tool call for a PageAgent request', async () => {
  const stub = await startModelStub({ port: 0 });
  try {
    const response = await fetch(`${stub.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '安排今天的训练' }],
        tools: [{ type: 'function', function: { name: 'AgentOutput' } }],
      }),
    });
    const payload = await response.json();
    const toolCall = payload.choices[0].message.tool_calls[0];
    const argumentsValue = JSON.parse(toolCall.function.arguments);

    assert.equal(toolCall.function.name, 'AgentOutput');
    assert.deepEqual(argumentsValue.action.done.success, true);
    assert.match(argumentsValue.action.done.text, /固定的训练建议/u);
  } finally {
    await stub.close();
  }
});
