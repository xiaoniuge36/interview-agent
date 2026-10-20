import { Prisma, PrismaClient } from '@prisma/client';
import { PUBLIC_AGENT_FRAMEWORK_ENGINEERING_OPEN_QUESTIONS } from '../src/modules/practice/public-agent-framework-engineering-open-questions';
import { PUBLIC_AGENT_FRAMEWORK_OPEN_QUESTIONS } from '../src/modules/practice/public-agent-framework-open-questions';

const prisma = new PrismaClient();
const questions = [
  ...PUBLIC_AGENT_FRAMEWORK_OPEN_QUESTIONS,
  ...PUBLIC_AGENT_FRAMEWORK_ENGINEERING_OPEN_QUESTIONS,
];

async function main() {
  const inserted = await prisma.$transaction(async (transaction) => {
    await transaction.tenant.upsert({
      where: { id: 'public' },
      create: { id: 'public', slug: 'public', name: 'Public Question Bank' },
      update: {},
    });
    const result = await transaction.question.createMany({
      data: questions.map((question) => ({
        id: question.id,
        tenantId: 'public',
        visibility: question.visibility,
        title: question.title,
        stem: question.stem,
        type: question.type,
        difficulty: question.difficulty,
        tags: question.tags,
        answer: question.answer,
        rubric: question.rubric as Prisma.InputJsonValue,
        options: [] as Prisma.InputJsonValue,
        correctOptionIds: [],
        sourceRefs: question.sourceRefs,
        status: question.status,
      })),
      skipDuplicates: true,
    });
    return result.count;
  });
  console.info(`Inserted ${inserted} of ${questions.length} Agent framework questions.`);
}

main()
  .catch((error: unknown) => {
    console.error('Agent framework question seed failed.', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
