import { mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

/**
 * 把 public 题库导出为 Obsidian 友好的 Markdown 资料。
 * 用法：
 *   pnpm exec tsx scripts/export-question-bank-to-obsidian.ts --out "<Obsidian 目录>/题库"
 * 输出目录由脚本完全托管，重复执行会覆盖其中的生成文件。
 */

type QuestionType =
  | 'short_answer'
  | 'coding'
  | 'system_design'
  | 'project_deep_dive'
  | 'behavioral'
  | 'single_choice'
  | 'multiple_choice';

type Difficulty = 'intro' | 'easy' | 'medium' | 'hard' | 'expert';

type RubricPoint = { point: string; score: number; description: string };
type QuestionOption = { id: string; text: string };

type QuestionRecord = {
  id: string;
  title: string;
  stem: string;
  type: QuestionType;
  difficulty: Difficulty;
  tags: string[];
  answer: string;
  rubric: RubricPoint[];
  options: QuestionOption[];
  sourceRefs: string[];
  updatedAt: Date;
};

type CategoryConfig = {
  key: string;
  label: string;
  file: string;
  tag: string;
  intro: string;
};

type DocFile = { name: string; content: string };

const DEFAULT_OUT_DIR =
  process.env.OBSIDIAN_QUESTION_BANK_DIR ??
  resolve(homedir(), 'Documents', 'Obsidian Vault', '面试agent', '题库');
const GENERATED_MARKER = '.obsidian-question-bank';
const PUBLIC_TENANT_ID = 'public';
const RETRIEVAL_TOPIC_FILE = '专题-RAG检索与知识图谱15问';
const RETRIEVAL_QUESTION_PREFIX = 'q-agent-bank-retrieval-';
const COMPANY_TAG_PREFIX = 'company:';
const ROLE_TAG_PREFIX = 'role:';

const CATEGORIES: readonly CategoryConfig[] = [
  {
    key: 'ai_agent',
    label: 'AI Agent',
    file: '01-AI-Agent',
    tag: '面试题库/AI-Agent',
    intro: 'Agent 原理、RAG、检索评测、框架与工程化。',
  },
  {
    key: 'engineering',
    label: '研发工程',
    file: '02-研发工程',
    tag: '面试题库/研发工程',
    intro: '系统设计、工程质量、稳定性与性能优化。',
  },
  {
    key: 'data',
    label: '数据与算法',
    file: '03-数据与算法',
    tag: '面试题库/数据与算法',
    intro: '指标、实验、数据质量与建模方法。',
  },
  {
    key: 'product_design',
    label: '产品与设计',
    file: '04-产品与设计',
    tag: '面试题库/产品与设计',
    intro: '需求判断、方案取舍、体验与协作。',
  },
  {
    key: 'growth_operations',
    label: '增长与运营',
    file: '05-增长与运营',
    tag: '面试题库/增长与运营',
    intro: '用户分层、转化漏斗、投放 ROI 与复盘。',
  },
  {
    key: 'business_delivery',
    label: '商业与交付',
    file: '06-商业与交付',
    tag: '面试题库/商业与交付',
    intro: '客户价值、方案交付与商业判断。',
  },
  {
    key: 'generic',
    label: '通用能力',
    file: '07-通用能力',
    tag: '面试题库/通用能力',
    intro: '行为面试、沟通表达与职业选择。',
  },
  {
    key: 'external',
    label: '外部公司题库',
    file: '08-外部公司题库',
    tag: '面试题库/外部公司题库',
    intro: '来自 agent-interview-hub 的公司面试题，按公司分组。',
  },
];

const RETRIEVAL_TOPIC_ORDER = [
  'q-agent-bank-retrieval-issues-found',
  'q-agent-bank-retrieval-optimization-order',
  'q-agent-bank-retrieval-quality-judgment-langsmith',
  'q-agent-bank-retrieval-hardest-problem',
  'q-agent-bank-retrieval-vector-vs-hybrid',
  'q-agent-bank-retrieval-merge-two-lists',
  'q-agent-bank-retrieval-rrf-rerank-small-model',
  'q-agent-bank-retrieval-chunk-size',
  'q-agent-bank-retrieval-knowledge-graph-tradeoff',
  'q-agent-bank-retrieval-graph-hybrid-failure',
  'q-agent-bank-retrieval-graph-accuracy-value',
  'q-agent-bank-retrieval-kg-extraction-evaluation',
  'q-agent-bank-retrieval-kg-extraction-numbers',
  'q-agent-bank-retrieval-pdf-image-parsing',
  'q-agent-bank-retrieval-ocr-quality',
];

const TYPE_LABELS: Record<QuestionType, string> = {
  short_answer: '简答题',
  coding: '编程题',
  system_design: '系统设计',
  project_deep_dive: '项目深挖',
  behavioral: '行为面试',
  single_choice: '单选题',
  multiple_choice: '多选题',
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  intro: '入门',
  easy: '基础',
  medium: '进阶',
  hard: '高阶',
  expert: '专家',
};

const TYPE_ORDER: Record<QuestionType, number> = {
  system_design: 0,
  project_deep_dive: 1,
  short_answer: 2,
  coding: 3,
  behavioral: 4,
  single_choice: 5,
  multiple_choice: 6,
};

const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  expert: 0,
  hard: 1,
  medium: 2,
  easy: 3,
  intro: 4,
};

const prisma = new PrismaClient();

async function main() {
  const outDir = resolve(parseOutDir(process.argv.slice(2)));
  const records = await loadQuestions();
  const docs = buildDocuments(records);
  await writeDocuments(outDir, docs);
  console.info(
    `Exported ${records.length} questions to ${outDir} (${docs.length} Markdown files).`,
  );
}

function parseOutDir(args: readonly string[]): string {
  const flagIndex = args.findIndex((arg) => arg === '--out');
  if (flagIndex >= 0) {
    const value = args[flagIndex + 1];
    if (!value) throw new Error(`--out 缺少目录。示例：--out "${DEFAULT_OUT_DIR}"`);
    return value;
  }
  return args[0] ?? DEFAULT_OUT_DIR;
}

async function loadQuestions(): Promise<QuestionRecord[]> {
  const rows = await prisma.question.findMany({
    where: {
      tenantId: PUBLIC_TENANT_ID,
      visibility: 'public',
      status: 'published',
    },
    select: {
      id: true,
      title: true,
      stem: true,
      type: true,
      difficulty: true,
      tags: true,
      answer: true,
      rubric: true,
      options: true,
      sourceRefs: true,
      updatedAt: true,
    },
  });
  return rows.map((row) => ({
    ...row,
    type: row.type as QuestionType,
    difficulty: row.difficulty as Difficulty,
    rubric: parseRubric(row.rubric),
    options: parseOptions(row.options),
  }));
}

function parseRubric(value: unknown): RubricPoint[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const point = readString(entry, 'point');
    const description = readString(entry, 'description');
    const score = readNumber(entry, 'score');
    return point && description ? [{ point, description, score }] : [];
  });
}

function parseOptions(value: unknown): QuestionOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const id = readString(entry, 'id');
    const text = readString(entry, 'text');
    return id && text ? [{ id, text }] : [];
  });
}

function readString(record: object, key: string): string {
  const value = (record as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function readNumber(record: object, key: string): number {
  const value = (record as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function buildDocuments(records: readonly QuestionRecord[]): DocFile[] {
  const generatedAt = formatTimestamp(new Date());
  const groups = groupByCategory(records);
  const files = CATEGORIES.flatMap((category) => {
    const questions = groups.get(category.key) ?? [];
    if (!questions.length) return [];
    return [categoryDocument(category, questions, generatedAt)];
  });
  const topicQuestions = orderRetrievalTopic(records);
  if (topicQuestions.length) {
    files.push(retrievalTopicDocument(topicQuestions, generatedAt));
  }
  files.unshift(indexDocument(records, generatedAt));
  return files;
}

function groupByCategory(records: readonly QuestionRecord[]): Map<string, QuestionRecord[]> {
  const groups = new Map<string, QuestionRecord[]>(
    CATEGORIES.map((category) => [category.key, []]),
  );
  for (const record of records) {
    groups.get(categoryKeyFor(record.tags))?.push(record);
  }
  for (const [key, questions] of groups) {
    groups.set(key, [...questions].sort(compareQuestions));
  }
  return groups;
}

function categoryKeyFor(tags: readonly string[]): string {
  const roleTag = tags.find((tag) => tag.startsWith(ROLE_TAG_PREFIX));
  if (!roleTag) return 'external';
  const key = roleTag.slice(ROLE_TAG_PREFIX.length);
  return CATEGORIES.some((category) => category.key === key) ? key : 'generic';
}

function compareQuestions(left: QuestionRecord, right: QuestionRecord): number {
  return (
    TYPE_ORDER[left.type] - TYPE_ORDER[right.type] ||
    DIFFICULTY_ORDER[left.difficulty] - DIFFICULTY_ORDER[right.difficulty] ||
    left.title.localeCompare(right.title, 'zh-CN')
  );
}

function orderRetrievalTopic(records: readonly QuestionRecord[]): QuestionRecord[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  return RETRIEVAL_TOPIC_ORDER.flatMap((id) => {
    const record = byId.get(id);
    return record ? [record] : [];
  });
}

function indexDocument(records: readonly QuestionRecord[], generatedAt: string): DocFile {
  const groups = groupByCategory(records);
  const rows = CATEGORIES.map((category) => {
    const count = groups.get(category.key)?.length ?? 0;
    return `| [[${category.file}\\|${category.label}]] | ${count} | ${category.intro} |`;
  });
  const typeRows = countBy(records, (record) => TYPE_LABELS[record.type])
    .map(([label, count]) => `| ${label} | ${count} |`)
    .join('\n');
  const companyCount = countCompanies(records).length;
  const content = [
    frontmatter('面试题库总览', '面试题库', generatedAt),
    '# 面试题库总览',
    '',
    '> [!info] 同步信息',
    '> - 来源：`interview-agent` 公共题库（PostgreSQL `Question` 表）',
    `> - 同步时间：${generatedAt}`,
    '> - 范围：`tenantId=public`、`visibility=public`、`status=published`',
    `> - 题目总数：${records.length} 题（外部公司题库 ${groups.get('external')?.length ?? 0} 题，覆盖 ${companyCount} 家公司）`,
    '> - 本目录由同步脚本生成，手工修改会在下次同步时被覆盖。',
    '',
    '## 分类导航',
    '',
    '| 分类 | 题量 | 内容 |',
    '| --- | ---: | --- |',
    ...rows,
    '',
    '## 专题',
    '',
    `- [[${RETRIEVAL_TOPIC_FILE}|RAG 检索与知识图谱 15 问]]：检索评测、混合召回、RRF / Rerank、Chunk 策略、知识图谱与文档解析。`,
    '',
    '## 题型分布',
    '',
    '| 题型 | 题量 |',
    '| --- | ---: |',
    typeRows,
    '',
    '## 使用方式',
    '',
    '> [!tip] 复习建议',
    '> - 先看题目，尝试自己口述 30 秒，再展开「参考答案」对照评分要点。',
    '> - 答案默认折叠：点击答案标题右侧箭头展开；折叠内容仍可被 Obsidian 搜索命中。',
    '> - 按难度从「专家 / 高阶」开始刷项目深挖与系统设计，再用简答题补齐概念。',
    '',
    '## 重新同步',
    '',
    '```powershell',
    `pnpm exec tsx scripts/export-question-bank-to-obsidian.ts --out "${DEFAULT_OUT_DIR}"`,
    '```',
    '',
  ].join('\n');
  return { name: '面试题库总览.md', content };
}

function categoryDocument(
  category: CategoryConfig,
  questions: readonly QuestionRecord[],
  generatedAt: string,
): DocFile {
  const header = [
    frontmatter(categoryTitle(category), category.tag, generatedAt),
    `# ${categoryTitle(category)}`,
    '',
    `> [!info] 共 ${questions.length} 题 · ${category.intro}`,
    `> 返回 [[面试题库总览]]${category.key === 'ai_agent' ? ` · 专题 [[${RETRIEVAL_TOPIC_FILE}|RAG 检索与知识图谱 15 问]]` : ''}`,
    '',
  ].join('\n');
  const body =
    category.key === 'external' ? renderCompanyGroups(questions) : renderQuestionList(questions, 2);
  return { name: `${category.file}.md`, content: `${header}\n${body}` };
}

function categoryTitle(category: CategoryConfig): string {
  return category.key === 'external' ? category.label : `${category.label} 面试题库`;
}

/** 外部题库按公司分组，题目标题降一级避免与公司标题抢层级。 */
function renderCompanyGroups(questions: readonly QuestionRecord[]): string {
  const groups = new Map<string, QuestionRecord[]>();
  for (const question of questions) {
    const company = companyNameFor(question.tags) ?? '未标注公司';
    groups.set(company, [...(groups.get(company) ?? []), question]);
  }
  const sorted = [...groups.entries()].sort((left, right) =>
    left[0].localeCompare(right[0], 'zh-CN'),
  );
  return sorted
    .map(([company, items]) => {
      const header = [`## ${company}（${items.length} 题）`, ''].join('\n');
      return `${header}\n${renderQuestionList(items, 3)}`;
    })
    .join('\n');
}

function retrievalTopicDocument(
  questions: readonly QuestionRecord[],
  generatedAt: string,
): DocFile {
  const header = [
    frontmatter('RAG 检索与知识图谱 15 问', '面试题库/专题/RAG', generatedAt),
    '# RAG 检索与知识图谱 15 问',
    '',
    '> [!info] 面试专题 · 共 15 题',
    '> 来自「RAG 与 Agentic RAG」课程配套题库，覆盖检索诊断、评测、融合、重排、切片、知识图谱、PDF 与 OCR。',
    '> 返回 [[面试题库总览]] · 完整题目见 [[01-AI-Agent]]。',
    '',
    '## 答题主线',
    '',
    '> [!tip] 一套可复用的回答结构',
    '> 1. 先给判断：问题属于数据、切片、召回、排序还是生成。',
    '> 2. 再给证据：Recall@K、MRR、nDCG、引用命中率或失败样本。',
    '> 3. 最后给取舍：改动成本、延迟预算、维护成本与回退条件。',
    '',
  ].join('\n');
  return {
    name: `${RETRIEVAL_TOPIC_FILE}.md`,
    content: `${header}\n${renderQuestionList(questions, 2)}`,
  };
}

function renderQuestionList(questions: readonly QuestionRecord[], headingLevel: 2 | 3): string {
  return questions
    .map((question, index) => renderQuestion(question, index + 1, headingLevel))
    .join('\n');
}

function renderQuestion(question: QuestionRecord, index: number, headingLevel: number): string {
  const heading = '#'.repeat(headingLevel);
  const company = companyNameFor(question.tags);
  const meta = [
    `\`${TYPE_LABELS[question.type]}\``,
    `\`${DIFFICULTY_LABELS[question.difficulty]}\``,
    `分类：${categoryLabelFor(question.tags)}`,
    ...(company ? [`公司：${company}`] : []),
  ].join(' · ');
  const blocks = [
    `${heading} ${index}. ${question.title}`,
    '',
    meta,
    '',
    questionCallout(question),
    '',
    answerCallout(question.answer),
    '',
  ];
  if (question.rubric.length) {
    blocks.push(rubricCallout(question.rubric), '');
  }
  if (question.sourceRefs.length) {
    blocks.push(sourceCallout(question.sourceRefs), '');
  }
  blocks.push('---', '');
  return blocks.join('\n');
}

function questionCallout(question: QuestionRecord): string {
  const lines = [question.stem];
  if (question.options.length) {
    lines.push('', '**选项**');
    for (const option of question.options) lines.push(`- **${option.id}.** ${option.text}`);
  }
  return callout('question', '题目', lines, false);
}

function answerCallout(answer: string): string {
  return callout('success', '参考答案', answer.split('\n'), true);
}

function rubricCallout(rubric: readonly RubricPoint[]): string {
  const lines = rubric.map(
    (point) => `- **${point.point}**（${point.score} 分）：${point.description}`,
  );
  return callout('note', '评分要点', lines, true);
}

function sourceCallout(sourceRefs: readonly string[]): string {
  return callout(
    'quote',
    '来源',
    sourceRefs.map((ref) => `- <${ref}>`),
    true,
  );
}

function callout(
  type: string,
  title: string,
  lines: readonly string[],
  collapsed: boolean,
): string {
  const marker = `> [!${type}]${collapsed ? '-' : ''} ${title}`;
  const body = lines.map((line) => (line ? `> ${line}` : '>')).join('\n');
  return `${marker}\n${body}`;
}

function frontmatter(title: string, tag: string, generatedAt: string): string {
  return [
    '---',
    `title: "${title}"`,
    'tags:',
    `  - ${tag}`,
    `updated: "${generatedAt}"`,
    '---',
    '',
  ].join('\n');
}

function categoryLabelFor(tags: readonly string[]): string {
  const key = categoryKeyFor(tags);
  return CATEGORIES.find((category) => category.key === key)?.label ?? '通用能力';
}

function companyNameFor(tags: readonly string[]): string | null {
  const tag = tags.find((item) => item.startsWith(COMPANY_TAG_PREFIX));
  return tag ? tag.slice(COMPANY_TAG_PREFIX.length).trim() || null : null;
}

function countCompanies(records: readonly QuestionRecord[]): string[] {
  const companies = new Set<string>();
  for (const record of records) {
    const company = companyNameFor(record.tags);
    if (company) companies.add(company);
  }
  return [...companies].sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function countBy<T>(items: readonly T[], key: (item: T) => string): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

async function writeDocuments(outDir: string, docs: readonly DocFile[]): Promise<void> {
  await assertManagedDirectory(outDir);
  await rm(outDir, { force: true, recursive: true });
  await mkdir(outDir, { recursive: true });
  await writeFile(`${outDir}/${GENERATED_MARKER}`, 'Generated by interview-agent.\n', 'utf8');
  for (const doc of docs) {
    await writeFile(`${outDir}/${doc.name}`, doc.content, 'utf8');
  }
}

/** 只清空带生成标记的目录，避免误删用户手写笔记。 */
async function assertManagedDirectory(outDir: string): Promise<void> {
  const { stat, readdir } = await import('node:fs/promises');
  try {
    const info = await stat(outDir);
    if (!info.isDirectory()) throw new Error(`输出路径不是目录：${outDir}`);
    const entries = await readdir(outDir);
    if (entries.length > 0 && !entries.includes(GENERATED_MARKER)) {
      throw new Error(
        `输出目录非空且没有生成标记，拒绝覆盖：${outDir}\n` +
          '请换一个空目录，或手动确认后删除该目录再执行。',
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
}

function formatTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}`;
}

main()
  .catch((error: unknown) => {
    console.error('Obsidian question bank export failed.', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
