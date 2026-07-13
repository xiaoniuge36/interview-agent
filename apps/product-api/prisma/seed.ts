import { Prisma, PrismaClient } from '@prisma/client';
import { seedQuestions, type Question } from '@interview-agent/contracts';

const PUBLIC_TENANT_ID = 'public';
const PUBLIC_TENANT_NAME = 'Public Question Bank';
const prisma = new PrismaClient();

async function seedDatabase() {
  await prisma.$transaction(async (transaction) => {
    await transaction.tenant.upsert({
      where: { slug: PUBLIC_TENANT_ID },
      create: {
        id: PUBLIC_TENANT_ID,
        slug: PUBLIC_TENANT_ID,
        name: PUBLIC_TENANT_NAME,
      },
      update: { name: PUBLIC_TENANT_NAME },
    });

    for (const question of seedQuestions) {
      await transaction.question.upsert(questionRecord(question));
    }
  });
}

function questionRecord(question: Question): Prisma.QuestionUpsertArgs {
  const data = {
    tenantId: PUBLIC_TENANT_ID,
    visibility: question.visibility,
    title: question.title,
    stem: question.stem,
    type: question.type,
    difficulty: question.difficulty,
    tags: question.tags,
    answer: question.answer,
    rubric: question.rubric as Prisma.InputJsonValue,
    sourceRefs: question.sourceRefs,
    status: question.status,
  };
  return {
    where: { id: question.id },
    create: { id: question.id, ...data },
    update: data,
  };
}

seedDatabase()
  .then(() => console.info(`Seeded ${seedQuestions.length} public questions.`))
  .catch((error: unknown) => {
    console.error('Database seed failed.', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
