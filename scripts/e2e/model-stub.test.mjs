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

test('returns a low-score practice evaluation for the weakness-review loop', async () => {
  const stub = await startModelStub({ port: 0 });
  try {
    const response = await fetch(`${stub.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: 'Bearer e2e-success', 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'return feedback JSON' }] }),
    });
    const payload = await response.json();
    const evaluation = JSON.parse(payload.choices[0].message.content);

    assert.equal(evaluation.score, 48);
    assert.match(evaluation.feedback, /异常处理/u);
  } finally {
    await stub.close();
  }
});

test('returns a legal warmup transition for the initial interview turn', async () => {
  const stub = await startModelStub({ port: 0 });
  try {
    const response = await fetch(`${stub.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: 'Bearer e2e-success', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: '你是专业的中文模拟面试官。当前阶段：warmup。' },
          { role: 'user', content: '这是面试开始，请提出第一题。' },
        ],
      }),
    });
    const payload = await response.json();
    const decision = JSON.parse(payload.choices[0].message.content);

    assert.equal(decision.stage, 'warmup');
    assert.equal(decision.shouldFinish, false);
  } finally {
    await stub.close();
  }
});

test('returns a deterministic 1536-dimension embedding', async () => {
  const stub = await startModelStub({ port: 0 });
  try {
    const response = await fetch(`${stub.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { Authorization: 'Bearer e2e-success', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'e2e-model', input: ['支付链路异常恢复'] }),
    });
    const payload = await response.json();

    assert.equal(payload.data[0].embedding.length, 1536);
    assert.equal(payload.usage.total_tokens, 4);
  } finally {
    await stub.close();
  }
});
