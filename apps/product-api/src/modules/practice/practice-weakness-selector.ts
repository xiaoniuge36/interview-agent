import type { ProductRequestContext } from '../../common/context/request-context';
import type { PrismaService } from '../../common/database/prisma.service';

const WEAKNESS_QUESTION_COUNT = 5;
const WEAKNESS_CANDIDATE_LIMIT = 20;
const CURRENT_WEAK_SCORE = 60;

export async function selectWeaknessQuestions(
  prisma: PrismaService,
  context: ProductRequestContext,
) {
  const evidence = await prisma.evaluationResult.findMany({
    where: {
      tenantId: context.tenantId,
      sessionItem: {
        session: { userId: context.actor.id },
        question: {
          status: 'published',
          OR: [{ tenantId: context.tenantId }, { visibility: 'public' }],
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: WEAKNESS_CANDIDATE_LIMIT,
    select: { score: true, sessionItem: { select: { question: true } } },
  });
  const latest = new Map<string, (typeof evidence)[number]>();
  for (const item of evidence) {
    if (!latest.has(item.sessionItem.question.id)) latest.set(item.sessionItem.question.id, item);
  }
  return [...latest.values()]
    .filter((item) => item.score < CURRENT_WEAK_SCORE)
    .sort((left, right) => left.score - right.score)
    .slice(0, WEAKNESS_QUESTION_COUNT)
    .map((item) => item.sessionItem.question);
}
