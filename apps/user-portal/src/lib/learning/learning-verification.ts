const LEARNING_SOURCE = 'learn';
const AGENT_SOURCE = 'agent';
const LEARNING_COURSE_ACTIONS_ANCHOR = 'learning-course-actions';

type LearningTopic = {
  slug: string;
  label: string;
  tag: string;
};

type LearningCourse = {
  slug: string;
  title: string;
  topic: LearningTopic | null;
};

const LEARNING_COURSES: readonly LearningCourse[] = [
  { slug: '学习路线-00-学习地图与能力验收', title: '学习地图与能力验收', topic: null },
  {
    slug: '学习路线-01-agent基础与上下文工程',
    title: 'Agent 基础与上下文工程',
    topic: { slug: 'react', label: 'ReAct', tag: 'ReAct' },
  },
  {
    slug: '学习路线-02-tool-calling与mcp',
    title: 'Tool Calling 与 MCP',
    topic: { slug: 'tool-calling', label: 'Tool Calling', tag: 'Tool Calling' },
  },
  {
    slug: '学习路线-03-rag与agentic-rag',
    title: 'RAG 与 Agentic RAG',
    topic: { slug: 'rag', label: 'RAG', tag: 'RAG' },
  },
  {
    slug: '学习路线-04-memory-planning与multi-agent',
    title: 'Memory、Planning 与 Multi-Agent',
    topic: { slug: 'memory', label: 'Memory 与编排', tag: '记忆与编排' },
  },
  {
    slug: '学习路线-05-evals可观测可靠性与安全',
    title: 'Evals、可观测、可靠性与安全',
    topic: { slug: 'evals', label: 'Agent 评估', tag: 'Agent 评估' },
  },
  {
    slug: '学习路线-06-生产架构成本部署与持续改进',
    title: '生产架构、成本、部署与持续改进',
    topic: { slug: 'production', label: '生产可靠性', tag: '生产可靠性' },
  },
  {
    slug: '学习路线-07-面试表达手撕代码与毕业项目',
    title: '面试表达、手撕代码与毕业项目',
    topic: { slug: 'expression', label: '面试表达', tag: '面试表达' },
  },
  {
    slug: '学习路线-08-computer-use与gui-agent',
    title: 'Computer Use 与 GUI Agent',
    topic: { slug: 'computer-use', label: 'Computer Use', tag: 'Computer Use' },
  },
  {
    slug: '学习路线-09-编码agent与长任务harness',
    title: '编码 Agent 与长任务 Harness 工程',
    topic: { slug: 'harness', label: 'Agent Harness', tag: 'Agent Harness' },
  },
  {
    slug: '学习路线-10-agent互操作协议与生态',
    title: 'Agent 互操作协议与生态',
    topic: { slug: 'protocols', label: '协议与互操作', tag: '协议与互操作' },
  },
  {
    slug: '学习路线-11-agent强化学习与后训练',
    title: 'Agent 强化学习与后训练',
    topic: { slug: 'agent-rl', label: 'Agent RL', tag: 'Agent RL' },
  },
];

export type LearningCourseSummary = {
  slug: string;
  title: string;
  topicLabel: string;
};

const COURSE_BY_TOPIC_TAG = new Map(
  LEARNING_COURSES.filter((course) => course.topic).map((course) => [course.topic!.tag, course]),
);

/** 按题库主题标签反查学习课程，用于把薄弱标签换算成补课入口。 */
export function learningCourseForTag(tag: string): LearningCourseSummary | null {
  const course = COURSE_BY_TOPIC_TAG.get(tag);
  if (!course?.topic) return null;
  return { slug: course.slug, title: course.title, topicLabel: course.topic.label };
}

export type LearningVerification =
  | { status: 'inactive' }
  | { status: 'invalid' }
  | { status: 'unavailable'; courseSlug: string; courseTitle: string }
  | {
      status: 'ready';
      courseSlug: string;
      courseTitle: string;
      topicLabel: string;
      topicSlug: string;
      query: { tags: string[]; type: 'single_choice' };
    };

export function learningVerificationHref(courseSlug: string) {
  const course = courseBySlug(courseSlug);
  const params = new URLSearchParams({ source: LEARNING_SOURCE, course: courseSlug });
  if (course?.topic) params.set('topic', course.topic.slug);
  return `/questions?${params.toString()}`;
}

export function learningVerificationActionLabel(courseSlug: string) {
  const topic = courseBySlug(courseSlug)?.topic;
  return topic ? `进入题库验证 · ${topic.label}` : '进入题库验证';
}

export function learningPracticeHref(sessionId: string, verification: LearningVerification) {
  const params = new URLSearchParams({ session: sessionId });
  if (verification.status !== 'ready') return `/practice?${params.toString()}`;
  params.set('origin', LEARNING_SOURCE);
  params.set('course', verification.courseSlug);
  params.set('topic', verification.topicSlug);
  return `/practice?${params.toString()}`;
}

export function resolveLearningVerification(input: {
  source: readonly string[];
  course: readonly string[];
  topic: readonly string[];
}): LearningVerification {
  if (isExistingQuestionEntry(input)) return { status: 'inactive' };
  if (!hasOnlyLearningSource(input.source) || input.course.length !== 1) {
    return { status: 'invalid' };
  }
  const course = courseBySlug(input.course[0] ?? '');
  if (!course) return { status: 'invalid' };
  if (!course.topic) {
    return input.topic.length === 0
      ? { status: 'unavailable', courseSlug: course.slug, courseTitle: course.title }
      : { status: 'invalid' };
  }
  if (input.topic.length !== 1 || input.topic[0] !== course.topic.slug) {
    return { status: 'invalid' };
  }
  return {
    status: 'ready',
    courseSlug: course.slug,
    courseTitle: course.title,
    topicLabel: course.topic.label,
    topicSlug: course.topic.slug,
    query: { tags: [course.topic.tag], type: 'single_choice' },
  };
}

export function learningVerificationReturnHref(courseSlug: string) {
  if (!courseBySlug(courseSlug)) return '/learn';
  return `/learn?doc=${encodeURIComponent(courseSlug)}#${LEARNING_COURSE_ACTIONS_ANCHOR}`;
}

export function isLearningVerificationReturnHash(hash: string) {
  return hash === `#${LEARNING_COURSE_ACTIONS_ANCHOR}`;
}

export { LEARNING_COURSE_ACTIONS_ANCHOR };

function isExistingQuestionEntry(input: {
  source: readonly string[];
  course: readonly string[];
  topic: readonly string[];
}) {
  const hasNoContext =
    input.source.length === 0 && input.course.length === 0 && input.topic.length === 0;
  const isAgentContext =
    input.source.length === 1 &&
    input.source[0] === AGENT_SOURCE &&
    input.course.length === 0 &&
    input.topic.length === 0;
  return hasNoContext || isAgentContext;
}

function hasOnlyLearningSource(source: readonly string[]) {
  return source.length === 1 && source[0] === LEARNING_SOURCE;
}

function courseBySlug(slug: string) {
  return LEARNING_COURSES.find((course) => course.slug === slug) ?? null;
}
