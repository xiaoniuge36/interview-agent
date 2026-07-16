import type { QuestionCatalogResponse } from '@interview-agent/contracts';
import Link from 'next/link';

const TOPICS = [
  {
    category: 'ai_agent',
    glyph: 'AI',
    title: 'AI Agent 与大模型',
    description: 'Agent 架构、RAG、模型评估与工具调用',
  },
  {
    category: 'engineering',
    glyph: '</>',
    title: '研发工程',
    description: '系统设计、工程质量、稳定性与项目深挖',
  },
  {
    category: 'data',
    glyph: '∑',
    title: '数据与算法',
    description: '数据分析、算法思路、指标体系与实验设计',
  },
  {
    category: 'product_design',
    glyph: '◇',
    title: '产品与设计',
    description: '需求判断、方案权衡、用户体验与作品复盘',
  },
  {
    category: 'growth_operations',
    glyph: '↗',
    title: '增长与运营',
    description: '增长策略、内容运营、渠道分析与活动复盘',
  },
  {
    category: 'business_delivery',
    glyph: '◎',
    title: '商业与交付',
    description: '客户沟通、项目交付、销售判断与经营分析',
  },
  {
    category: 'generic',
    glyph: '✦',
    title: '通用表达',
    description: '自我介绍、行为面试、协作冲突与职业规划',
  },
] as const;

export function QuestionTopicGrid({ catalog }: { catalog: QuestionCatalogResponse | null }) {
  const counts = new Map(catalog?.facets.categories.map((item) => [item.value, item.count]));
  return (
    <section className="question-topic-section" aria-labelledby="question-topic-heading">
      <div className="question-section-heading">
        <div>
          <span>按方向进入</span>
          <h2 id="question-topic-heading">题库专题</h2>
        </div>
        <Link href="/questions">
          查看全部题目 <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="question-topic-grid">
        {TOPICS.map((topic) => {
          const count = counts.get(topic.category) ?? 0;
          return (
            <Link
              key={topic.category}
              className="question-topic-card"
              data-category={topic.category}
              href={`/questions?category=${topic.category}`}
            >
              <span className="question-topic-glyph" aria-hidden="true">
                {topic.glyph}
              </span>
              <span className="question-topic-copy">
                <strong>{topic.title}</strong>
                <small>{topic.description}</small>
              </span>
              <span className="question-topic-count">
                {catalog ? (count ? `${count} 道题` : '持续更新') : '加载中'}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
