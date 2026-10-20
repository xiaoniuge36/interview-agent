import {
  buildAgentOpenQuestion,
  type AgentOpenQuestionInput,
} from './public-agent-question-builders';

const LANGSMITH_EVAL = 'https://docs.langchain.com/langsmith/evaluation';
const LANGSMITH_OBSERVABILITY = 'https://docs.langchain.com/langsmith/observability';
const RAGAS_METRICS = 'https://docs.ragas.io/en/stable/concepts/metrics/';
const RRF_PAPER = 'https://dl.acm.org/doi/10.1145/1571941.1572114';
const ELASTIC_RRF =
  'https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion';
const COHERE_RERANK = 'https://docs.cohere.com/docs/rerank-overview';
const PGVECTOR = 'https://github.com/pgvector/pgvector';
const ANTHROPIC_CONTEXTUAL = 'https://www.anthropic.com/news/contextual-retrieval';
const LLAMAINDEX = 'https://docs.llamaindex.ai/en/stable/optimizing/production_rag/';
const OPENAI_EMBEDDINGS = 'https://platform.openai.com/docs/guides/embeddings';
const GRAPHRAG = 'https://arxiv.org/abs/2404.16130';
const NEO4J_GRAPHRAG = 'https://neo4j.com/blog/genai/what-is-graphrag/';
const LANGCHAIN_MULTI_QUERY = 'https://python.langchain.com/docs/how_to/MultiQueryRetriever/';

const QUESTIONS: AgentOpenQuestionInput[] = [
  {
    suffix: 'retrieval-issues-found',
    title: '知识库上线后，你发现过哪些检索效果问题？如何定位？',
    stem:
      '请结合真实项目举 2–3 类问题（召不回、排不准、切片断裂、数据或权限错配等），' +
      '说明发现渠道、判断证据、影响范围，以及最终采用的修复动作。',
    type: 'project_deep_dive',
    difficulty: 'hard',
    answer:
      '我先按“数据—切片—召回—排序—生成”分层归因。常见问题有四类：' +
      '一是专有名词、型号、缩写召不回，黄金证据在 top20 之外；' +
      '二是长文档的泛化段落挤掉精确证据，Recall 尚可但 MRR/nDCG 低；' +
      '三是表格、条款、步骤被按字数切断，片段缺主语或限定条件，答案错但引用看似相关；' +
      '四是旧版本、重复文档、权限或时效过滤导致污染和漏召。' +
      '定位靠三件证据：检索日志里的 query、hit id、score 与来源；黄金集逐条 diff 看证据是否进入候选；' +
      '线上点踩率、无答案率和引用命中率。量化失败 query 占比与答案错误归因后，' +
      '再分别修解析切片、元数据过滤、混合召回或重排，并把失败样本回灌成回归集。',
    tags: ['RAG', '检索诊断', '项目复盘', '评测'],
    points: ['问题分类与判断证据', '分层定位链路', '修复与回归闭环'],
    sourceRefs: [LANGSMITH_EVAL, ANTHROPIC_CONTEXTUAL],
  },
  {
    suffix: 'retrieval-optimization-order',
    title: '评测发现检索效果不好时，你的优化顺序是什么？',
    stem:
      '如果同时看到 Recall@5 低、MRR 低、答案忠实度差，说明先改哪一段、每次只动什么变量，' +
      '以及如何证明没有引入回归。',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      '先分层定位再动手：看黄金证据是否入库、能否被切出来（索引层）；看 Recall@K 判断召回；' +
      '看 MRR/nDCG 判断排序；看引用支持率判断生成忠实度。' +
      '优化顺序按成本从低到高：先修解析与数据（表格、页眉页脚、重复、版本），再调切片和元数据，' +
      '再补 query 改写、同义词和关键词字段，再做混合召回，最后才加 rerank 或换 embedding 模型。' +
      '每次只改一个变量，固定评测集、K 值和权限范围，同时报告 Recall@5/10、MRR@10、nDCG@10、' +
      'p95 延迟与成本，并用同一批失败样本验证。经验上先把 Recall@20 做到可用，再用 rerank 提 top5 精度，' +
      '避免一上来换模型掩盖数据问题。',
    tags: ['RAG', '检索优化', '评测驱动', '实验设计'],
    points: ['分层归因', '优化顺序与单变量原则', '指标与回归验证'],
    sourceRefs: [LANGSMITH_EVAL, RAGAS_METRICS],
  },
  {
    suffix: 'retrieval-quality-judgment-langsmith',
    title: '怎样判断检索效果好不好？LangSmith 能解决什么问题？',
    stem:
      '分别说明离线指标、在线指标和人工评估各自回答什么问题；LangSmith 在数据集、trace、' +
      '实验对比和回归中承担什么角色，又不能替代什么。',
    type: 'short_answer',
    difficulty: 'medium',
    answer:
      '离线用带黄金证据的评测集算 Recall@K、Precision@K、MRR、nDCG@K 和 Hit Rate，' +
      '并按单跳、多跳、数值、术语等 query 类型分层看；在线看点击或采纳率、引用命中率、无答案率、' +
      '点踩率和答案抽检正确率，以及 p95 延迟；人工做相关性分级和忠实度复核。' +
      'LangSmith 提供数据集管理、逐条 trace（召回 chunk、分数、prompt、模型输出）、实验对比、' +
      '回归测试和标注队列，能把“答案错”拆到检索或生成的具体 span。' +
      '它不能替代业务黄金标注、指标定义和线上因果判断；工具只会放大你定义的评测质量，' +
      '指标本身错了，平台也救不了。',
    tags: ['RAG', '检索评估', 'LangSmith', '可观测性'],
    points: ['离线、在线与人工三层评估', 'LangSmith 的能力与边界', '指标定义与归因'],
    sourceRefs: [LANGSMITH_EVAL, LANGSMITH_OBSERVABILITY, RAGAS_METRICS],
  },
  {
    suffix: 'retrieval-hardest-problem',
    title: '你认为检索最大的难点是什么？为什么？',
    stem: '给出你自己的排序和理由，并说明这个难点为什么不能只靠“换更强的 embedding 模型”解决。',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      '我认为最大难点是“用户意图与知识组织方式不对齐”：query 短、口语、带上下文和隐含指代，' +
      '而知识按文档结构组织，导致词不匹配、多跳断裂、时效和权限约束被忽略。' +
      '第二是评测与标注成本，没有稳定黄金集就无法判断改动是否真的有效。' +
      '第三是长尾数据质量，表格、扫描件、版本冲突和 OCR 错误会同时伤害关键词与向量召回。' +
      '换更强 embedding 只能改善语义匹配，解决不了切片边界、权限过滤、时效、多跳推理和评测缺失；' +
      '所以真实工程里应先建评测和数据治理，再谈召回与重排策略。',
    tags: ['RAG', '检索难点', '工程判断'],
    points: ['难点排序与理由', '为什么不是单纯的模型问题', '对应的工程动作'],
    sourceRefs: [ANTHROPIC_CONTEXTUAL, LANGSMITH_EVAL],
  },
  {
    suffix: 'retrieval-vector-vs-hybrid',
    title: '你会选纯向量检索还是混合检索？依据是什么？',
    stem: '从查询类型、语料特征、延迟成本和运维复杂度说明决策；并举一个混合检索反而更差的场景。',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      '默认选混合，但不盲目。向量擅长语义改写、同义表达、跨语言和口语 query；' +
      'BM25 或关键词擅长专有名词、型号、代码、ID、数字和精确短语。' +
      '语料里术语、编号、表格多，或用户经常搜精确词，就必须有关键词路；纯自然语言 FAQ 且语料干净时，' +
      '向量可能已经够用。决策看四点：查询分布里精确词占比、语料结构与 OCR 质量、' +
      '延迟预算（并行召回加融合通常多 10–30ms）、以及两套索引和权重调参的运维成本。' +
      '混合也可能变差：OCR 错字让关键词命中噪声、权重未调导致高频词把结果抬高、' +
      '融合把不相关结果带进 top10。要用评测集调权重、k 和每文档上限，而不是默认混合一定更好。',
    tags: ['RAG', '混合检索', '向量检索', 'BM25'],
    points: ['能力互补与适用查询', '决策依据', '反例与调参'],
    sourceRefs: [PGVECTOR, ELASTIC_RRF, RRF_PAPER],
  },
  {
    suffix: 'retrieval-merge-two-lists',
    title: '向量和关键词各召回 10 条，如何合并成最终 10 条？',
    stem: '说明去重、融合、截断的具体做法；当两路分数不可直接比较时，你用什么信号排序。',
    type: 'project_deep_dive',
    difficulty: 'hard',
    answer:
      '先按 chunk id 去重并保留来源标记，两路各 10 条通常只剩 12–18 条唯一结果。' +
      '不要直接比较 cosine 和 BM25 原始分：用 RRF，score 为各路 w/(k+rank) 之和，k 常取 60，' +
      '关键词和向量权重可按评测调；或者先做分数归一化再加权。' +
      '融合后取 top20–30 交给 cross-encoder rerank 精排，再截断到 10 条，同时加约束：' +
      '同一文档最多 2–3 条、过滤无权限和过期版本。排序信号以 RRF 排名为主、rerank 分数为辅；' +
      '最终用黄金集看 nDCG@10 和答案正确率，而不是看融合分数的绝对值。' +
      '若没有 rerank，就调 RRF 权重和 k，并保留一路高分结果做兜底。',
    tags: ['RAG', 'RRF', '结果融合', 'Rerank'],
    points: ['去重与不可比分数处理', 'RRF 与重排融合', '截断、多样性与权限'],
    sourceRefs: [RRF_PAPER, ELASTIC_RRF, COHERE_RERANK],
  },
  {
    suffix: 'retrieval-rrf-rerank-small-model',
    title: 'RRF、Rerank 和快速低成本决策模型有什么区别？怎么选？',
    stem: '从输入信号、计算成本、可解释性和适用阶段比较三者；给一个在线延迟预算 300ms 的链路做选型。',
    type: 'system_design',
    difficulty: 'expert',
    answer:
      'RRF 只用排名、不用原始分数，无需训练，适合融合多路召回，成本几乎可以忽略，' +
      '解决“分数不可比”和冷启动；Rerank 用 cross-encoder 或 LLM 对 query 与文档联合打分，精度最高，' +
      '但每条都要一次前向，10–50 条通常几十到几百毫秒；小模型决策或路由用分类器、小 LLM 判断 query 类型、' +
      '是否需要检索、走哪一路、要不要拒答，成本低但会引入误判和额外调用。' +
      '300ms 预算下我的组合是：小模型做路由和门控（可选，缓存结果），并行召回，RRF 融合，' +
      '若还有 100ms 余量就对 top20 做 rerank，最后截断。RRF 负责稳，rerank 负责准，小模型负责省；' +
      '三者不是替代关系，而是链路不同层。',
    tags: ['RAG', 'RRF', 'Rerank', '模型路由'],
    points: ['三者机制与成本', '延迟预算下的选型', '组合链路与降级'],
    sourceRefs: [RRF_PAPER, COHERE_RERANK, LANGSMITH_EVAL],
  },
  {
    suffix: 'retrieval-chunk-size',
    title: '最终 ChunkSize 大概定在多少？为什么不是固定值？',
    stem: '结合文档类型、embedding 模型上下文、答案粒度和召回指标说明；父子块、重叠和表格怎么处理。',
    type: 'project_deep_dive',
    difficulty: 'medium',
    answer:
      '没有万能值。中文知识库常见 300–800 字（约 200–500 token），英文 256–512 token；' +
      'FAQ、条款用 200–400 字，技术文档、论文用 500–800 字，表格按行或语义单元切，代码按函数切。' +
      '依据四点：embedding 模型的训练长度与检索粒度、答案需要的上下文（定义还是多段推理）、' +
      'Recall@K 与答案忠实度、生成上下文预算。工程上更常用父子块：父块 1000–1500 字保留章节上下文，' +
      '子块 300–500 字做检索，命中后回填父块给模型；重叠 10–15% 防止边界断裂。' +
      '最终档位用固定评测集扫 256、512、800 三档，看 Recall、nDCG 和答案正确率选，而不是拍脑袋。',
    tags: ['RAG', 'Chunking', '索引设计', '父子块'],
    points: ['区间与文档类型', '父子块与重叠', '评测驱动定档'],
    sourceRefs: [ANTHROPIC_CONTEXTUAL, LLAMAINDEX, OPENAI_EMBEDDINGS],
  },
  {
    suffix: 'retrieval-knowledge-graph-tradeoff',
    title: '为什么在 RAG 里引入知识图谱？如何判断是不是过度设计？',
    stem: '说明图谱解决哪类检索问题，给出引入门槛、可替代方案和退出条件；技术并不是越多越好。',
    type: 'system_design',
    difficulty: 'expert',
    answer:
      '图谱主要解决向量和关键词都不擅长的关系型问题：多跳（A 的供应商的母公司）、' +
      '实体聚合（某公司所有产品线）、结构化约束（时间、层级、因果）和可解释路径。' +
      '如果失败样本里 80% 是单跳事实或文档片段，图谱收益有限。' +
      '引入门槛：多跳或关系型失败占比可量化、实体 schema 稳定、抽取质量达标、' +
      '有图查询与融合链路及评测、能承担实体消歧和持续更新的成本。' +
      '替代方案先试 metadata 过滤、父子块、query 分解和多轮检索，很多问题到这里就解决了。' +
      '退出条件也要提前定：图谱增益覆盖不了维护成本、抽取准确率不达标、延迟或成本超预算，' +
      '就回退到纯混合。技术选型看边际收益，不看先进程度。',
    tags: ['RAG', '知识图谱', 'GraphRAG', '技术选型'],
    points: ['图谱适用问题', '引入门槛与替代方案', '成本收益与退出条件'],
    sourceRefs: [GRAPHRAG, NEO4J_GRAPHRAG],
  },
  {
    suffix: 'retrieval-graph-hybrid-failure',
    title: '图谱检索和混合检索结合后召回仍不好，怎么继续优化？',
    stem: '按“数据—query—召回—融合—评测”给出排查顺序，并说明多跳 query 的改写与回退策略。',
    type: 'system_design',
    difficulty: 'expert',
    answer:
      '先确认失败类型：知识缺失、实体链接错、query 分解错，还是融合排序把正确结果挤掉。' +
      '顺序是：一查数据覆盖和抽取质量，实体漏抽、别名未归一、关系方向错都会让图查询空转；' +
      '二查实体链接，补同义词和消歧规则；三做 query 改写与分解，把多跳拆成子问题逐跳检索，' +
      '必要时做多 query 扩展；四扩召回量，每路取 top50，图路径限定 1–2 跳并做邻居扩展；' +
      '五调融合，按 query 类型路由并给图结果单独权重，用 RRF 统一排名；六加 rerank 和每文档上限；' +
      '七设兜底，证据不足时拒答、澄清或回退纯混合。' +
      '评测按单跳、多跳、聚合分层看 Recall、路径命中率和证据覆盖率；若图谱长期无增益就砍掉，' +
      '保留混合加 query 分解。',
    tags: ['RAG', '知识图谱', '混合检索', '多跳问答'],
    points: ['失败分层', '多跳改写与召回扩量', '融合与兜底'],
    sourceRefs: [GRAPHRAG, LANGCHAIN_MULTI_QUERY, NEO4J_GRAPHRAG],
  },
  {
    suffix: 'retrieval-graph-accuracy-value',
    title: '知识图谱对回答准确性真的有帮助吗？什么情况下反而有害？',
    stem: '用可验证的方式说明增益来源与风险（错误实体、过期关系、路径噪声），并设计一个消融实验。',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      '有条件的帮助：多跳、关系、聚合类问题能提供结构化证据和可解释路径，' +
      '降低“看似相关但答非所问”，也方便引用和审计；单跳事实题帮助有限。' +
      '风险同样明确：抽取错误和实体消歧错误会带来“高置信度的错误”，过期关系会答错，' +
      '路径噪声会让上下文变长并稀释关键证据，图查询还增加延迟和成本。' +
      '验证要做消融：固定同一评测集和生成模型，对比纯混合与“混合加图谱”，' +
      '分层看答案正确率、证据覆盖率、忠实度和 p95 延迟；人工抽检错误样本，' +
      '区分“图谱没给到”和“图谱给了错证据”。只有增益稳定大于成本才保留，' +
      '不能因为架构看起来更高级就默认更好。',
    tags: ['RAG', '知识图谱', '准确性', '消融实验'],
    points: ['增益场景', '风险与误导', '消融验证'],
    sourceRefs: [GRAPHRAG, RAGAS_METRICS],
  },
];

export const PUBLIC_RAG_RETRIEVAL_QUESTIONS = QUESTIONS.map(buildAgentOpenQuestion);
