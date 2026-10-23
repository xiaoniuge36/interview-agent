import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { QuestionSchema } from '@interview-agent/contracts';
import { buildAgentOpenQuestion } from '../apps/product-api/src/modules/practice/public-agent-question-builders';

/**
 * 把 ai-god-learn 中整理的两份项目面试题 Markdown 转成公共题库记录。
 *
 * 用法：
 *   pnpm db:seed:project-interview
 *   pnpm exec tsx scripts/seed-project-interview-questions.ts --dry-run
 *
 * 默认读取本机 ai-god-learn 面试题目录，可通过位置参数覆盖：
 *   pnpm exec tsx scripts/seed-project-interview-questions.ts <file1.md> <file2.md>
 */

const AI_GOD_LEARN_DIR =
  process.env.AI_GOD_LEARN_DIR ?? resolve(process.cwd(), '..', 'ai-god-learn');

const DEFAULT_SOURCES = [
  {
    path: resolve(AI_GOD_LEARN_DIR, '面试题', '24-InterviewAgent项目面试题.md'),
    project: 'InterviewAgent',
    key: 'interview-agent',
    tag: '项目:InterviewAgent',
  },
  {
    path: resolve(AI_GOD_LEARN_DIR, '面试题', '25-KnowledgeHub项目面试题.md'),
    project: 'KnowledgeHub',
    key: 'knowledge-hub',
    tag: '项目:KnowledgeHub',
  },
] as const;

const TENANT_ID = 'public';
const SOURCE_REF_PREFIX = 'fixture://ai-god-learn/project-interview';
const PROJECT_QUESTION_PREFIX = 'q-agent-bank-project-';

type SourceConfig = {
  path: string;
  project: string;
  key: string;
  tag: string;
};

type ParsedQuestion = {
  number: number;
  title: string;
  section: string;
  answer: string;
};

type ImportOptions = {
  dryRun: boolean;
  sources: SourceConfig[];
};

type RubricPointInput = { point: string; description: string };

type Difficulty = 'intro' | 'easy' | 'medium' | 'hard' | 'expert';
type QuestionType =
  | 'short_answer'
  | 'coding'
  | 'system_design'
  | 'project_deep_dive'
  | 'behavioral'
  | 'single_choice'
  | 'multiple_choice';

const SECTION_TAG_MAX_LENGTH = 24;
const MAX_TAGS = 20;
const HASH_LENGTH = 10;

const KEYWORD_TAGS: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /RAG|检索|召回|rerank|RRF|Chunk/i, tag: 'RAG' },
  { pattern: /知识图谱|Neo4j|实体|关系抽取|多跳/i, tag: '知识图谱' },
  { pattern: /记忆|Mem0|Redis 短期/i, tag: '记忆' },
  { pattern: /权限|ACL|RBAC|租户/i, tag: '权限与隔离' },
  { pattern: /评测|Golden|Langfuse|LangSmith|指标/i, tag: '评测' },
  { pattern: /模型网关|Provider|熔断|预算/i, tag: '模型网关' },
  { pattern: /部署|Docker|Compose|运维/i, tag: '部署运维' },
  { pattern: /安全|SSRF|密钥|脱敏/i, tag: '安全' },
  { pattern: /架构|分层|边界|单体|微服务/i, tag: '架构设计' },
];

const prisma = new PrismaClient();

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const existing = await loadExistingQuestions();
  const parsed = await loadSources(options.sources);
  const questions = parsed.map((item) => toQuestion(item, item.source));
  const newIds = new Set(questions.map((question) => question.id));
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let pendingInsert = 0;

  for (const question of questions) {
    if (existing.ids.has(question.id)) {
      if (options.dryRun) {
        console.info(`[dry-run][update] ${question.id} | ${question.title}`);
        updated += 1;
        continue;
      }
      await prisma.question.update({ where: { id: question.id }, data: question });
      updated += 1;
      continue;
    }
    if (existing.titles.has(normalizeTitle(question.title))) {
      skipped += 1;
      console.info(`跳过已存在题目：${question.title}`);
      continue;
    }
    if (options.dryRun) {
      console.info(
        `[dry-run][insert] ${question.id} | ${question.type}/${question.difficulty} | ${question.tags.join(',')} | ${question.title}`,
      );
      pendingInsert += 1;
      continue;
    }
    await prisma.question.create({ data: question });
    inserted += 1;
    existing.titles.add(normalizeTitle(question.title));
  }

  const staleIds = [...existing.ids].filter(
    (id) => id.startsWith(PROJECT_QUESTION_PREFIX) && !newIds.has(id),
  );
  if (options.dryRun) {
    console.info(
      `dry-run 完成：待插入 ${pendingInsert} 条，更新 ${updated} 条，跳过 ${skipped} 条，待清理 ${staleIds.length} 条。`,
    );
    return;
  }
  if (staleIds.length) {
    await prisma.question.deleteMany({ where: { id: { in: staleIds }, tenantId: TENANT_ID } });
  }
  console.info(
    `题库同步完成：inserted=${inserted}, updated=${updated}, skipped=${skipped}, removedStale=${staleIds.length}`,
  );
}

async function loadSources(sources: readonly SourceConfig[]) {
  const result: Array<ParsedQuestion & { source: SourceConfig }> = [];
  for (const source of sources) {
    const markdown = await readFile(source.path, 'utf8');
    const items = parseMarkdown(markdown);
    console.info(`[${source.project}] 解析到 ${items.length} 道题：${source.path}`);
    result.push(...items.map((item) => ({ ...item, source })));
  }
  return result;
}

async function loadExistingQuestions(): Promise<{ ids: Set<string>; titles: Set<string> }> {
  const rows = await prisma.question.findMany({
    where: { tenantId: TENANT_ID, status: 'published' },
    select: { id: true, title: true },
  });
  return {
    ids: new Set(rows.map((row) => row.id)),
    titles: new Set(rows.map((row) => normalizeTitle(row.title))),
  };
}

function parseArgs(args: readonly string[]): ImportOptions {
  const dryRun = args.includes('--dry-run');
  const files = args.filter((arg) => !arg.startsWith('--')).map((file) => resolve(file));
  const sources = files.length
    ? files.map((file, index) => sourceFor(file, index))
    : DEFAULT_SOURCES.map((source) => ({ ...source, path: resolve(source.path) }));
  return { dryRun, sources };
}

function sourceFor(file: string, index: number): SourceConfig {
  const name = basename(file);
  if (name.includes('KnowledgeHub') || name.includes('25-')) {
    const known = DEFAULT_SOURCES[1];
    return { ...known, path: file };
  }
  const known = DEFAULT_SOURCES[index] ?? DEFAULT_SOURCES[0];
  return { ...known, path: file };
}

async function loadExistingTitles(): Promise<Set<string>> {
  const rows = await prisma.question.findMany({
    where: { tenantId: TENANT_ID, status: 'published' },
    select: { title: true },
  });
  return new Set(rows.map((row) => normalizeTitle(row.title)));
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ');
}

function parseMarkdown(markdown: string): ParsedQuestion[] {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const questions: ParsedQuestion[] = [];
  let section = '';
  let current: { number: number; title: string; section: string; body: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const parsed = parseAnswer(current.body.join('\n'));
    if (parsed) {
      questions.push({
        number: current.number,
        title: current.title,
        section: current.section,
        answer: parsed,
      });
    }
    current = null;
  };

  for (const line of lines) {
    const sectionMatch = line.match(/^##\s+(.+?)\s*$/);
    if (sectionMatch) {
      flush();
      section = cleanSection(sectionMatch[1] ?? '');
      continue;
    }
    const questionMatch = line.match(/^###\s+(\d+)\.\s+(.+?)\s*$/);
    if (questionMatch) {
      flush();
      current = {
        number: Number(questionMatch[1]),
        title: questionMatch[2]?.trim() ?? '',
        section,
        body: [],
      };
      continue;
    }
    if (current) current.body.push(line);
  }
  flush();
  return questions;
}

function cleanSection(value: string): string {
  return value.replace(/^[一二三四五六七八九十]+、\s*/, '').trim();
}

/** 从题目正文里取 **答案**： 之后的内容，并清理 Markdown 痕迹。 */
function parseAnswer(body: string): string | null {
  const lines = body.split('\n');
  const start = lines.findIndex((line) => /^\s*\*\*答案\*\*\s*[：:]/.test(line));
  if (start < 0) return null;
  const firstLine = lines[start]?.replace(/^\s*\*\*答案\*\*\s*[：:]\s*/, '') ?? '';
  const rest = lines
    .slice(start + 1)
    .filter((line) => !/^\s*---\s*$/.test(line))
    .filter((line) => !/^#{2,3}\s+/.test(line));
  return normalizeAnswer([firstLine, ...rest].join('\n'));
}

function normalizeAnswer(value: string): string {
  const lines = value
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line, index, all) => line !== '' || (index > 0 && all[index - 1] !== ''));
  const normalized: string[] = [];
  for (const line of lines) {
    if (/^\|?\s*:?-{2,}/.test(line)) continue;
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim())
        .filter(Boolean);
      if (cells.length) normalized.push(cells.join('：'));
      continue;
    }
    normalized.push(line.replace(/^[-*]\s+/, '· '));
  }
  return normalized
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 20000);
}

function toQuestion(item: ParsedQuestion, source: SourceConfig) {
  const type = inferType(item);
  const difficulty = inferDifficulty(type);
  const tags = buildTags(item, source);
  const points = rubricPointsFor(type);
  const question = buildAgentOpenQuestion({
    suffix: `project-${source.key}-${shortHash(item.title)}`,
    title: item.title,
    stem: item.title,
    type,
    difficulty,
    tags,
    answer: item.answer,
    points: points.map((point) => point.point),
    sourceRefs: [`${SOURCE_REF_PREFIX}/${source.project}#${item.number}`],
  });
  question.rubric = points.map((point, index) => ({
    point: point.point,
    score: index === 0 ? 4 : 3,
    description: point.description,
  }));
  return QuestionSchema.parse(question);
}

function inferType(item: ParsedQuestion): QuestionType {
  const title = item.title;
  if (/手撕|写代码|编程题|实现一个函数/.test(title)) return 'coding';
  if (/系统设计|架构|怎么设计|如何设计|设计一个|技术选型/.test(title)) return 'system_design';
  if (/项目|实现|落地|难点|复盘|重做|简历|介绍|取舍|对比|为什么/.test(title)) {
    return 'project_deep_dive';
  }
  return 'short_answer';
}

function inferDifficulty(type: QuestionType): Difficulty {
  if (type === 'system_design' || type === 'project_deep_dive') return 'hard';
  if (type === 'coding') return 'hard';
  return 'medium';
}

function buildTags(item: ParsedQuestion, source: SourceConfig): string[] {
  const tags = new Set<string>(['项目面试题', source.tag]);
  const sectionTag = item.section
    .replace(/（[^）]*）/g, '')
    .trim()
    .slice(0, SECTION_TAG_MAX_LENGTH);
  if (sectionTag) tags.add(sectionTag);
  const text = `${item.section} ${item.title} ${item.answer}`;
  for (const keyword of KEYWORD_TAGS) {
    if (keyword.pattern.test(text)) tags.add(keyword.tag);
  }
  if (item.section.includes('面试表达')) tags.add('面试表达');
  return [...tags].slice(0, MAX_TAGS);
}

function rubricPointsFor(type: QuestionType): RubricPointInput[] {
  if (type === 'system_design') {
    return [
      { point: '架构与边界', description: '能说明系统分层、核心模块和职责边界。' },
      { point: '取舍与降级', description: '能说明方案取舍、失败场景和降级策略。' },
      { point: '落地与验证', description: '能给出实现细节、指标或验证方式。' },
    ];
  }
  if (type === 'project_deep_dive') {
    return [
      { point: '项目事实与数据', description: '能给出真实项目背景、角色和可核对的数据。' },
      { point: '问题定位与解决', description: '能说明难点、排查过程和最终解决方案。' },
      { point: '复盘与改进', description: '能说明边界、不足和下一步改进。' },
    ];
  }
  if (type === 'coding') {
    return [
      { point: '思路与复杂度', description: '能说明算法思路、边界条件和复杂度。' },
      { point: '代码正确性', description: '代码能覆盖正常与异常路径。' },
      { point: '工程化', description: '能说明测试、错误处理和可维护性。' },
    ];
  }
  return [
    { point: '概念与判断', description: '能给出明确结论并解释核心概念。' },
    { point: '项目例证', description: '能结合项目实现或数据举例说明。' },
    { point: '边界与追问', description: '能说明适用边界、反例和可能的追问。' },
  ];
}

function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, HASH_LENGTH);
}

main()
  .catch((error: unknown) => {
    console.error('项目面试题入库失败。', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
