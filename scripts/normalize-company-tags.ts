/**
 * 一次性数据修正：把存量题目 tags 里的裸公司名规范化为 company: 前缀，
 * 使公司只出现在公司筛选维度，不再混入「高频能力点」等能力标签区。
 */
import { PrismaClient } from '@prisma/client';

const COMPANIES = [
  '华为',
  '谷歌',
  '腾讯',
  '阿里巴巴',
  '字节跳动',
  '美团',
  '京东',
  '拼多多',
  '小红书',
  'Google',
  'Meta',
  'OpenAI',
  'Anthropic',
  '微软',
  '百度',
];

async function main() {
  const prisma = new PrismaClient();
  const dryRun = !process.argv.includes('--apply');
  const questions = await prisma.question.findMany({
    where: { tags: { hasSome: COMPANIES } },
    select: { id: true, title: true, tags: true },
  });
  console.log(`matched ${questions.length} questions (${dryRun ? 'dry-run' : 'APPLY'})`);
  for (const question of questions) {
    const nextTags = [
      ...new Set(
        question.tags.map((tag) => (COMPANIES.includes(tag) ? `company:${tag}` : tag)),
      ),
    ];
    console.log(`- ${question.title}: [${question.tags}] -> [${nextTags}]`);
    if (!dryRun) {
      await prisma.question.update({ where: { id: question.id }, data: { tags: nextTags } });
    }
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
