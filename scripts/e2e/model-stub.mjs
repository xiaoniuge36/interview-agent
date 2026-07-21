/* global console, process */

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const LOOPBACK_HOST = '127.0.0.1';
const COMPLETIONS_PATH = '/v1/chat/completions';
const TOKEN_USAGE = { prompt_tokens: 11, completion_tokens: 12, total_tokens: 23 };
const EVALUATION_CONTENT = JSON.stringify({
  feedback: '回答已经覆盖核心背景、关键决策和结果，建议补充异常处理细节。',
  score: 88,
  missingPoints: ['异常恢复'],
  rubricScores: [{ point: '系统设计', score: 88 }],
  followUpQuestion: '请说明一次异常恢复方案如何验证。',
});
const INTERVIEW_CONTENT = JSON.stringify({
  stage: 'jd_core',
  content: '请结合岗位要求说明你的关键技术取舍。',
  shouldFinish: false,
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void launch();
}

export async function startModelStub({ port }) {
  const server = createServer((request, response) => {
    void handleRequest(request, response);
  });
  const address = await listen(server, port);
  return {
    baseUrl: `http://${LOOPBACK_HOST}:${address.port}/v1`,
    close: () => close(server),
  };
}

async function launch() {
  const port = Number(process.argv[2] ?? 4100);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('Model stub port must be a valid TCP port.');
  }
  const stub = await startModelStub({ port });
  console.info(`E2E model stub listening at ${stub.baseUrl}`);
  const stop = async () => {
    await stub.close();
    process.exit(0);
  };
  process.once('SIGINT', () => void stop());
  process.once('SIGTERM', () => void stop());
}

async function handleRequest(request, response) {
  if (request.method !== 'POST' || request.url !== COMPLETIONS_PATH) {
    writeJson(response, 404, { error: { message: 'not found' } });
    return;
  }
  const mode = request.headers.authorization?.replace(/^Bearer\s+/u, '') ?? 'e2e-success';
  if (mode === 'e2e-rate-limited') {
    writeJson(response, 429, { error: { message: 'e2e rate limit' } });
    return;
  }
  const payload = await requestBody(request);
  if (isPageAgentRequest(payload)) {
    writeJson(response, 200, pageAgentCompletionResponse());
    return;
  }
  const content = mode === 'e2e-invalid-json' ? '{invalid' : contentFor(payload);
  if (payload.stream === true) writeStream(response, content);
  else writeJson(response, 200, completionResponse(content));
}

function contentFor(payload) {
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const text = messages
    .map((message) => (typeof message?.content === 'string' ? message.content : ''))
    .join('\n');
  if (text.includes('feedback')) return EVALUATION_CONTENT;
  if (text.includes('面试官')) return INTERVIEW_CONTENT;
  return '这是固定的训练建议：优先练习当前薄弱能力，并用可量化结果复盘。';
}

function completionResponse(content) {
  return {
    id: 'e2e-completion',
    object: 'chat.completion',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: TOKEN_USAGE,
  };
}

function isPageAgentRequest(payload) {
  return (
    Array.isArray(payload.tools) &&
    payload.tools.some((tool) => tool?.function?.name === 'AgentOutput')
  );
}

function pageAgentCompletionResponse() {
  return {
    id: 'e2e-page-agent-completion',
    object: 'chat.completion',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          tool_calls: [
            {
              id: 'e2e-page-agent-done',
              type: 'function',
              function: {
                name: 'AgentOutput',
                arguments: JSON.stringify({
                  action: {
                    done: {
                      success: true,
                      text: '这是固定的训练建议：优先强化当前薄弱能力，再完成一组针对性练习。',
                    },
                  },
                }),
              },
            },
          ],
        },
        finish_reason: 'tool_calls',
      },
    ],
    usage: TOKEN_USAGE,
  };
}

function writeStream(response, content) {
  response.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
  for (const value of chunks(content)) {
    response.write(`data: ${JSON.stringify({ choices: [{ delta: { content: value } }] })}\n\n`);
  }
  response.write(`data: ${JSON.stringify({ choices: [], usage: TOKEN_USAGE })}\n\n`);
  response.end('data: [DONE]\n\n');
}

function chunks(content) {
  const midpoint = Math.ceil(content.length / 2);
  return [content.slice(0, midpoint), content.slice(midpoint)].filter(Boolean);
}

function writeJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

async function requestBody(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, LOOPBACK_HOST, () => {
      server.removeListener('error', reject);
      resolve(server.address());
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
