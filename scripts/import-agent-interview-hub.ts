import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Prisma, PrismaClient } from '@prisma/client';

type SourceQuestion = { question: string; answer: string; thinking?: string };
type SourceGroup = { company: string; questions: SourceQuestion[] };

const SOURCE_URL = 'https://github.com/Zchary1106/agent-interview-hub';
const DEFAULT_DATA_PATH = 'C:/Users/69483/AppData/Local/Temp/agent-interview-hub-a7335231-e701-4826-be74-fd18ea76c216/data.json';
const TENANT_ID = 'public';
const prisma = new PrismaClient();

async function main() {
  const dataPath = process.argv[2] ?? DEFAULT_DATA_PATH;
  const groups = JSON.parse(await readFile(dataPath, 'utf8')) as SourceGroup[];
  const questions = groups.flatMap((group) =>
    group.questions.map((question, index) => toQuestion(group.company, question, index)),
  );

  await prisma.$transaction(async (tx) => {
    await tx.tenant.upsert({
      where: { slug: TENANT_ID },
      create: { id: TENANT_ID, slug: TENANT_ID, name: 'Public Question Bank' },
      update: { name: 'Public Question Bank' },
    });
    for (const question of questions) {
      await tx.question.upsert({ where: { id: question.id }, create: question, update: question });
    }
  });

  console.info(`Imported ${questions.length} questions from ${dataPath}.`);
}

function toQuestion(company: string, source: SourceQuestion, index: number) {
  const id = `source-agent-interview-hub-${createHash('sha256')
    .update(`${company}\n${source.question}\n${index}`)
    .digest('hex')
    .slice(0, 24)}`;
  return {
    id,
    tenantId: TENANT_ID,
    visibility: 'public' as const,
    title: `[${company}] ${source.question}`,
    stem: source.question,
    type: inferType(source.question),
    difficulty: 'medium' as const,
    tags: ['agent-interview-hub', company],
    answer: source.answer,
    rubric: [{ point: '覆盖问题核心知识点并给出可落地的工程方案', score: 1, description: '答案应体现原题库提供的关键技术要点。' }] as Prisma.InputJsonValue,
    sourceRefs: [`${SOURCE_URL}#${company}`],
    status: 'published' as const,
  };
}

function inferType(question: string) {
  if (/设计|架构|系统|平台|服务|Agent 系统/.test(question)) return 'system_design' as const;
  if (/项目|落地|实现|开发/.test(question)) return 'project_deep_dive' as const;
  return 'short_answer' as const;
}

main().catch((error: unknown) => {
  console.error('Question import failed.', error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
