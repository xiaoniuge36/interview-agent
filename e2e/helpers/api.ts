import { randomUUID } from 'node:crypto';

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3101/api';
const E2E_MODEL_BASE_URL = 'https://model.e2e.test/v1';
const ANSWER = '我会说明背景、决策、结果和复盘。';

export type LocalUser = {
  accessToken: string;
  email: string;
  password: string;
};

type PracticeSession = {
  id: string;
  items: Array<{ id: string }>;
};

export async function registerUser(label: string): Promise<LocalUser> {
  const email = `${label}-${randomUUID()}@interview-agent.test`;
  const password = 'E2e-user-password-123';
  const session = await request<{ accessToken: string }>('/auth/register', {
    method: 'POST',
    body: { email, name: 'E2E 用户', password },
  });
  return { accessToken: session.accessToken, email, password };
}

export async function verifyModelConnection(user: LocalUser, apiKey: string): Promise<void> {
  const credential = await request<{ id: string }>('/model-credentials', {
    method: 'POST',
    token: user.accessToken,
    body: {
      apiKey,
      baseUrl: E2E_MODEL_BASE_URL,
      isDefault: true,
      model: 'e2e-model',
      provider: 'openai_compatible',
    },
  });
  await request(`/model-credentials/${credential.id}/test`, {
    method: 'POST',
    token: user.accessToken,
  });
}

export async function createPracticeFixture(user: LocalUser): Promise<PracticeSession> {
  const job = await request<{ intent: { id: string } }>('/job-intents', {
    method: 'POST',
    token: user.accessToken,
    body: {
      targetRole: '后端开发工程师',
      jdText: '负责高并发服务设计、稳定性治理与可观测性建设，能够清晰说明技术取舍和业务结果。',
    },
  });
  return request<PracticeSession>('/practices', {
    method: 'POST',
    token: user.accessToken,
    body: { jobIntentId: job.intent.id, mode: 'smart', title: 'E2E 智能训练' },
  });
}

export async function savePracticeAnswers(
  user: LocalUser,
  session: PracticeSession,
): Promise<void> {
  for (const item of session.items) {
    await request(`/practices/${session.id}/answers/${item.id}`, {
      method: 'POST',
      token: user.accessToken,
      body: { answer: ANSWER },
    });
  }
}

async function request<T>(
  path: string,
  input: { body?: unknown; method: 'POST'; token?: string },
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: input.method,
    headers: {
      ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
      ...(input.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(input.body ? { body: JSON.stringify(input.body) } : {}),
  });
  if (!response.ok) throw new Error(`E2E API ${path} failed with ${response.status}.`);
  return response.json() as Promise<T>;
}
